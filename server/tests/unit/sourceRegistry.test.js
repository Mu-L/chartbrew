import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const CustomerioConnection = require("../../sources/plugins/customerio/customerio.connection.js");
const drCacheController = require("../../controllers/DataRequestCacheController.js");
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

  it("resolves Customer.io from a Customer.io connection subtype", () => {
    const source = getSourceForConnection({
      type: "customerio",
      subType: "customerio",
    });

    expect(source.id).toBe("customerio");
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

  it("returns source data request runners only for migrated runtime plugins", () => {
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
      type: "mysql",
      subType: "mysql",
    })?.source.id).toBe("mysql");
    expect(getSourceDataRequestRunner({
      type: "mysql",
      subType: "rdsMysql",
    })?.source.id).toBe("rdsMysql");
    expect(getSourceDataRequestRunner({
      type: "api",
      subType: "rest",
    })).toBeNull();
  });
});
