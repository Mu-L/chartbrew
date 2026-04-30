const rdspostgresProtocol = require("./rdspostgres.protocol");

module.exports = {
  id: "rdsPostgres",
  dependsOn: ["postgres"],
  type: "postgres",
  subType: "rdsPostgres",
  name: "RDS Postgres",
  category: "database",
  description: "Connect to Amazon RDS Postgres databases and run SQL queries.",

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
    ...rdspostgresProtocol,
    ai: {
      getSchema: rdspostgresProtocol.getSchema,
      generateQuery: rdspostgresProtocol.generateQuery,
    },
  },
};
