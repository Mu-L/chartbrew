const ConnectionController = require("../../../controllers/ConnectionController");

function getConnectionController() {
  return new ConnectionController();
}

function testConnection({ connection }) {
  return getConnectionController().testConnection(connection.id);
}

function testUnsavedConnection({ connection, extras }) {
  return getConnectionController().testRequest(connection, extras);
}

function runDataRequest({
  connection,
  dataRequest,
  chartId,
  getCache,
  filters = [],
  timezone = "",
  variables = {},
  auditContext = null,
}) {
  return getConnectionController().runApiRequest(
    connection.id,
    chartId,
    dataRequest,
    getCache,
    filters,
    timezone,
    variables,
    auditContext,
  );
}

function previewDataRequest({
  connection,
  dataRequest,
  itemsLimit,
  items,
  offset,
  pagination,
  paginationField,
}) {
  return getConnectionController().testApiRequest({
    connection_id: connection.id,
    dataRequest,
    itemsLimit,
    items,
    offset,
    pagination,
    paginationField,
  });
}

function getBuilderMetadata({ connection, options = {} }) {
  return getConnectionController().getApiBuilderMetadata(connection.id, options);
}

module.exports = {
  testConnection,
  testUnsavedConnection,
  runDataRequest,
  previewDataRequest,
  getBuilderMetadata,
};
