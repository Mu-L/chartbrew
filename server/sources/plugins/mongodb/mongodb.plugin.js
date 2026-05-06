const mongodbProtocol = require("./mongodb.protocol");

module.exports = {
  id: "mongodb",
  type: "mongodb",
  subType: "mongodb",
  name: "MongoDB",
  category: "database",
  description: "Connect to MongoDB databases and run Mongo shell queries.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: false,
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
    ...mongodbProtocol,
    ai: {
      getSchema: mongodbProtocol.getSchema,
      generateQuery: mongodbProtocol.generateQuery,
    },
  },
};
