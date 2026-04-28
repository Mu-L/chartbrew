import ApiConnectionForm from "../containers/Connections/components/ApiConnectionForm";
import MongoConnectionForm from "../containers/Connections/components/MongoConnectionForm";
import PostgresConnectionForm from "../containers/Connections/components/PostgresConnectionForm";
import MysqlConnectionForm from "../containers/Connections/components/MysqlConnectionForm";
import FirestoreConnectionForm from "../containers/Connections/Firestore/FirestoreConnectionForm";
import RealtimeDbConnectionForm from "../containers/Connections/RealtimeDb/RealtimeDbConnectionForm";
import GaConnectionForm from "../containers/Connections/GoogleAnalytics/GaConnectionForm";
import StrapiConnectionForm from "../containers/Connections/Strapi/StrapiConnectionForm";
import StripeConnectionForm from "./stripe/stripe-connection-form";
import CustomerioConnectionForm from "./customerio/customerio-connection-form";
import ClickHouseConnectionForm from "../containers/Connections/ClickHouse/ClickHouseConnectionForm";
import ApiBuilder from "../containers/AddChart/components/ApiBuilder";
import SqlBuilder from "../containers/AddChart/components/SqlBuilder";
import MongoQueryBuilder from "../containers/AddChart/components/MongoQueryBuilder";
import RealtimeDbBuilder from "../containers/Connections/RealtimeDb/RealtimeDbBuilder";
import FirestoreBuilder from "../containers/Connections/Firestore/FirestoreBuilder";
import GaBuilder from "../containers/Connections/GoogleAnalytics/GaBuilder";
import CustomerioBuilder from "./customerio/customerio-builder";
import ClickHouseBuilder from "../containers/Connections/ClickHouse/ClickHouseBuilder";
import SOURCE_DEFINITIONS, {
  findSourceDefinitionForConnection,
  getSourceDefinition,
  getSourceDefinitionLogo,
  getSourceDefinitionSummaries,
} from "./definitions";

const FRONTEND_BY_SOURCE_ID = {
  api: {
    ConnectionForm: ApiConnectionForm,
    DataRequestBuilder: ApiBuilder,
  },
  mongodb: {
    ConnectionForm: MongoConnectionForm,
    DataRequestBuilder: MongoQueryBuilder,
  },
  postgres: {
    ConnectionForm: PostgresConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  mysql: {
    ConnectionForm: MysqlConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  firestore: {
    ConnectionForm: FirestoreConnectionForm,
    DataRequestBuilder: FirestoreBuilder,
  },
  realtimedb: {
    ConnectionForm: RealtimeDbConnectionForm,
    DataRequestBuilder: RealtimeDbBuilder,
  },
  googleAnalytics: {
    ConnectionForm: GaConnectionForm,
    DataRequestBuilder: GaBuilder,
  },
  strapi: {
    ConnectionForm: StrapiConnectionForm,
    DataRequestBuilder: ApiBuilder,
  },
  stripe: {
    ConnectionForm: StripeConnectionForm,
    DataRequestBuilder: ApiBuilder,
  },
  customerio: {
    ConnectionForm: CustomerioConnectionForm,
    DataRequestBuilder: CustomerioBuilder,
  },
  timescaledb: {
    ConnectionForm: PostgresConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  supabasedb: {
    ConnectionForm: PostgresConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  rdsPostgres: {
    ConnectionForm: PostgresConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  rdsMysql: {
    ConnectionForm: MysqlConnectionForm,
    DataRequestBuilder: SqlBuilder,
  },
  clickhouse: {
    ConnectionForm: ClickHouseConnectionForm,
    DataRequestBuilder: ClickHouseBuilder,
  },
};

const SOURCE_PLUGINS = SOURCE_DEFINITIONS.map((source) => ({
  ...source,
  frontend: FRONTEND_BY_SOURCE_ID[source.id] || {},
}));

export function getSourcePlugin(id) {
  const source = getSourceDefinition(id);
  return SOURCE_PLUGINS.find((item) => item.id === source.id);
}

export function getSourceForConnection(connection) {
  const source = findSourceForConnection(connection);

  if (!source) {
    const sourceId = connection?.subType || connection?.type;
    throw new Error(`Unsupported connection source: ${sourceId}`);
  }

  return source;
}

export function findSourceForConnection(connection) {
  const sourceDefinition = findSourceDefinitionForConnection(connection);
  if (!sourceDefinition) return null;

  return SOURCE_PLUGINS.find((item) => item.id === sourceDefinition.id) || null;
}

export function getSourceLogo(source, isDark) {
  return getSourceDefinitionLogo(source, isDark);
}

export function getSourcePickerItems() {
  return SOURCE_PLUGINS;
}

export function getSourceSummaries() {
  return getSourceDefinitionSummaries();
}

export default SOURCE_PLUGINS;
