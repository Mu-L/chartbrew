const {
  cloneDataRequestForVariables,
  processVariablesInString,
} = require("../../shared/variables/stringVariables");

function convertRealtimeDbVariableValue(value, binding) {
  switch (binding?.type) {
    case "number":
      return Number.isNaN(Number(value)) ? 0 : Number(value);
    case "boolean":
      return value === "true" || value === true;
    case "date":
    default:
      return String(value);
  }
}

function applyRealtimeDbVariables(dataRequest, variables = {}) {
  const originalDataRequest = dataRequest;

  if (!originalDataRequest.VariableBindings
    || originalDataRequest.VariableBindings.length === 0
  ) {
    return {
      dataRequest: originalDataRequest,
      processedDataRequest: originalDataRequest,
    };
  }

  const plainDataRequest = cloneDataRequestForVariables(originalDataRequest);
  const processedDataRequest = { ...plainDataRequest };

  processedDataRequest.route = processVariablesInString({
    value: plainDataRequest.route,
    dataRequest: originalDataRequest,
    variables,
    convertValue: convertRealtimeDbVariableValue,
  });

  return {
    dataRequest: originalDataRequest,
    processedDataRequest,
  };
}

module.exports = {
  applyRealtimeDbVariables,
  convertRealtimeDbVariableValue,
};
