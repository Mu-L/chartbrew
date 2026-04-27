const fs = require("fs");
const path = require("path");

const templatesRoot = __dirname;

function assertString(value, name) {
  if (!value || typeof value !== "string") {
    throw new Error(`Invalid chart template: ${name} is required`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid chart template: ${name} must be an array`);
  }
}

function validateTemplate(template) {
  assertString(template.id, "id");
  assertString(template.slug, "slug");
  assertString(template.source, "source");
  assertString(template.name, "name");
  if (!Number.isInteger(template.version)) {
    throw new Error("Invalid chart template: version must be an integer");
  }
  if (!template.requiredConnection || typeof template.requiredConnection !== "object") {
    throw new Error("Invalid chart template: requiredConnection is required");
  }
  assertString(template.requiredConnection.type, "requiredConnection.type");
  assertString(template.requiredConnection.subType, "requiredConnection.subType");
  assertArray(template.datasets, "datasets");
  assertArray(template.charts, "charts");

  const datasetIds = new Set();
  template.datasets.forEach((dataset) => {
    assertString(dataset.id, "dataset.id");
    assertString(dataset.name, `dataset ${dataset.id} name`);
    if (dataset.icon !== undefined) {
      assertString(dataset.icon, `dataset ${dataset.id} icon`);
    }
    if (datasetIds.has(dataset.id)) {
      throw new Error(`Invalid chart template: duplicate dataset id ${dataset.id}`);
    }
    datasetIds.add(dataset.id);
    if (!dataset.dataRequest || typeof dataset.dataRequest !== "object") {
      throw new Error(`Invalid chart template: dataset ${dataset.id} is missing dataRequest`);
    }
    assertString(dataset.dataRequest.route, `dataset ${dataset.id} dataRequest.route`);
  });

  const chartIds = new Set();
  template.charts.forEach((chart) => {
    assertString(chart.id, "chart.id");
    assertString(chart.name, `chart ${chart.id} name`);
    assertString(chart.type, `chart ${chart.id} type`);
    if (chart.icon !== undefined) {
      assertString(chart.icon, `chart ${chart.id} icon`);
    }
    if (chartIds.has(chart.id)) {
      throw new Error(`Invalid chart template: duplicate chart id ${chart.id}`);
    }
    chartIds.add(chart.id);
    assertArray(chart.requiredDatasetIds, `chart ${chart.id} requiredDatasetIds`);
    chart.requiredDatasetIds.forEach((datasetId) => {
      if (!datasetIds.has(datasetId)) {
        throw new Error(`Invalid chart template: chart ${chart.id} references unknown dataset ${datasetId}`);
      }
    });
    if (!chart.cdc || typeof chart.cdc !== "object") {
      throw new Error(`Invalid chart template: chart ${chart.id} is missing cdc`);
    }
    if (!datasetIds.has(chart.cdc.datasetTemplateId)) {
      throw new Error(`Invalid chart template: chart ${chart.id} references unknown cdc dataset`);
    }
  });

  return template;
}

function loadTemplate(source, slug) {
  const templatePath = path.join(templatesRoot, source, `${slug}.json`);
  if (!templatePath.startsWith(templatesRoot) || !fs.existsSync(templatePath)) {
    throw new Error("404");
  }

  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  return validateTemplate(template);
}

function getTemplateSummary(template) {
  return {
    id: template.id,
    slug: template.slug,
    version: template.version,
    source: template.source,
    name: template.name,
    description: template.description,
    requiredConnection: template.requiredConnection,
    datasets: template.datasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      icon: dataset.icon,
    })),
    charts: template.charts.map((chart) => ({
      id: chart.id,
      name: chart.name,
      description: chart.description,
      icon: chart.icon,
      type: chart.type,
      requiredDatasetIds: chart.requiredDatasetIds,
    })),
  };
}

function listTemplates(source) {
  if (!source) {
    return fs.readdirSync(templatesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => listTemplates(entry.name));
  }

  const sourceDirectory = path.join(templatesRoot, source);
  if (!sourceDirectory.startsWith(templatesRoot) || !fs.existsSync(sourceDirectory)) {
    return [];
  }

  return fs.readdirSync(sourceDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => loadTemplate(source, file.replace(".json", "")))
    .map(getTemplateSummary);
}

module.exports = {
  listTemplates,
  loadTemplate,
  validateTemplate,
};
