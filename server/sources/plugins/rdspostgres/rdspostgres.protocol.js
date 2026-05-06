const { generateSqlQuery } = require("../../../modules/ai/generateSqlQuery");
const sqlProtocol = require("../../shared/sql/sql.protocol");

function testRdsPostgres(connection) {
  return sqlProtocol.testConnection({ connection });
}

function testConnection({ connection }) {
  return testRdsPostgres(connection);
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
    connectionType: "rdsPostgres",
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
  applyVariables: sqlProtocol.applyVariables,
  closeSqlConnection: sqlProtocol.closeSqlConnection,
  generateQuery,
  getSchema,
  getSchemaFromDbConnection: sqlProtocol.getSchemaFromDbConnection,
  prepareConnectionData,
  runChartQuery,
  runDataRequest,
  testConnection,
  testRdsPostgres,
  testUnsavedConnection,
};
