import lightLogo from "./assets/rds.png";
import darkLogo from "./assets/rds-dark.png";

export default {
  id: "rdsPostgres",
  dependsOn: ["postgres"],
  type: "postgres",
  subType: "rdsPostgres",
  name: "RDS Postgres",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo,
    darkLogo,
  },
};
