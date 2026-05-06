const mysqlProtocol = require("./mysql.protocol");

module.exports = {
  id: "mysql",
  type: "mysql",
  subType: "mysql",
  name: "MySQL",
  category: "database",
  description: "Connect to MySQL databases and run SQL queries.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: true,
      authModes: ["connection_string", "credentials"],
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
    ...mysqlProtocol,
    ai: {
      getSchema: mysqlProtocol.getSchema,
      generateQuery: mysqlProtocol.generateQuery,
    },
  },
};
