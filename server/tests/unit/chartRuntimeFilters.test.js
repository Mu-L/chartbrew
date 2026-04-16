import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  buildChartRuntimeContext,
  classifyRuntimePayload,
  createPayloadHash,
  getDatasetDateConditions,
  getDatasetRuntimeFilters,
  intersectDateRanges,
} = require("../../modules/chartRuntimeFilters.js");

describe("chartRuntimeFilters", () => {
  it("normalizes variables and intersects dashboard date filters with the chart range", () => {
    const context = buildChartRuntimeContext({
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-01-31T00:00:00.000Z",
      timeInterval: "day",
      fixedStartDate: true,
    }, [{
      type: "date",
      startDate: "2026-01-10",
      endDate: "2026-01-20",
    }], {
      date_start: "2026-01-10",
      date_end: "2026-01-20",
      ignored: "",
    }, "UTC");

    expect(context.variables).toEqual({
      date_start: "2026-01-10",
      date_end: "2026-01-20",
    });
    expect(context.needsSourceRefresh).toBe(true);
    expect(context.effectiveDateRange.startDate.format("YYYY-MM-DD")).toBe("2026-01-10");
    expect(context.effectiveDateRange.endDate.format("YYYY-MM-DD")).toBe("2026-01-20");
  });

  it("keeps chart-scoped filters on the targeted CDC only", () => {
    const context = buildChartRuntimeContext({}, [{
      type: "field",
      field: "root[].type",
      operator: "is",
      value: "api",
      origin: "dashboard",
      scope: "chart",
    }, {
      type: "field",
      field: "root[].type",
      operator: "is",
      value: "db",
      origin: "chart",
      scope: "cdc",
      cdcId: "cdc-2",
    }], {}, "UTC");

    expect(getDatasetRuntimeFilters(context, { id: "cdc-1" })).toEqual([{
      type: "field",
      field: "root[].type",
      operator: "is",
      value: "api",
      exposed: false,
      origin: "dashboard",
      scope: "chart",
      cdcId: null,
      clientOnly: false,
      forceSourceRefresh: false,
    }]);

    expect(getDatasetRuntimeFilters(context, { id: "cdc-2" })).toEqual([{
      type: "field",
      field: "root[].type",
      operator: "is",
      value: "api",
      exposed: false,
      origin: "dashboard",
      scope: "chart",
      cdcId: null,
      clientOnly: false,
      forceSourceRefresh: false,
    }, {
      type: "field",
      field: "root[].type",
      operator: "is",
      value: "db",
      exposed: false,
      origin: "chart",
      scope: "cdc",
      cdcId: "cdc-2",
      clientOnly: false,
      forceSourceRefresh: false,
    }]);
  });

  it("combines effective date ranges with chart-local exposed date filters", () => {
    const context = buildChartRuntimeContext({
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-02-28T00:00:00.000Z",
      timeInterval: "day",
      fixedStartDate: true,
    }, [{
      type: "date",
      startDate: "2026-02-10",
      endDate: "2026-02-20",
      origin: "dashboard",
      scope: "chart",
    }, {
      type: "date",
      field: "root[].createdAt",
      operator: "greaterOrEqual",
      value: "2026-02-14",
      origin: "chart",
      scope: "cdc",
      cdcId: "cdc-1",
      exposed: true,
    }], {}, "UTC");

    expect(getDatasetDateConditions(context, {
      id: "cdc-1",
      dateField: "root[].createdAt",
    })).toEqual([
      {
        field: "root[].createdAt",
        value: expect.any(Object),
        operator: "greaterOrEqual",
      },
      {
        field: "root[].createdAt",
        value: expect.any(Object),
        operator: "lessOrEqual",
      },
      {
        type: "date",
        field: "root[].createdAt",
        operator: "greaterOrEqual",
        value: "2026-02-14",
        exposed: true,
        origin: "chart",
        scope: "cdc",
        cdcId: "cdc-1",
        clientOnly: false,
        forceSourceRefresh: false,
      },
    ]);
  });

  it("intersects two date ranges deterministically", () => {
    const range = intersectDateRanges({
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T00:00:00.000Z"),
    }, {
      startDate: new Date("2026-03-10T00:00:00.000Z"),
      endDate: new Date("2026-03-20T00:00:00.000Z"),
    });

    expect(new Date(range.startDate).toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(new Date(range.endDate).toISOString()).toBe("2026-03-20T00:00:00.000Z");
  });

  it("classifies runtime payload into source, server-parse, and client-only buckets", () => {
    const classified = classifyRuntimePayload([{
      type: "date",
      startDate: "2026-04-01",
      endDate: "2026-04-15",
    }, {
      type: "field",
      field: "root[].status",
      operator: "is",
      value: "paid",
    }, {
      type: "sort",
      field: "root[].status",
      operator: "desc",
      value: "desc",
    }], {
      date_start: "2026-04-01",
    });

    expect(classified.sourceAffecting.filters).toHaveLength(1);
    expect(classified.sourceAffecting.variables).toEqual({ date_start: "2026-04-01" });
    expect(classified.serverParseAffecting.filters).toHaveLength(1);
    expect(classified.clientOnly.filters).toHaveLength(1);
    expect(classified.cacheableChartPayload.filters).toHaveLength(2);
  });

  it("builds stable hashes for logically identical payloads", () => {
    const leftHash = createPayloadHash({
      filters: [{
        type: "field",
        field: "root[].status",
        operator: "in",
        value: ["paid", "pending"],
      }],
      variables: {
        end: "2026-04-20",
        start: "2026-04-01",
      },
    });
    const rightHash = createPayloadHash({
      filters: [{
        operator: "in",
        value: ["paid", "pending"],
        field: "root[].status",
        type: "field",
      }],
      variables: {
        start: "2026-04-01",
        end: "2026-04-20",
      },
    });

    expect(leftHash).toBe(rightHash);
  });
});
