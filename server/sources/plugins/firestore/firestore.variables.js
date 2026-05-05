const {
  cloneDataRequestForVariables,
  processVariablesInString,
} = require("../../shared/variables/stringVariables");

function convertFirestoreVariableValue(value, binding) {
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

function applyFirestoreVariables(dataRequest, variables = {}) {
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
  const processFirestoreString = (value) => processVariablesInString({
    value,
    dataRequest: originalDataRequest,
    variables,
    convertValue: convertFirestoreVariableValue,
  });

  const processedDataRequest = { ...plainDataRequest };
  processedDataRequest.query = processFirestoreString(plainDataRequest.query);

  if (processedDataRequest.conditions) {
    processedDataRequest.conditions = processedDataRequest.conditions.map((condition) => {
      if (condition.value && typeof condition.value === "string") {
        return {
          ...condition,
          value: processFirestoreString(condition.value),
        };
      }

      return condition;
    });
  }

  if (processedDataRequest.configuration) {
    processedDataRequest.configuration = { ...processedDataRequest.configuration };

    if (processedDataRequest.configuration.selectedSubCollection) {
      processedDataRequest.configuration.selectedSubCollection = processFirestoreString(
        processedDataRequest.configuration.selectedSubCollection
      );
    }

    if (processedDataRequest.configuration.orderBy) {
      processedDataRequest.configuration.orderBy = processFirestoreString(
        processedDataRequest.configuration.orderBy
      );
    }

    if (processedDataRequest.configuration.limit) {
      const processedLimit = processFirestoreString(
        String(processedDataRequest.configuration.limit)
      );
      processedDataRequest.configuration.limit = parseInt(processedLimit, 10) || 0;
    }
  }

  return {
    dataRequest: originalDataRequest,
    processedDataRequest,
  };
}

module.exports = {
  applyFirestoreVariables,
  convertFirestoreVariableValue,
};
