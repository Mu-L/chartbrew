import postgresLogo from "./assets/postgres.png";
import postgresDarkLogo from "./assets/postgres-dark.png";

const postgresSource = {
  id: "postgres",
  type: "postgres",
  subType: "postgres",
  name: "PostgreSQL",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: postgresLogo,
    darkLogo: postgresDarkLogo,
  },
};

export default postgresSource;
