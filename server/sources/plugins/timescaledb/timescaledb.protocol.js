const { generateSqlQuery } = require("../../../modules/ai/generateSqlQuery");
const sqlProtocol = require("../../shared/sql/sql.protocol");

function testTimescaledb(connection) {
  return sqlProtocol.testConnection({ connection });
}

function testConnection({ connection }) {
  return testTimescaledb(connection);
}

function testUnsavedConnection({ connection, extras }) {
  return sqlProtocol.testUnsavedConnection({ connection, extras });
}

function prepareConnectionData({ connection }) {
  return sqlProtocol.prepareConnectionData({ connection });
}

function getSchema({ connection }) {
  return sqlProtocol.getSchema({ connection });
}

function runDataRequest(options) {
  return sqlProtocol.runDataRequest({
    ...options,
    connectionType: "timescaledb",
  });
}

function runChartQuery(options) {
  return sqlProtocol.runChartQuery(options);
}

function generateQuery({
  schema,
  question,
  conversationHistory,
  currentQuery,
}) {
  return generateSqlQuery(schema, question, conversationHistory, currentQuery);
}

module.exports = {
  closeSqlConnection: sqlProtocol.closeSqlConnection,
  generateQuery,
  getSchema,
  getSchemaFromDbConnection: sqlProtocol.getSchemaFromDbConnection,
  prepareConnectionData,
  runChartQuery,
  runDataRequest,
  testConnection,
  testTimescaledb,
  testUnsavedConnection,
};
