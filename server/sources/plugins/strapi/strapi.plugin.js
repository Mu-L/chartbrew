const apiProtocol = require("../../shared/protocols/api.protocol");

module.exports = {
  id: "strapi",
  dependsOn: ["api"],
  type: "api",
  subType: "strapi",
  name: "Strapi",
  category: "api",
  description: "Connect to Strapi content through its REST API.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: false,
      authModes: ["bearer_token", "headers"],
    },
    data: {
      supportsQuery: false,
      supportsSchema: false,
      supportsResourcePicker: false,
      supportsPagination: true,
      supportsVariables: true,
      supportsJoins: true,
    },
    templates: {
      datasets: false,
      charts: false,
      dashboards: true,
    },
    ai: {
      canGenerateDatasets: false,
      canGenerateQueries: false,
      hasSourceInstructions: false,
      hasTools: false,
    },
  },

  backend: {
    ...apiProtocol,
  },
};
