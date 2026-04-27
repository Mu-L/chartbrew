import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ConnectionController = require("../../controllers/ConnectionController.js");

describe("Stripe API connection options", () => {
  it("builds a Stripe test request with basic auth against /balance", () => {
    const connectionController = new ConnectionController();

    const options = connectionController.getApiTestOptions({
      type: "api",
      host: "https://api.stripe.com/v1/balance",
      options: [],
      authentication: {
        type: "basic_auth",
        user: "sk_test_123",
        pass: "",
      },
    });

    expect(options.url).toBe("https://api.stripe.com/v1/balance");
    expect(options.method).toBe("GET");
    expect(options.auth).toEqual({
      user: "sk_test_123",
      pass: "",
    });
  });
});

