import mongoLogo from "../assets/mongodb-logo.png";
import firebaseLogo from "../assets/rd-light.webp";
import firestoreLogo from "../assets/firestore-light.webp";
import postgresLogo from "../assets/postgres.png";
import gAnalyticsLogo from "../assets/GoogleAnalytics.webp";
import mysqlLogo from "../assets/mysql.png";
import apiLogo from "../assets/api.png";
import mongoDarkLogo from "../assets/mongodb-dark.png";
import firebaseDarkLogo from "../assets/rd-dark.webp";
import firestoreDarkLogo from "../assets/firestore-dark.webp";
import postgresDarkLogo from "../assets/postgres-dark.png";
import googleanalyticsDarkLogo from "../assets/googleanalytics-dark.png";
import mysqlDarkLogo from "../assets/mysql-dark.png";
import apiDarkLogo from "../assets/api-dark.png";
import timescaledbLogo from "../assets/timescale-light.webp";
import timescaledbDarkLogo from "../assets/timescale-dark.webp";
import strapiLogo from "../assets/strapi-connection.webp";
import strapiDarkLogo from "../assets/Strapi-dark.png";
import supabaseLogo from "../assets/supabase-connection.webp";
import supabaseDarkLogo from "../assets/Supabase-dark.png";
import rdsLogo from "../assets/rds.png";
import rdsDarkLogo from "../assets/rds-dark.png";
import clickhouseLogo from "../assets/clickhouse-light.svg";
import clickhouseDarkLogo from "../assets/clickhouse-dark.svg";
import stripeSource from "./stripe/stripe.source";
import customerioSource from "./customerio/customerio.source";

const SOURCE_DEFINITIONS = [{
  id: "api",
  type: "api",
  name: "API",
  category: "api",
  capabilities: {
    ai: { canGenerateQueries: false },
  },
  assets: {
    lightLogo: apiLogo,
    darkLogo: apiDarkLogo,
  },
}, {
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
}, {
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
}, {
  id: "mysql",
  type: "mysql",
  subType: "mysql",
  name: "MySQL",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: mysqlLogo,
    darkLogo: mysqlDarkLogo,
  },
}, {
  id: "firestore",
  type: "firestore",
  subType: "firestore",
  name: "Firestore",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: false },
  },
  assets: {
    lightLogo: firestoreLogo,
    darkLogo: firestoreDarkLogo,
  },
}, {
  id: "realtimedb",
  type: "realtimedb",
  subType: "realtimedb",
  name: "Realtime DB",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: false },
  },
  assets: {
    lightLogo: firebaseLogo,
    darkLogo: firebaseDarkLogo,
  },
}, {
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
}, {
  id: "strapi",
  type: "api",
  subType: "strapi",
  name: "Strapi",
  category: "api",
  capabilities: {
    ai: { canGenerateQueries: false },
  },
  assets: {
    lightLogo: strapiLogo,
    darkLogo: strapiDarkLogo,
  },
}, {
  ...stripeSource,
}, {
  ...customerioSource,
}, {
  id: "timescaledb",
  type: "postgres",
  subType: "timescaledb",
  name: "Timescale",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: timescaledbLogo,
    darkLogo: timescaledbDarkLogo,
  },
}, {
  id: "supabasedb",
  type: "postgres",
  subType: "supabasedb",
  name: "Supabase DB",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: supabaseLogo,
    darkLogo: supabaseDarkLogo,
  },
}, {
  id: "rdsPostgres",
  type: "postgres",
  subType: "rdsPostgres",
  name: "RDS Postgres",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: rdsLogo,
    darkLogo: rdsDarkLogo,
  },
}, {
  id: "rdsMysql",
  type: "mysql",
  subType: "rdsMysql",
  name: "RDS MySQL",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: rdsLogo,
    darkLogo: rdsDarkLogo,
  },
}, {
  id: "clickhouse",
  type: "clickhouse",
  subType: "clickhouse",
  name: "ClickHouse",
  category: "database",
  capabilities: {
    ai: { canGenerateQueries: true },
  },
  assets: {
    lightLogo: clickhouseLogo,
    darkLogo: clickhouseDarkLogo,
  },
}];

const sourceIds = new Set();
SOURCE_DEFINITIONS.forEach((source) => {
  if (sourceIds.has(source.id)) {
    throw new Error(`Duplicate source plugin id: ${source.id}`);
  }
  sourceIds.add(source.id);
});

export function getSourceDefinition(id) {
  const source = SOURCE_DEFINITIONS.find((item) => item.id === id);

  if (!source) {
    throw new Error(`Unsupported source plugin: ${id}`);
  }

  return source;
}

export function findSourceDefinitionForConnection(connection) {
  const sourceId = connection?.subType || connection?.type;
  return SOURCE_DEFINITIONS.find((item) => item.id === sourceId)
    || SOURCE_DEFINITIONS.find((item) => item.type === connection?.type && !item.subType)
    || null;
}

export function getSourceDefinitionLogo(source, isDark) {
  if (!source) return null;
  return isDark ? source.assets?.darkLogo : source.assets?.lightLogo;
}

export function getSourceDefinitionSummaries() {
  return SOURCE_DEFINITIONS.map((source) => ({
    id: source.id,
    type: source.type,
    subType: source.subType,
    name: source.name,
    category: source.category,
    capabilities: source.capabilities,
  }));
}

export default SOURCE_DEFINITIONS;
