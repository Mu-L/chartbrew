const { findSourceForConnection } = require("./index");

function getSourceDataRequestRunner(connection) {
  const source = findSourceForConnection(connection);
  const runDataRequest = source?.backend?.runDataRequest;

  if (!runDataRequest) {
    return null;
  }

  return {
    source,
    runDataRequest,
  };
}

function runSourceDataRequest(options) {
  const runner = getSourceDataRequestRunner(options.connection);

  if (!runner) {
    return null;
  }

  return runner.runDataRequest({
    ...options,
    source: runner.source,
  });
}

module.exports = {
  getSourceDataRequestRunner,
  runSourceDataRequest,
};
