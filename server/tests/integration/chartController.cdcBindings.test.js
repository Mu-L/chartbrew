import {
  beforeAll, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createRequire } from "module";

import { getModels } from "../helpers/dbHelpers.js";
import { testDbManager } from "../helpers/testDbManager.js";

const require = createRequire(import.meta.url);

describe("ChartController CDC bindings", () => {
  let models;
  let ChartController;

  beforeAll(async () => {
    if (!testDbManager.getSequelize()) {
      await testDbManager.start();
    }

    models = await getModels();
    ChartController = require("../../controllers/ChartController.js");
  });

  beforeEach(async () => {
    await models.sequelize.sync({ force: true });
  });

  it("merges CDC binding fields over legacy dataset fields and persists condition options to the CDC", async () => {
    const team = await models.Team.create({
      name: "CDC Team",
    });

    const project = await models.Project.create({
      team_id: team.id,
      name: "CDC Project",
      brewName: "cdc-project",
      ghost: false,
    });

    const chart = await models.Chart.create({
      project_id: project.id,
      name: "Revenue Chart",
      type: "bar",
      draft: false,
    });

    const dataset = await models.Dataset.create({
      team_id: team.id,
      project_ids: [project.id],
      draft: false,
      name: "Orders Dataset",
      legend: "Legacy Dataset",
      xAxis: "root[].month",
      yAxis: "root[].count",
      yAxisOperation: "none",
      conditions: [{
        field: "root[].status",
        operator: "is",
        value: "pending",
        exposed: true,
      }],
      fieldsSchema: {
        "root[].month": "string",
        "root[].count": "number",
        "root[].amount": "number",
        "root[].status": "string",
      },
    });

    const cdc = await models.ChartDatasetConfig.create({
      chart_id: chart.id,
      dataset_id: dataset.id,
      xAxis: "root[].month",
      yAxis: "root[].amount",
      yAxisOperation: "none",
      legend: "Revenue",
      conditions: [{
        field: "root[].status",
        operator: "is",
        value: "paid",
        exposed: true,
      }],
    });

    const controller = new ChartController();
    const runRequestSpy = vi.spyOn(controller.datasetController, "runRequest")
      .mockResolvedValue({
        options: dataset.toJSON(),
        data: [
          {
            month: "Jan", count: 1, amount: 100, status: "paid"
          },
          {
            month: "Feb", count: 2, amount: 200, status: "pending"
          },
        ],
      });

    const updatedChart = await controller.updateChartData(chart.id, null, {
      skipSave: true,
      getCache: true,
    });

    runRequestSpy.mockRestore();

    expect(updatedChart.chartData.data.datasets[0].data).toEqual([100]);
    expect(updatedChart.chartData.data.datasets[0].label).toBe("Revenue");

    const refreshedCdc = await models.ChartDatasetConfig.findByPk(cdc.id);
    const refreshedDataset = await models.Dataset.findByPk(dataset.id);

    expect(refreshedCdc.conditions).toEqual([{
      field: "root[].status",
      operator: "is",
      value: "paid",
      exposed: true,
      values: ["paid", "pending"],
    }]);
    expect(refreshedDataset.conditions).toEqual([{
      field: "root[].status",
      operator: "is",
      value: "pending",
      exposed: true,
    }]);
  });

  it("returns a chart-shaped payload for runtime-only filtering", async () => {
    const team = await models.Team.create({
      name: "Runtime Filter Team",
    });

    const project = await models.Project.create({
      team_id: team.id,
      name: "Runtime Filter Project",
      brewName: "runtime-filter-project",
      ghost: false,
    });

    const chart = await models.Chart.create({
      project_id: project.id,
      name: "Runtime Filter Chart",
      type: "bar",
      draft: false,
      chartDataUpdated: new Date("2020-01-01T00:00:00.000Z"),
    });

    const dataset = await models.Dataset.create({
      team_id: team.id,
      project_ids: [project.id],
      draft: false,
      name: "Runtime Dataset",
      legend: "Runtime Dataset",
      xAxis: "root[].month",
      yAxis: "root[].count",
      yAxisOperation: "none",
      conditions: [],
      fieldsSchema: {
        "root[].month": "string",
        "root[].count": "number",
        "root[].status": "string",
      },
    });

    await models.ChartDatasetConfig.create({
      chart_id: chart.id,
      dataset_id: dataset.id,
      xAxis: "root[].month",
      yAxis: "root[].count",
      yAxisOperation: "none",
      legend: "Runtime Series",
      conditions: [],
    });

    const controller = new ChartController();
    const runRequestSpy = vi.spyOn(controller.datasetController, "runRequest")
      .mockResolvedValue({
        options: dataset.toJSON(),
        data: [
          { month: "Jan", count: 1, status: "paid" },
          { month: "Feb", count: 2, status: "pending" },
        ],
      });

    const filteredChart = await controller.updateChartData(chart.id, null, {
      filters: [{
        type: "field",
        field: "root[].status",
        operator: "is",
        value: "paid",
      }],
      runtimeOnly: true,
      noSource: false,
      skipParsing: false,
      getCache: false,
    });

    runRequestSpy.mockRestore();

    expect(filteredChart).toMatchObject({
      id: chart.id,
      project_id: project.id,
    });
    expect(filteredChart.chartData.data.labels).toEqual(["Jan"]);
    expect(filteredChart.chartData.data.datasets[0].data).toEqual([1]);
    expect(new Date(filteredChart.chartDataUpdated).getTime()).toBeGreaterThan(
      new Date("2020-01-01T00:00:00.000Z").getTime()
    );
  });
});
