function hasProvidedValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function getVariableBinding(dataRequest, variableName) {
  return dataRequest.VariableBindings.find((vb) => vb.name === variableName);
}

function getReplacementValue({
  binding,
  variableName,
  variables,
  convertValue,
}) {
  const runtimeValue = variables[variableName];
  const hasRuntimeValue = hasProvidedValue(runtimeValue);
  const hasDefaultValue = hasProvidedValue(binding?.default_value);

  if (hasRuntimeValue) {
    return convertValue(runtimeValue, binding, "runtime");
  }

  if (hasDefaultValue && binding) {
    return convertValue(binding.default_value, binding, "default");
  }

  if (binding?.required) {
    throw new Error(`Required variable '${variableName}' has no value provided and no default value`);
  }

  return "";
}

function processVariablesInString({
  value,
  dataRequest,
  variables = {},
  convertValue,
  skipVariables = [],
}) {
  if (!value || typeof value !== "string") return value;

  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;
  let processedValue = value;

  // oxlint-disable-next-line no-cond-assign
  while ((match = variableRegex.exec(value)) !== null) {
    const variableName = match[1].trim();

    if (skipVariables.includes(variableName)) {
      // oxlint-disable-next-line no-continue
      continue;
    }

    const binding = getVariableBinding(dataRequest, variableName);
    const replacementValue = getReplacementValue({
      binding,
      variableName,
      variables,
      convertValue,
    });

    processedValue = processedValue.replace(match[0], replacementValue);
  }

  return processedValue;
}

function cloneDataRequestForVariables(originalDataRequest) {
  if (!originalDataRequest.dataValues) {
    return originalDataRequest;
  }

  const plainDataRequest = originalDataRequest.toJSON
    ? originalDataRequest.toJSON()
    : originalDataRequest.dataValues;

  plainDataRequest.VariableBindings = originalDataRequest.VariableBindings;
  plainDataRequest.Connection = originalDataRequest.Connection;

  return plainDataRequest;
}

module.exports = {
  cloneDataRequestForVariables,
  getVariableBinding,
  hasProvidedValue,
  processVariablesInString,
};
