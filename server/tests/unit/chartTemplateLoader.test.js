import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { loadTemplate, validateTemplate } = require("../../chartTemplates/loader.js");

describe("chart template loader", () => {
  it("loads the Stripe core revenue template", () => {
    const template = loadTemplate("stripe", "core-revenue");

    expect(template.source).toBe("stripe");
    expect(template.slug).toBe("core-revenue");
    expect(template.requiredConnection).toEqual({
      type: "api",
      subType: "stripe",
    });
    expect(template.datasets.map((dataset) => dataset.id)).toContain("payment_intents");
    expect(template.charts.map((chart) => chart.id)).toContain("payment-volume");
  });

  it("rejects charts that reference missing datasets", () => {
    const template = loadTemplate("stripe", "core-revenue");
    const invalidTemplate = {
      ...template,
      charts: [{
        ...template.charts[0],
        requiredDatasetIds: ["missing_dataset"],
      }],
    };

    expect(() => validateTemplate(invalidTemplate)).toThrow("references unknown dataset");
  });

  it("keeps Stripe data requests on the Stripe pagination template", () => {
    const template = loadTemplate("stripe", "core-revenue");

    template.datasets.forEach((dataset) => {
      expect(dataset.dataRequest.route.startsWith("/")).toBe(true);
      expect(dataset.dataRequest.itemsLimit).toBe(1000);
    });
  });
});
