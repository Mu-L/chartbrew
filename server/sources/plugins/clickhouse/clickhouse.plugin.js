const clickhouseProtocol = require("./clickhouse.protocol");

module.exports = {
  id: "clickhouse",
  type: "clickhouse",
  subType: "clickhouse",
  name: "ClickHouse",
  category: "database",
  description: "Connect to ClickHouse databases and run SQL queries.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: true,
      authModes: ["credentials"],
    },
    data: {
      supportsQuery: true,
      supportsSchema: true,
      supportsResourcePicker: false,
      supportsPagination: false,
      supportsVariables: true,
      supportsJoins: true,
    },
    templates: {
      datasets: false,
      charts: false,
      dashboards: false,
    },
    ai: {
      canGenerateDatasets: true,
      canGenerateQueries: true,
      hasSourceInstructions: false,
      hasTools: false,
    },
  },

  backend: {
    ...clickhouseProtocol,
    ai: {
      getSchema: clickhouseProtocol.getSchema,
      generateQuery: clickhouseProtocol.generateQuery,
    },
  },
};
