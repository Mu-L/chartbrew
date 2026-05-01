import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ClickHouseConnection = require("../../sources/plugins/clickhouse/clickhouse.connection.js");
const clickhouseProtocol = require("../../sources/plugins/clickhouse/clickhouse.protocol.js");
const CustomerioConnection = require("../../sources/plugins/customerio/customerio.connection.js");
const db = require("../../models/models");
const drCacheController = require("../../controllers/DataRequestCacheController.js");
const firestoreProtocol = require("../../sources/plugins/firestore/firestore.protocol.js");
const googleAnalyticsConnection = require("../../sources/plugins/googleAnalytics/googleAnalytics.connection.js");
const mongodbProtocol = require("../../sources/plugins/mongodb/mongodb.protocol.js");
const oauthController = require("../../controllers/OAuthController.js");
const realtimeDbProtocol = require("../../sources/plugins/realtimedb/realtimedb.protocol.js");
const sqlProtocol = require("../../sources/shared/sql/sql.protocol.js");
const {
  getSourceById,
  getSourceForConnection,
  getSourceSummaries,
} = require("../../sources");
const { getSourceDataRequestRunner } = require("../../sources/runSourceDataRequest");

describe("source registry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves Stripe by id", () => {
    const source = getSourceById("stripe");

    expect(source).toMatchObject({
      id: "stripe",
      type: "api",
      subType: "stripe",
      name: "Stripe",
    });
  });

  it("resolves ClickHouse by id", () => {
    const source = getSourceById("clickhouse");

    expect(source).toMatchObject({
      id: "clickhouse",
      type: "clickhouse",
      subType: "clickhouse",
      name: "ClickHouse",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.runChartQuery).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
    expect(source.backend.prepareConnectionData).toEqual(expect.any(Function));
    expect(source.backend.getSchema).toEqual(expect.any(Function));
    expect(source.backend.ai.generateQuery).toEqual(expect.any(Function));
  });

  it("resolves Firestore by id", () => {
    const source = getSourceById("firestore");

    expect(source).toMatchObject({
      id: "firestore",
      type: "firestore",
      subType: "firestore",
      name: "Firestore",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.getBuilderMetadata).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
  });

  it("resolves Google Analytics by id", () => {
    const source = getSourceById("googleAnalytics");

    expect(source).toMatchObject({
      id: "googleAnalytics",
      type: "googleAnalytics",
      subType: "googleAnalytics",
      name: "Google Analytics",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.getBuilderMetadata).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
  });

  it("resolves Realtime DB by id", () => {
    const source = getSourceById("realtimedb");

    expect(source).toMatchObject({
      id: "realtimedb",
      type: "realtimedb",
      subType: "realtimedb",
      name: "Realtime DB",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.getBuilderMetadata).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
  });

  it("resolves Customer.io by id", () => {
    const source = getSourceById("customerio");

    expect(source).toMatchObject({
      id: "customerio",
      type: "customerio",
      subType: "customerio",
      name: "Customer.io",
    });
    expect(source.backend.actions.getAllSegments).toEqual(expect.any(Function));
  });

  it("resolves Postgres by id", () => {
    const source = getSourceById("postgres");

    expect(source).toMatchObject({
      id: "postgres",
      type: "postgres",
      subType: "postgres",
      name: "PostgreSQL",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
    expect(source.backend.prepareConnectionData).toEqual(expect.any(Function));
    expect(source.backend.getSchema).toEqual(expect.any(Function));
    expect(source.backend.ai.generateQuery).toEqual(expect.any(Function));
  });

  it("resolves MongoDB by id", () => {
    const source = getSourceById("mongodb");

    expect(source).toMatchObject({
      id: "mongodb",
      type: "mongodb",
      subType: "mongodb",
      name: "MongoDB",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.runChartQuery).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
    expect(source.backend.updateSchema).toEqual(expect.any(Function));
    expect(source.backend.getSchema).toEqual(expect.any(Function));
    expect(source.backend.ai.generateQuery).toEqual(expect.any(Function));
  });

  it("resolves MySQL by id", () => {
    const source = getSourceById("mysql");

    expect(source).toMatchObject({
      id: "mysql",
      type: "mysql",
      subType: "mysql",
      name: "MySQL",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
    expect(source.backend.prepareConnectionData).toEqual(expect.any(Function));
    expect(source.backend.getSchema).toEqual(expect.any(Function));
    expect(source.backend.ai.generateQuery).toEqual(expect.any(Function));
  });

  it("resolves RDS MySQL as a MySQL-dependent variant", () => {
    const source = getSourceById("rdsMysql");

    expect(source).toMatchObject({
      id: "rdsMysql",
      dependsOn: ["mysql"],
      type: "mysql",
      subType: "rdsMysql",
      name: "RDS MySQL",
    });
    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
  });

  it("resolves Postgres-dependent variants by id", () => {
    [
      ["timescaledb", "timescaledb", "Timescale"],
      ["supabasedb", "supabasedb", "Supabase DB"],
      ["rdsPostgres", "rdsPostgres", "RDS Postgres"],
    ].forEach(([id, subType, name]) => {
      const source = getSourceById(id);

      expect(source).toMatchObject({
        id,
        dependsOn: ["postgres"],
        type: "postgres",
        subType,
        name,
      });
      expect(source.backend.runDataRequest).toEqual(expect.any(Function));
      expect(source.backend.testConnection).toEqual(expect.any(Function));
      expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
      expect(source.backend.prepareConnectionData).toEqual(expect.any(Function));
      expect(source.backend.getSchema).toEqual(expect.any(Function));
      expect(source.backend.ai.generateQuery).toEqual(expect.any(Function));
    });
  });

  it("resolves Customer.io from a Customer.io connection subtype", () => {
    const source = getSourceForConnection({
      type: "customerio",
      subType: "customerio",
    });

    expect(source.id).toBe("customerio");
  });

  it("resolves ClickHouse from a ClickHouse connection subtype", () => {
    const source = getSourceForConnection({
      type: "clickhouse",
      subType: "clickhouse",
    });

    expect(source.id).toBe("clickhouse");
  });

  it("resolves Firestore from a Firestore connection subtype", () => {
    const source = getSourceForConnection({
      type: "firestore",
      subType: "firestore",
    });

    expect(source.id).toBe("firestore");
  });

  it("normalizes Firestore Sequelize connections before reading credentials", () => {
    const serviceAccount = {
      project_id: "chartbrew-test",
      client_email: "chartbrew@example.com",
      private_key: "private-key",
    };
    const connection = {
      toJSON: () => ({
        id: 1,
        name: "Firestore",
        type: "firestore",
        subType: "firestore",
        firebaseServiceAccount: serviceAccount,
      }),
    };

    expect(firestoreProtocol.normalizeConnection(connection)).toMatchObject({
      id: 1,
      firebaseServiceAccount: serviceAccount,
    });
  });

  it("keeps Firestore response configuration cache payloads serializable", async () => {
    const include = [];
    include.push({ parent: { include } });
    const updateSpy = vi.spyOn(db.DataRequest, "update")
      .mockResolvedValue([1]);
    const dataRequest = {
      id: 2,
      _options: { include },
      toJSON: () => ({
        id: 2,
        query: "users",
        configuration: { limit: 10 },
        Connection: { id: 1, type: "firestore" },
      }),
    };

    const merged = await firestoreProtocol.mergeResponseConfiguration(dataRequest, {
      configuration: {
        subCollections: ["orders"],
      },
    });

    expect(merged).toEqual({
      id: 2,
      query: "users",
      configuration: {
        limit: 10,
        subCollections: ["orders"],
      },
      Connection: { id: 1, type: "firestore" },
    });
    expect(merged._options).toBeUndefined();
    expect(() => JSON.stringify(merged)).not.toThrow();
    expect(updateSpy).toHaveBeenCalledWith(
      {
        configuration: {
          limit: 10,
          subCollections: ["orders"],
        },
      },
      { where: { id: 2 } }
    );
  });

  it("serializes Firestore collection refs before returning metadata", () => {
    const include = [];
    include.push({ parent: { include } });
    const collections = firestoreProtocol.serializeCollections([{
      id: "users",
      path: "users",
      _queryOptions: { collectionId: "users" },
      parent: { include },
    }]);

    expect(collections).toEqual([{
      id: "users",
      path: "users",
      _queryOptions: { collectionId: "users" },
    }]);
    expect(() => JSON.stringify(collections)).not.toThrow();
  });

  it("resolves Realtime DB from a Realtime DB connection subtype", () => {
    const source = getSourceForConnection({
      type: "realtimedb",
      subType: "realtimedb",
    });

    expect(source.id).toBe("realtimedb");
  });

  it("resolves Google Analytics from a Google Analytics connection subtype", () => {
    const source = getSourceForConnection({
      type: "googleAnalytics",
      subType: "googleAnalytics",
    });

    expect(source.id).toBe("googleAnalytics");
  });

  it("normalizes Realtime DB Sequelize connections before reading credentials", () => {
    const serviceAccount = {
      project_id: "chartbrew-test",
      client_email: "chartbrew@example.com",
      private_key: "private-key",
    };
    const connection = {
      toJSON: () => ({
        id: 1,
        name: "Realtime DB",
        type: "realtimedb",
        subType: "realtimedb",
        connectionString: "https://chartbrew-test.firebaseio.com",
        firebaseServiceAccount: serviceAccount,
      }),
    };

    expect(realtimeDbProtocol.normalizeConnection(connection)).toMatchObject({
      id: 1,
      connectionString: "https://chartbrew-test.firebaseio.com",
      firebaseServiceAccount: serviceAccount,
    });
  });

  it("resolves Stripe from an API connection subtype", () => {
    const source = getSourceForConnection({
      type: "api",
      subType: "stripe",
    });

    expect(source.id).toBe("stripe");
  });

  it("resolves Postgres from a Postgres connection subtype", () => {
    const source = getSourceForConnection({
      type: "postgres",
      subType: "postgres",
    });

    expect(source.id).toBe("postgres");
  });

  it("resolves MongoDB from a MongoDB connection subtype", () => {
    const source = getSourceForConnection({
      type: "mongodb",
      subType: "mongodb",
    });

    expect(source.id).toBe("mongodb");
  });

  it("resolves MySQL and RDS MySQL from persisted connection subtypes", () => {
    expect(getSourceForConnection({
      type: "mysql",
      subType: "mysql",
    }).id).toBe("mysql");

    expect(getSourceForConnection({
      type: "mysql",
      subType: "rdsMysql",
    }).id).toBe("rdsMysql");
  });

  it("resolves Postgres variants from persisted connection subtypes", () => {
    expect(getSourceForConnection({
      type: "postgres",
      subType: "timescaledb",
    }).id).toBe("timescaledb");

    expect(getSourceForConnection({
      type: "postgres",
      subType: "supabasedb",
    }).id).toBe("supabasedb");

    expect(getSourceForConnection({
      type: "postgres",
      subType: "rdsPostgres",
    }).id).toBe("rdsPostgres");
  });

  it("exposes compact source summaries", () => {
    const summaries = getSourceSummaries();

    expect(summaries).toContainEqual(expect.objectContaining({
      id: "stripe",
      type: "api",
      subType: "stripe",
      capabilities: expect.any(Object),
    }));
    expect(summaries[0].backend).toBeUndefined();
  });

  it("keeps Stripe template data request defaults in the source plugin", () => {
    const source = getSourceById("stripe");

    expect(source.backend.getDefaultDataRequest()).toMatchObject({
      method: "GET",
      pagination: true,
      items: "data",
      offset: "starting_after",
      template: "stripe",
    });
  });

  it("wires Stripe to the shared API protocol methods", () => {
    const source = getSourceById("stripe");

    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));
    expect(source.backend.getBuilderMetadata).toEqual(expect.any(Function));
  });

  it("wires Customer.io to source actions and runtime methods", async () => {
    const getCustomersSpy = vi.spyOn(CustomerioConnection, "getCustomers")
      .mockResolvedValue([{ id: "customer-1" }]);
    const cacheSpy = vi.spyOn(drCacheController, "create")
      .mockResolvedValue({});
    const source = getSourceById("customerio");

    expect(source.backend.runDataRequest).toEqual(expect.any(Function));
    expect(source.backend.testConnection).toEqual(expect.any(Function));
    expect(source.backend.testUnsavedConnection).toEqual(expect.any(Function));

    const response = await source.backend.runDataRequest({
      connection: { type: "customerio", subType: "customerio" },
      dataRequest: { id: 2, route: "customers" },
      getCache: false,
    });

    expect(response).toMatchObject({ responseData: { data: [{ id: "customer-1" }] } });
    expect(getCustomersSpy).toHaveBeenCalledWith(
      { type: "customerio", subType: "customerio" },
      { id: 2, route: "customers" }
    );
    expect(cacheSpy).toHaveBeenCalledWith(2, expect.objectContaining({
      responseData: { data: [{ id: "customer-1" }] },
    }));
  });

  it("wires Google Analytics to source-owned runtime methods", async () => {
    const findOAuthSpy = vi.spyOn(oauthController, "findById")
      .mockResolvedValue({ id: 7, refreshToken: "refresh-token" });
    const getAnalyticsSpy = vi.spyOn(googleAnalyticsConnection, "getAnalytics")
      .mockResolvedValue([{ date: "2026-05-01", activeUsers: "12" }]);
    const cacheSpy = vi.spyOn(drCacheController, "create")
      .mockResolvedValue({});
    const source = getSourceById("googleAnalytics");

    const response = await source.backend.runDataRequest({
      connection: {
        type: "googleAnalytics",
        subType: "googleAnalytics",
        oauth_id: 7,
      },
      dataRequest: { id: 2, configuration: { metrics: "activeUsers" } },
      getCache: false,
    });

    expect(response).toMatchObject({
      responseData: { data: [{ date: "2026-05-01", activeUsers: "12" }] },
    });
    expect(findOAuthSpy).toHaveBeenCalledWith(7);
    expect(getAnalyticsSpy).toHaveBeenCalledWith(
      { id: 7, refreshToken: "refresh-token" },
      { id: 2, configuration: { metrics: "activeUsers" } }
    );
    expect(cacheSpy).toHaveBeenCalledWith(2, expect.objectContaining({
      responseData: { data: [{ date: "2026-05-01", activeUsers: "12" }] },
    }));
  });

  it("loads Google Analytics builder metadata through the source plugin", async () => {
    vi.spyOn(oauthController, "findById")
      .mockResolvedValue({ id: 7, refreshToken: "refresh-token" });
    vi.spyOn(googleAnalyticsConnection, "getAccounts")
      .mockResolvedValue([{ account: "accounts/1" }]);
    vi.spyOn(googleAnalyticsConnection, "getMetadata")
      .mockResolvedValue({ dimensions: [{ apiName: "date" }] });
    const source = getSourceById("googleAnalytics");

    const metadata = await source.backend.getBuilderMetadata({
      connection: {
        type: "googleAnalytics",
        subType: "googleAnalytics",
        oauth_id: 7,
      },
      options: { propertyId: "properties/1" },
    });

    expect(metadata).toEqual({
      accounts: [{ account: "accounts/1" }],
      metadata: { dimensions: [{ apiName: "date" }] },
    });
  });

  it("passes processed SQL queries through the Postgres plugin wrapper", async () => {
    const runDataRequestSpy = vi.spyOn(sqlProtocol, "runDataRequest")
      .mockResolvedValue({ responseData: { data: [] } });
    const source = getSourceById("postgres");

    await source.backend.runDataRequest({
      connection: { id: 1, type: "postgres", subType: "postgres" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });

    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "postgres",
      processedQuery: "select * from users where id = 42",
    }));
  });

  it("passes processed SQL queries through the MySQL plugin wrapper", async () => {
    const runDataRequestSpy = vi.spyOn(sqlProtocol, "runDataRequest")
      .mockResolvedValue({ responseData: { data: [] } });
    const source = getSourceById("mysql");

    await source.backend.runDataRequest({
      connection: { id: 1, type: "mysql", subType: "mysql" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });

    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "mysql",
      processedQuery: "select * from users where id = 42",
    }));
  });

  it("passes processed SQL queries through the RDS MySQL plugin wrapper", async () => {
    const runDataRequestSpy = vi.spyOn(sqlProtocol, "runDataRequest")
      .mockResolvedValue({ responseData: { data: [] } });
    const source = getSourceById("rdsMysql");

    await source.backend.runDataRequest({
      connection: { id: 1, type: "mysql", subType: "rdsMysql" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });

    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "rdsMysql",
      processedQuery: "select * from users where id = 42",
    }));
  });

  it("passes processed SQL queries through Postgres variant wrappers", async () => {
    const runDataRequestSpy = vi.spyOn(sqlProtocol, "runDataRequest")
      .mockResolvedValue({ responseData: { data: [] } });

    await getSourceById("timescaledb").backend.runDataRequest({
      connection: { id: 1, type: "postgres", subType: "timescaledb" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });
    await getSourceById("supabasedb").backend.runDataRequest({
      connection: { id: 1, type: "postgres", subType: "supabasedb" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });
    await getSourceById("rdsPostgres").backend.runDataRequest({
      connection: { id: 1, type: "postgres", subType: "rdsPostgres" },
      dataRequest: { id: 2, query: "select * from users where id = {{user_id}}" },
      getCache: false,
      processedQuery: "select * from users where id = 42",
    });

    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "timescaledb",
      processedQuery: "select * from users where id = 42",
    }));
    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "supabasedb",
      processedQuery: "select * from users where id = 42",
    }));
    expect(runDataRequestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connectionType: "rdsPostgres",
      processedQuery: "select * from users where id = 42",
    }));
  });

  it("normalizes MongoDB query strings through the MongoDB protocol", () => {
    expect(mongodbProtocol.getQueryToExecute("connection.collection('users').find({})"))
      .toBe("collection('users').find({})");
  });

  it("passes processed queries through the ClickHouse plugin wrapper", async () => {
    const querySpy = vi.spyOn(ClickHouseConnection.prototype, "query")
      .mockResolvedValue([{ total: 42 }]);
    const cacheSpy = vi.spyOn(drCacheController, "create")
      .mockResolvedValue({});
    const source = getSourceById("clickhouse");

    const response = await source.backend.runDataRequest({
      connection: { type: "clickhouse", subType: "clickhouse" },
      dataRequest: { id: 2, query: "select * from events where id = {{event_id}}" },
      getCache: false,
      processedQuery: "select * from events where id = 42",
    });

    expect(response).toMatchObject({ responseData: { data: [{ total: 42 }] } });
    expect(querySpy).toHaveBeenCalledWith("select * from events where id = 42");
    expect(cacheSpy).toHaveBeenCalledWith(2, expect.objectContaining({
      responseData: { data: [{ total: 42 }] },
    }));
  });

  it("requires ClickHouse queries before execution", () => {
    expect(() => clickhouseProtocol.getQueryToExecute({ dataRequest: { query: "" } }))
      .toThrow("ClickHouse query is required");
  });

  it("returns source data request runners only for migrated runtime plugins", () => {
    expect(getSourceDataRequestRunner({
      type: "clickhouse",
      subType: "clickhouse",
    })?.source.id).toBe("clickhouse");
    expect(getSourceDataRequestRunner({
      type: "firestore",
      subType: "firestore",
    })?.source.id).toBe("firestore");
    expect(getSourceDataRequestRunner({
      type: "realtimedb",
      subType: "realtimedb",
    })?.source.id).toBe("realtimedb");
    expect(getSourceDataRequestRunner({
      type: "googleAnalytics",
      subType: "googleAnalytics",
    })?.source.id).toBe("googleAnalytics");
    expect(getSourceDataRequestRunner({
      type: "api",
      subType: "stripe",
    })?.source.id).toBe("stripe");
    expect(getSourceDataRequestRunner({
      type: "customerio",
      subType: "customerio",
    })?.source.id).toBe("customerio");
    expect(getSourceDataRequestRunner({
      type: "postgres",
      subType: "postgres",
    })?.source.id).toBe("postgres");
    expect(getSourceDataRequestRunner({
      type: "postgres",
      subType: "timescaledb",
    })?.source.id).toBe("timescaledb");
    expect(getSourceDataRequestRunner({
      type: "postgres",
      subType: "supabasedb",
    })?.source.id).toBe("supabasedb");
    expect(getSourceDataRequestRunner({
      type: "postgres",
      subType: "rdsPostgres",
    })?.source.id).toBe("rdsPostgres");
    expect(getSourceDataRequestRunner({
      type: "mysql",
      subType: "mysql",
    })?.source.id).toBe("mysql");
    expect(getSourceDataRequestRunner({
      type: "mysql",
      subType: "rdsMysql",
    })?.source.id).toBe("rdsMysql");
    expect(getSourceDataRequestRunner({
      type: "mongodb",
      subType: "mongodb",
    })?.source.id).toBe("mongodb");
    expect(getSourceDataRequestRunner({
      type: "api",
      subType: "rest",
    })).toBeNull();
  });
});
