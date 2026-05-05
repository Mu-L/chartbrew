const db = require("../../../../models/models");
const {
  getSupportedConnectionTypes,
  getSupportedSourceForConnection,
} = require("../sourceSupport");
const { normalizeTeamId, requireProjectForTeam } = require("./teamScope");

async function listConnections(payload) {
  const { project_id, team_id } = payload; // scope could be used for filtering in the future
  const normalizedTeamId = normalizeTeamId(team_id);
  const whereClause = {
    team_id: normalizedTeamId,
  };

  // If project_id is provided, filter by connections used in that project
  if (project_id) {
    await requireProjectForTeam(project_id, normalizedTeamId);

    const datasets = await db.Dataset.findAll({
      where: {
        team_id: normalizedTeamId,
      },
      attributes: ["connection_id", "project_ids"],
      include: [{
        model: db.DataRequest,
        attributes: ["connection_id"],
      }],
    });

    const connectionIds = new Set();
    datasets.forEach((ds) => {
      const datasetProjectIds = Array.isArray(ds.project_ids) ? ds.project_ids : [];
      const isProjectDataset = datasetProjectIds.some((id) => String(id) === String(project_id));

      if (!isProjectDataset) {
        return;
      }

      if (ds.connection_id) connectionIds.add(ds.connection_id);
      if (ds.DataRequests) {
        ds.DataRequests.forEach((dr) => {
          if (dr.connection_id) connectionIds.add(dr.connection_id);
        });
      }
    });

    if (connectionIds.size > 0) {
      whereClause.id = Array.from(connectionIds);
    } else {
      return { connections: [] };
    }
  }

  const connections = await db.Connection.findAll({
    where: {
      ...whereClause,
      type: getSupportedConnectionTypes()
    },
    attributes: ["id", "type", "subType", "name"],
    order: [["createdAt", "DESC"]],
  });

  const filteredConnections = connections
    .map((conn) => ({
      connection: conn,
      source: getSupportedSourceForConnection(conn),
    }))
    .filter(({ source }) => source);

  return {
    connections: filteredConnections.map(({ connection, source }) => ({
      id: connection.id,
      type: connection.type,
      subType: connection.subType,
      source_id: source.id,
      source_name: source.name,
      name: connection.name,
    })),
  };
}

module.exports = listConnections;
