const { findSourceForConnection } = require("./index");
const { assertSourceServerEnabled } = require("./sourceAvailability");

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

  assertSourceServerEnabled(runner.source);

  return runner.runDataRequest({
    ...options,
    source: runner.source,
  });
}

module.exports = {
  getSourceDataRequestRunner,
  runSourceDataRequest,
};
