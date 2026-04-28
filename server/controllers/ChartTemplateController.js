const db = require("../models/models");
const ChartController = require("./ChartController");
const DatasetController = require("./DatasetController");
const { listTemplates, loadTemplate } = require("../chartTemplates/loader");
const { getSourceById } = require("../sources");

function toInt(value) {
  return parseInt(value, 10);
}

function getSelectedIds(requestedIds, availableItems) {
  if (requestedIds === undefined || requestedIds === null) {
    return availableItems.map((item) => item.id);
  }

  return requestedIds;
}

function isProjectAccessible(teamRole, projectId) {
  if (["teamOwner", "teamAdmin"].includes(teamRole.role)) {
    return true;
  }

  return (teamRole.projects || []).some((id) => `${id}` === `${projectId}`);
}

function addProjectToList(projectIds, projectId) {
  const currentIds = Array.isArray(projectIds) ? projectIds : [];
  const normalizedProjectId = toInt(projectId);
  if (currentIds.some((id) => `${id}` === `${normalizedProjectId}`)) {
    return currentIds;
  }

  return [...currentIds, normalizedProjectId];
}

class ChartTemplateController {
  constructor() {
    this.chartController = new ChartController();
    this.datasetController = new DatasetController();
  }

  triggerChartUpdates(charts, user) {
    if (process.env.NODE_ENV === "test" || !Array.isArray(charts) || charts.length === 0) {
      return;
    }

    charts.forEach((chart) => {
      setImmediate(() => {
        this.chartController.updateChartData(chart.id, user, {}).catch(() => null);
      });
    });
  }

  list(source) {
    return listTemplates(source);
  }

  get(source, slug) {
    return loadTemplate(source, slug);
  }

  async createFromTemplate(teamId, source, slug, data, user) {
    const template = loadTemplate(source, slug);
    const sourcePlugin = getSourceById(source);
    const normalizedTeamId = toInt(teamId);
    const connectionId = toInt(data.connection_id);

    if (!connectionId) {
      throw new Error("connection_id is required");
    }

    const teamRole = await db.TeamRole.findOne({
      where: { team_id: normalizedTeamId, user_id: user.id },
    });
    if (!teamRole) {
      throw new Error("403");
    }

    const connection = await db.Connection.findOne({
      where: { id: connectionId, team_id: normalizedTeamId },
    });
    if (!connection) {
      throw new Error("404");
    }
    if (
      connection.type !== template.requiredConnection.type
      || connection.subType !== template.requiredConnection.subType
    ) {
      throw new Error("Connection does not match this template source");
    }

    const datasetTemplateIds = getSelectedIds(data.dataset_template_ids, template.datasets);
    const chartTemplateIds = getSelectedIds(data.chart_template_ids, template.charts);
    const availableDatasetIds = template.datasets.map((dataset) => dataset.id);
    const availableChartIds = template.charts.map((chart) => chart.id);

    if (datasetTemplateIds.length === 0) {
      throw new Error("Select at least one dataset template");
    }
    datasetTemplateIds.forEach((datasetId) => {
      if (!availableDatasetIds.includes(datasetId)) {
        throw new Error(`Unknown dataset template ${datasetId}`);
      }
    });
    chartTemplateIds.forEach((chartId) => {
      if (!availableChartIds.includes(chartId)) {
        throw new Error(`Unknown chart template ${chartId}`);
      }
    });

    template.charts
      .filter((chart) => chartTemplateIds.includes(chart.id))
      .forEach((chart) => {
        chart.requiredDatasetIds.forEach((datasetId) => {
          if (!datasetTemplateIds.includes(datasetId)) {
            throw new Error(`Chart ${chart.id} requires dataset ${datasetId}`);
          }
        });
      });

    const transaction = await db.sequelize.transaction();
    try {
      const project = await this.resolveProject({
        teamId: normalizedTeamId,
        dashboard: data.dashboard,
        teamRole,
        user,
        transaction,
      });

      await connection.update({
        project_ids: addProjectToList(connection.project_ids, project.id),
      }, { transaction });

      const datasetMapping = {};
      const selectedDatasets = template.datasets.filter((dataset) => datasetTemplateIds.includes(dataset.id));

      const createdDatasets = await Promise.all(selectedDatasets.map(async (datasetTemplate) => {
        const dataset = await this.datasetController.createWithDataRequests({
          team_id: normalizedTeamId,
          project_ids: [project.id],
          draft: false,
          name: datasetTemplate.name,
          legend: datasetTemplate.name,
          fieldsSchema: datasetTemplate.fieldsSchema || {},
          dataRequests: [{
            ...sourcePlugin.backend.getDefaultDataRequest(),
            ...datasetTemplate.dataRequest,
            connection_id: connection.id,
          }],
          main_dr_index: 0,
        }, { transaction });

        datasetMapping[datasetTemplate.id] = dataset.id;
        return {
          template_id: datasetTemplate.id,
          id: dataset.id,
          name: dataset.name,
        };
      }));

      const selectedCharts = template.charts.filter((chart) => chartTemplateIds.includes(chart.id));
      const createdCharts = [];
      await selectedCharts.reduce((promise, chartTemplate) => {
        return promise.then(async () => {
          const datasetId = datasetMapping[chartTemplate.cdc.datasetTemplateId];
          if (!datasetId) {
            throw new Error(`Chart ${chartTemplate.id} requires dataset ${chartTemplate.cdc.datasetTemplateId}`);
          }

          const cdc = { ...chartTemplate.cdc };
          delete cdc.datasetTemplateId;
          const chart = await this.chartController.createWithChartDatasetConfigs({
            project_id: project.id,
            name: chartTemplate.name,
            type: chartTemplate.type,
            subType: chartTemplate.subType || null,
            draft: false,
            public: false,
            shareable: false,
            displayLegend: chartTemplate.chart?.displayLegend ?? true,
            includeZeros: chartTemplate.chart?.includeZeros ?? true,
            timeInterval: chartTemplate.chart?.timeInterval || "month",
            horizontal: chartTemplate.chart?.horizontal || false,
            defaultRowsPerPage: chartTemplate.chart?.defaultRowsPerPage,
            chartDatasetConfigs: [{
              ...cdc,
              dataset_id: datasetId,
              order: 1,
            }],
          }, user, { transaction, skipBackgroundUpdate: true });

          createdCharts.push({
            template_id: chartTemplate.id,
            id: chart.id,
            name: chart.name,
          });
        });
      }, Promise.resolve());

      await transaction.commit();
      this.triggerChartUpdates(createdCharts, user);

      return {
        project_id: project.id,
        datasets: createdDatasets,
        charts: createdCharts,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async resolveProject({
    teamId, dashboard, teamRole, user, transaction,
  }) {
    if (!dashboard || dashboard.type === "existing") {
      const projectId = dashboard?.project_id;
      if (!projectId) {
        throw new Error("dashboard.project_id is required");
      }

      const project = await db.Project.findOne({
        where: { id: projectId, team_id: teamId },
        transaction,
      });
      if (!project) {
        throw new Error("404");
      }
      if (!isProjectAccessible(teamRole, project.id)) {
        throw new Error("403");
      }

      return project;
    }

    if (dashboard.type !== "new") {
      throw new Error("Unsupported dashboard type");
    }

    const name = dashboard.name || "Stripe Revenue";
    const project = await db.Project.create({
      team_id: teamId,
      name,
      ghost: false,
    }, { transaction });

    const brewName = `${name.replace(/[\W_]+/g, "_")}_${project.id}`;
    await project.update({ brewName }, { transaction });

    await db.ProjectRole.create({
      project_id: project.id,
      user_id: user.id,
      role: "teamOwner",
    }, { transaction });

    const teamRoles = await db.TeamRole.findAll({
      where: { team_id: teamId },
      transaction,
    });

    await Promise.all(teamRoles.map((role) => {
      if (role.user_id !== user.id && role.role !== "teamOwner") {
        return Promise.resolve();
      }

      return role.update({
        projects: addProjectToList(role.projects, project.id),
      }, { transaction });
    }));

    return project;
  }
}

module.exports = ChartTemplateController;
