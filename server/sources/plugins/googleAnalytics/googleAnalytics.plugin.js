const protocol = require("./googleAnalytics.protocol");

module.exports = {
  id: "googleAnalytics",
  type: "googleAnalytics",
  subType: "googleAnalytics",
  name: "Google Analytics",
  category: "analytics",
  description: "Connect to Google Analytics and query GA4 reports.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: true,
      supportsFiles: false,
      authModes: ["oauth"],
    },
    data: {
      supportsQuery: true,
      supportsSchema: false,
      supportsResourcePicker: true,
      supportsPagination: false,
      supportsVariables: false,
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
    ...protocol,
  },
};
