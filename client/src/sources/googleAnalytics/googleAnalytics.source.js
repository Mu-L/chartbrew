import gAnalyticsLogo from "./assets/GoogleAnalytics.webp";
import googleanalyticsDarkLogo from "./assets/googleanalytics-dark.png";

const googleAnalyticsSource = {
  id: "googleAnalytics",
  type: "googleAnalytics",
  subType: "googleAnalytics",
  name: "Google Analytics",
  category: "analytics",
  capabilities: {
    ai: { canGenerateQueries: false },
  },
  assets: {
    lightLogo: gAnalyticsLogo,
    darkLogo: googleanalyticsDarkLogo,
  },
};

export default googleAnalyticsSource;
