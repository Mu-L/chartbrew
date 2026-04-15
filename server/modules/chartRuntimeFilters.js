const momentObj = require("moment-timezone");

function createMoment(timezone = "") {
  if (timezone) {
    return (...args) => {
      if (args.length === 1 && typeof args[0] === "string") {
        return momentObj.tz(args[0], timezone);
      }

      return momentObj(...args).tz(timezone);
    };
  }

  return (...args) => momentObj.utc(...args);
}

function normalizeVariables(variables = {}) {
  return Object.entries(variables || {}).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") return acc;
    acc[key] = value;
    return acc;
  }, {});
}

function normalizeFilter(filter = {}) {
  if (!filter) return null;

  if (filter.type === "date" && filter.startDate && filter.endDate) {
    return {
      type: "date",
      startDate: filter.startDate,
      endDate: filter.endDate,
      origin: filter.origin || "dashboard",
      scope: filter.scope || "chart",
      cdcId: filter.cdcId ?? null,
    };
  }

  if (!filter.field) return null;

  return {
    type: filter.type || "field",
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
    exposed: Boolean(filter.exposed),
    origin: filter.origin || (filter.cdcId ? "chart" : "dashboard"),
    scope: filter.scope || (filter.cdcId ? "cdc" : "chart"),
    cdcId: filter.cdcId ?? null,
  };
}

function getFilterKey(filter = {}) {
  return JSON.stringify({
    type: filter.type || null,
    field: filter.field || null,
    operator: filter.operator || null,
    value: filter.value ?? null,
    startDate: filter.startDate || null,
    endDate: filter.endDate || null,
    exposed: Boolean(filter.exposed),
    origin: filter.origin || "dashboard",
    scope: filter.scope || "chart",
    cdcId: filter.cdcId ?? null,
  });
}

function dedupeFilters(filters = []) {
  const seen = new Set();
  const normalizedFilters = [];

  filters.forEach((filter) => {
    const normalizedFilter = normalizeFilter(filter);
    if (!normalizedFilter) return;

    const key = getFilterKey(normalizedFilter);
    if (seen.has(key)) return;
    seen.add(key);
    normalizedFilters.push(normalizedFilter);
  });

  return normalizedFilters.sort((left, right) => getFilterKey(left).localeCompare(getFilterKey(right)));
}

function resolveChartConfiguredDateRange(chart, timezone = "") {
  if (!chart?.startDate || !chart?.endDate) return null;

  const moment = createMoment(timezone);
  let startDate = moment(chart.startDate);
  let endDate = moment(chart.endDate);

  if (chart.timeInterval === "month" && chart.currentEndDate && !chart.fixedStartDate) {
    startDate = startDate.startOf("month").startOf("day");
  } else if (chart.timeInterval === "year" && chart.currentEndDate && !chart.fixedStartDate) {
    startDate = startDate.startOf("year").startOf("day");
  } else if (!chart.fixedStartDate) {
    startDate = startDate.startOf("day");
  }

  endDate = endDate.endOf("day");

  if (chart.currentEndDate) {
    const timeDiff = endDate.diff(startDate, chart.timeInterval);
    endDate = moment().endOf(chart.timeInterval);

    if (!chart.fixedStartDate) {
      startDate = endDate.clone()
        .subtract(timeDiff, chart.timeInterval)
        .startOf(chart.timeInterval);
    }
  }

  return { startDate, endDate };
}

function resolveDashboardDateRange(filters = [], timezone = "") {
  const dateFilter = filters.find((filter) => filter.type === "date" && filter.startDate && filter.endDate);
  if (!dateFilter) return null;

  const moment = createMoment(timezone);
  return {
    startDate: moment(dateFilter.startDate).startOf("day"),
    endDate: moment(dateFilter.endDate).endOf("day"),
  };
}

function intersectDateRanges(baseRange, overrideRange) {
  if (!baseRange && !overrideRange) return null;
  if (!baseRange) return overrideRange;
  if (!overrideRange) return baseRange;

   const baseStart = momentObj(baseRange.startDate);
   const baseEnd = momentObj(baseRange.endDate);
   const overrideStart = momentObj(overrideRange.startDate);
   const overrideEnd = momentObj(overrideRange.endDate);

  return {
    startDate: momentObj.max(baseStart, overrideStart),
    endDate: momentObj.min(baseEnd, overrideEnd),
  };
}

function buildChartRuntimeContext(chart, filters = [], variables = {}, timezone = "") {
  const normalizedFilters = dedupeFilters(filters);
  const normalizedVariables = normalizeVariables(variables);
  const configuredDateRange = resolveChartConfiguredDateRange(chart, timezone);
  const dashboardDateRange = resolveDashboardDateRange(normalizedFilters, timezone);
  const effectiveDateRange = intersectDateRanges(configuredDateRange, dashboardDateRange);

  return {
    filters: normalizedFilters,
    variables: normalizedVariables,
    configuredDateRange,
    dashboardDateRange,
    effectiveDateRange,
    hasRuntimeFilters: normalizedFilters.length > 0 || Object.keys(normalizedVariables).length > 0,
    needsSourceRefresh: Boolean(dashboardDateRange) || Object.keys(normalizedVariables).length > 0,
  };
}

function getDatasetRuntimeFilters(runtimeContext, datasetOptions = {}) {
  const datasetId = `${datasetOptions.cdc_id || datasetOptions.id || ""}`;

  return runtimeContext.filters.filter((filter) => {
    if (filter.type === "date" && filter.startDate && filter.endDate) {
      return false;
    }

    if (filter.scope === "cdc" && `${filter.cdcId || ""}` !== datasetId) {
      return false;
    }

    return true;
  });
}

function getDatasetDateConditions(runtimeContext, datasetOptions = {}) {
  const dateConditions = [];

  if (runtimeContext.effectiveDateRange && datasetOptions.dateField) {
    dateConditions.push({
      field: datasetOptions.dateField,
      value: runtimeContext.effectiveDateRange.startDate,
      operator: "greaterOrEqual",
    }, {
      field: datasetOptions.dateField,
      value: runtimeContext.effectiveDateRange.endDate,
      operator: "lessOrEqual",
    });
  }

  getDatasetRuntimeFilters(runtimeContext, datasetOptions)
    .filter((filter) => filter.field === datasetOptions.dateField)
    .forEach((filter) => {
      dateConditions.push(filter);
    });

  return dateConditions;
}

module.exports = {
  buildChartRuntimeContext,
  createMoment,
  getDatasetDateConditions,
  getDatasetRuntimeFilters,
  intersectDateRanges,
  normalizeVariables,
  resolveChartConfiguredDateRange,
};
