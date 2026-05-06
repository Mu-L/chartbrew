import lightLogo from "./assets/mysql.png";
import darkLogo from "./assets/mysql-dark.png";

export default {
  id: "mysql",
  type: "mysql",
  subType: "mysql",
  name: "MySQL",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo,
    darkLogo,
  },
};
