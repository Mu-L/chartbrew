import mongoLogo from "./assets/mongodb-logo.png";
import mongoDarkLogo from "./assets/mongodb-dark.png";

const mongodbSource = {
  id: "mongodb",
  type: "mongodb",
  subType: "mongodb",
  name: "MongoDB",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: mongoLogo,
    darkLogo: mongoDarkLogo,
  },
};

export default mongodbSource;
