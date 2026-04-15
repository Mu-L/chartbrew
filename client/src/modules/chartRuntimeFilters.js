function hasConditionValue(filter = {}) {
  if (!filter) return false;

  if (filter.operator === "isNull" || filter.operator === "isNotNull") {
    return true;
  }

  return filter.value !== undefined && filter.value !== null && filter.value !== "";
}

function normalizeValue(value) {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeValue(value[key]);
      return acc;
    }, {});
  }

  return value;
}

function normalizeVariableEntries(variables = {}) {
  return Object.entries(variables)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right));
}

function buildFilterKey(filter) {
  return JSON.stringify({
    origin: filter.origin || "dashboard",
    scope: filter.scope || "chart",
    cdcId: filter.cdcId ?? null,
    type: filter.type || "field",
    field: filter.field || null,
    operator: filter.operator || null,
    value: normalizeValue(filter.value),
    startDate: filter.startDate || null,
    endDate: filter.endDate || null,
    exposed: Boolean(filter.exposed),
  });
}

function normalizeDashboardFilter(filter, chartId) {
  if (!filter) return null;

  if (filter.type === "variable") {
    return null;
  }

  if (filter.type === "date") {
    if (!filter.startDate || !filter.endDate) return null;
    if (Array.isArray(filter.charts) && filter.charts.length > 0 && !filter.charts.includes(chartId)) {
      return null;
    }

    return {
      type: "date",
      startDate: filter.startDate,
      endDate: filter.endDate,
      origin: "dashboard",
      scope: "chart",
    };
  }

  if (!hasConditionValue(filter)) return null;

  return {
    type: filter.type || "field",
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
    origin: "dashboard",
    scope: "chart",
  };
}

function normalizeChartFilter(filter, { includeId = false } = {}) {
  if (!filter || !hasConditionValue(filter)) return null;

  const normalizedFilter = {
    type: filter.type || "field",
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
    exposed: Boolean(filter.exposed),
    cdcId: filter.cdcId ?? null,
    origin: "chart",
    scope: filter.cdcId ? "cdc" : "chart",
  };

  if (includeId) {
    normalizedFilter.id = filter.id;
  }

  return normalizedFilter;
}

export function getChartRuntimeFilterState(chartFilters = {}, chartId) {
  if (!chartId) return [];
  return Array.isArray(chartFilters?.[chartId]) ? chartFilters[chartId] : [];
}

export function normalizeChartFilterCondition(condition) {
  const normalized = normalizeChartFilter(condition, { includeId: true });
  return normalized || null;
}

export function buildChartRuntimeRequest({
  chart,
  dashboardFilters = [],
  chartFilters = [],
}) {
  const chartId = chart?.id;
  const variables = dashboardFilters.reduce((acc, filter) => {
    if (filter?.type === "variable" && filter.variable && filter.value !== undefined && filter.value !== null && filter.value !== "") {
      acc[filter.variable] = filter.value;
    }
    return acc;
  }, {});

  const normalizedDashboardFilters = dashboardFilters
    .map((filter) => normalizeDashboardFilter(filter, chartId))
    .filter(Boolean);
  const normalizedChartFilters = chartFilters
    .map((filter) => normalizeChartFilter(filter))
    .filter(Boolean);

  const dedupedFilters = [];
  const seen = new Set();
  [...normalizedDashboardFilters, ...normalizedChartFilters].forEach((filter) => {
    const key = buildFilterKey(filter);
    if (seen.has(key)) return;
    seen.add(key);
    dedupedFilters.push({ ...filter, __key: key });
  });

  dedupedFilters.sort((left, right) => left.__key.localeCompare(right.__key));

  const filters = dedupedFilters.map((filter) => {
    const normalizedFilter = { ...filter };
    delete normalizedFilter.__key;
    return normalizedFilter;
  });
  const variableEntries = normalizeVariableEntries(variables);
  const normalizedVariables = variableEntries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  const needsSourceRefresh = variableEntries.length > 0
    || filters.some((filter) => filter.type === "date" && filter.startDate && filter.endDate);

  const hasRuntimeFilters = filters.length > 0 || variableEntries.length > 0;
  const filterHash = JSON.stringify({
    filters,
    variables: normalizedVariables,
  });

  return {
    filters,
    variables: normalizedVariables,
    needsSourceRefresh,
    hasRuntimeFilters,
    filterHash,
  };
}
