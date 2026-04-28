import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const CustomerioConnection = require("../../sources/protocols/customerioConnection.js");
const drCacheController = require("../../controllers/DataRequestCacheController.js");
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
      type: "api",
      subType: "rest",
    })).toBeNull();
  });
});
