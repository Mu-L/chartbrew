const {
  processVariablesInString,
} = require("../variables/stringVariables");

function convertApiVariableValue(value, binding) {
  switch (binding?.type) {
    case "number":
      return Number.isNaN(Number(value)) ? "0" : String(value);
    case "boolean":
      return (value === "true" || value === true) ? "true" : "false";
    case "date":
    case "string":
    default:
      return String(value);
  }
}

function applyApiVariables(dataRequest, variables = {}) {
  const originalDataRequest = dataRequest;

  if (!originalDataRequest.VariableBindings
    || originalDataRequest.VariableBindings.length === 0
  ) {
    return {
      dataRequest: originalDataRequest,
      processedRoute: originalDataRequest.route,
      processedHeaders: originalDataRequest.headers,
      processedBody: originalDataRequest.body,
    };
  }

  const processApiString = (value) => processVariablesInString({
    value,
    dataRequest: originalDataRequest,
    variables,
    convertValue: convertApiVariableValue,
    skipVariables: ["start_date", "end_date"],
  });

  const processedRoute = processApiString(originalDataRequest.route);

  let processedHeaders = originalDataRequest.headers;
  if (processedHeaders && typeof processedHeaders === "object") {
    processedHeaders = {};
    Object.keys(originalDataRequest.headers).forEach((key) => {
      const processedKey = processApiString(key);
      const processedValue = processApiString(originalDataRequest.headers[key]);
      processedHeaders[processedKey] = processedValue;
    });
  }

  const processedBody = processApiString(originalDataRequest.body);

  return {
    dataRequest: originalDataRequest,
    processedRoute,
    processedHeaders,
    processedBody,
  };
}

module.exports = {
  applyApiVariables,
  convertApiVariableValue,
};
