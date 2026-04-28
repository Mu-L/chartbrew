import {
  describe,
  expect,
  it,
} from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(serverRoot, "..");

function expectFile(relativePath) {
  expect(fs.existsSync(path.join(repoRoot, relativePath)), relativePath).toBe(true);
}

function expectNoFiles(relativePath) {
  const directory = path.join(repoRoot, relativePath);
  if (!fs.existsSync(directory)) {
    return;
  }

  expect(fs.readdirSync(directory), relativePath).toHaveLength(0);
}

describe("source plugin structure", () => {
  it("keeps migrated server sources in source-owned plugin folders", () => {
    expectFile("server/sources/plugins/stripe/stripe.plugin.js");
    expectFile("server/sources/plugins/stripe/templates/core-revenue.json");
    expectFile("server/sources/plugins/customerio/customerio.plugin.js");
    expectFile("server/sources/plugins/customerio/customerio.protocol.js");
    expectFile("server/sources/plugins/customerio/customerio.connection.js");
  });

  it("keeps shared source backend code under server/sources/shared", () => {
    expectFile("server/sources/shared/connectorRuntime.js");
    expectFile("server/sources/shared/protocols/api.protocol.js");
    expectFile("server/sources/shared/templates/chartTemplateLoader.js");

    expect(fs.existsSync(path.join(repoRoot, "server/sources/protocols"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "server/modules/connectorRuntime.js"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "server/chartTemplates"))).toBe(false);
  });

  it("keeps migrated client sources and assets in source-owned folders", () => {
    expectFile("client/src/sources/stripe/stripe.source.js");
    expectFile("client/src/sources/stripe/stripe-connection-form.jsx");
    expectFile("client/src/sources/stripe/assets/stripe-connection.webp");
    expectFile("client/src/sources/stripe/assets/stripe-dark.png");

    expectFile("client/src/sources/customerio/customerio.source.js");
    expectFile("client/src/sources/customerio/customerio-connection-form.jsx");
    expectFile("client/src/sources/customerio/customerio-builder.jsx");
    expectFile("client/src/sources/customerio/assets/customerio-light.webp");
    expectFile("client/src/sources/customerio/assets/customerio-dark.webp");

    expectNoFiles("client/src/containers/Connections/Stripe");
    expectNoFiles("client/src/containers/Connections/Customerio");
  });
});
