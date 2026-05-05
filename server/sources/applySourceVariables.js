const { findSourceForConnection } = require("./index");

function applySourceVariables(dataRequest, variables = {}) {
  const connection = dataRequest?.Connection;
  const source = findSourceForConnection(connection);

  if (source?.backend?.applyVariables) {
    return source.backend.applyVariables({
      dataRequest,
      variables,
      connection,
      source,
    });
  }

  return {
    dataRequest,
    processedQuery: dataRequest?.query,
  };
}

module.exports = {
  applySourceVariables,
};
