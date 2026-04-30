const db = require("../models/models");
const { getSourceForConnection } = require("../sources");

module.exports = async ({ connection_id, query }) => {
  const connection = await db.Connection.findByPk(connection_id);
  if (!connection) {
    throw new Error(404);
  }

  const source = getSourceForConnection(connection);
  if (!source?.backend?.runChartQuery) {
    throw new Error("The connection type is not supported");
  }

  return source.backend.runChartQuery({ connection, query });
};
