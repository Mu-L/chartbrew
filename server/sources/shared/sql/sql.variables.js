const {
  getVariableBinding,
  hasProvidedValue,
} = require("../variables/stringVariables");

function escapeSqlString(value, isAlreadyQuoted) {
  const stringValue = String(value);
  return isAlreadyQuoted
    ? stringValue.replace(/'/g, "''").replace(/"/g, "\"\"")
    : `'${stringValue.replace(/'/g, "''")}'`;
}

function formatSqlVariableValue(value, binding, isAlreadyQuoted) {
  switch (binding?.type) {
    case "number":
      return Number.isNaN(Number(value)) ? "0" : String(value);
    case "boolean":
      return (value === "true" || value === true) ? "TRUE" : "FALSE";
    case "date":
    case "string":
    default:
      return escapeSqlString(value, isAlreadyQuoted);
  }
}

function applySqlVariables(dataRequest, variables = {}) {
  const originalDataRequest = dataRequest;

  if (!originalDataRequest.query
    || !originalDataRequest.VariableBindings
    || originalDataRequest.VariableBindings.length === 0
  ) {
    return {
      dataRequest: originalDataRequest,
      processedQuery: originalDataRequest.query,
    };
  }

  let processedQuery = originalDataRequest.query;
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;
  const foundVariables = [];

  // oxlint-disable-next-line no-cond-assign
  while ((match = variableRegex.exec(processedQuery)) !== null) {
    const variableName = match[1].trim();
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    const beforeChar = startIndex > 0 ? processedQuery[startIndex - 1] : "";
    const afterChar = endIndex < processedQuery.length ? processedQuery[endIndex] : "";
    const isAlreadyQuoted = (beforeChar === "'" && afterChar === "'")
      || (beforeChar === "\"" && afterChar === "\"");

    foundVariables.push({
      placeholder: match[0],
      name: variableName,
      isAlreadyQuoted,
    });
  }

  foundVariables.forEach((variable) => {
    const binding = getVariableBinding(originalDataRequest, variable.name);
    const runtimeValue = variables[variable.name];
    const hasRuntimeValue = hasProvidedValue(runtimeValue);
    const hasDefaultValue = hasProvidedValue(binding?.default_value);

    if (hasRuntimeValue) {
      processedQuery = processedQuery.replace(
        variable.placeholder,
        formatSqlVariableValue(runtimeValue, binding, variable.isAlreadyQuoted)
      );
    } else if (hasDefaultValue && binding) {
      processedQuery = processedQuery.replace(
        variable.placeholder,
        formatSqlVariableValue(binding.default_value, binding, variable.isAlreadyQuoted)
      );
    } else {
      if (binding?.required) {
        throw new Error(`Required variable '${variable.name}' has no value provided and no default value`);
      }

      processedQuery = processedQuery.replace(variable.placeholder, "");
    }
  });

  return {
    dataRequest: originalDataRequest,
    processedQuery,
  };
}

module.exports = {
  applyMysqlOrPostgresVariables: applySqlVariables,
  applySqlVariables,
};
