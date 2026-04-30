import firebaseLogo from "../assets/rd-light.webp";
import firestoreLogo from "../assets/firestore-light.webp";
import gAnalyticsLogo from "../assets/GoogleAnalytics.webp";
import apiLogo from "../assets/api.png";
import firebaseDarkLogo from "../assets/rd-dark.webp";
import firestoreDarkLogo from "../assets/firestore-dark.webp";
import googleanalyticsDarkLogo from "../assets/googleanalytics-dark.png";
import apiDarkLogo from "../assets/api-dark.png";
import strapiLogo from "../assets/strapi-connection.webp";
import strapiDarkLogo from "../assets/Strapi-dark.png";
import clickhouseLogo from "../assets/clickhouse-light.svg";
import clickhouseDarkLogo from "../assets/clickhouse-dark.svg";
import mongodbSource from "./mongodb/mongodb.source";
import mysqlSource from "./mysql/mysql.source";
import postgresSource from "./postgres/postgres.source";
import rdsPostgresSource from "./rdspostgres/rdspostgres.source";
import rdsMysqlSource from "./rdsmysql/rdsmysql.source";
import supabasedbSource from "./supabasedb/supabasedb.source";
import timescaledbSource from "./timescaledb/timescaledb.source";
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
  ...mongodbSource,
}, {
  ...postgresSource,
}, {
  ...mysqlSource,
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
  ...timescaledbSource,
}, {
  ...supabasedbSource,
}, {
  ...rdsPostgresSource,
}, {
  ...rdsMysqlSource,
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
    dependsOn: source.dependsOn,
  }));
}

export default SOURCE_DEFINITIONS;
