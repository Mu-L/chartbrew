# Chartbrew source plugin architecture, initial spec

## Context

Chartbrew currently supports multiple data source types, but source-specific behavior is spread across backend controllers, frontend connection screens, dataset builders, assets, templates, and AI/orchestrator behavior.

The goal of this work is to make adding and maintaining source types cleaner, more predictable, and easier for AI/contributors to work on.

This document was checked against the current `chartbrew-os` codebase and the Stripe/templates commit `ff2b5510300c7d8be2dda09bbf7df6b8c6ca2eb7` (`:sparkles: added Stripe connection and chart templates`, committed April 24, 2026). That commit is a good example of the current cost of adding a source: it touched connection picker metadata, connection form routing, a new connection form, next-step UI, new chart-template routes/controllers/loaders, Redux state, and hardcoded Stripe defaults.

Progress is tracked in [`chartbrew-source-plugin-progress.md`](./chartbrew-source-plugin-progress.md). For implementation steps, use [`source-plugin-guide.md`](./source-plugin-guide.md).

The current source-owned folder shape has been refined during implementation:

- Backend plugins live under `server/sources/plugins/<source>/`.
- Shared backend source helpers live under `server/sources/shared/`.
- Frontend source UI lives under `client/src/sources/<source>/`.
- Frontend shared source UI lives under `client/src/sources/shared/`.
- Source variants should stay as separate plugins when they may need different templates, AI behavior, defaults, or UI, and can declare `dependsOn` for their base plugin while sharing protocol/helper code when appropriate.

## High-level goal

Introduce an internal source plugin architecture where each source can define, in one predictable place:

- Source metadata: id, protocol type, subtype, name, category, description, logo/icon
- Capabilities: query support, schema support, templates, custom UI, AI support, action support
- Backend behavior: test connection, run data request, builder metadata, helper/source actions
- Frontend behavior: connection form, data request builder, next-step UI, source-specific setup UI
- Templates: built-in dataset/chart/dashboard starter templates
- AI context: source-specific instructions, query generation support, tool support
- Orchestrator tools: safe in-app tools the AI assistant can call for this source

The app should become capability-driven, not source-name-driven.

Prefer:

```js
source.capabilities.data.supportsQuery
source.capabilities.templates.charts
source.backend.runDataRequest(context)
source.ai?.tools?.recommendTemplates(context)
```

Instead of:

```js
connection.type === "postgres"
connection.type === "mongodb"
connection.subType === "stripe"
```

## Important codebase reality

Chartbrew currently has two source identity fields:

- `Connection.type`: the execution protocol/family. Examples: `api`, `mongodb`, `postgres`, `mysql`, `firestore`, `realtimedb`, `googleAnalytics`, `customerio`, `clickhouse`.
- `Connection.subType`: the brand or variant. Examples: `stripe`, `strapi`, `timescaledb`, `supabasedb`, `rdsPostgres`, `rdsMysql`.

This matters because some UI entries are user-facing source IDs but are not execution types. For example, Stripe is created as:

```js
{
  type: "api",
  subType: "stripe",
  host: "https://api.stripe.com/v1"
}
```

The first plugin registry should model both:

```js
{
  id: "stripe",
  type: "api",
  subType: "stripe",
}
```

For plain protocol sources, `id`, `type`, and `subType` can be the same or `subType` can be omitted:

```js
{
  id: "postgres",
  type: "postgres",
  subType: "postgres",
}
```

Use the plugin `id` for frontend picker/routes/assets/templates. Use `type` for shared protocol execution where that is still appropriate. Use `subType` only when the source variant really changes behavior.

## Important implementation rule

Do not build temporary migration layers, compatibility adapters, or parallel old/new systems that create future cleanup work.

It is acceptable to migrate one source or one execution path at a time, but each migrated area should replace the old branch with a registry/plugin call in that same PR.

Avoid:

- Long-lived adapter layers
- Duplicate registries
- Old controller branches kept beside new plugin calls
- Temporary compatibility code without a removal in the same PR
- New abstractions that only mirror the old structure without simplifying it

## Non-goals

Do not:

- Rewrite the entire app
- Propose a new project folder structure outside the existing client/server split
- Convert the project to TypeScript
- Extract source plugins into separate NPM packages yet
- Change the database schema unless clearly required
- Redesign the connection/dataset/chart UX from scratch
- Add external runtime plugin loading
- Break existing source behavior

This should be an architecture improvement inside the current project.

## Repo scan note

### Backend source-specific execution

Primary files:

- `server/controllers/ConnectionController.js`
  - Owns most connector behavior today.
  - Creation side effects: legacy `create()` preloads SQL schema for `mysql`, migrated source plugins can prepare create data themselves, and Mongo queues schema updates.
  - Test routing: `testRequest()` switches on `data.type`.
  - Saved connection testing: `testConnection()` switches on `connection.type`.
  - Request execution methods: `runApiRequest`, `runRealtimeDb`, `runGoogleAnalytics`.
  - Builder metadata methods: `getApiBuilderMetadata`, `getRealtimeDbBuilderMetadata`, `getGoogleAnalyticsBuilderMetadata`.
  - Source helper routing: `runHelperMethod()` currently only allows a fixed Customer.io helper-method list.
- `server/controllers/DataRequestController.js`
  - `getBuilderMetadata()` switches on `DataRequest.Connection.type`.
  - `runRequest()` switches on `connection.type`.
  - `askAi()` uses migrated source AI hooks before falling back to legacy query generation.
- `server/controllers/DatasetController.js`
  - Contains duplicated `connection.type` execution dispatch when running dataset data requests, including audit context.
  - This is currently the most important runtime path to migrate carefully because chart/dashboard refreshes depend on it.
- `server/controllers/ChartController.js`
  - Older preview/test paths still switch on `connection.type` for MongoDB/API/SQL.
- Connector helpers:
  - migrated shared SQL helper: `server/sources/shared/sql/externalDbConnection.js`
  - migrated Firestore helper: `server/sources/plugins/firestore/firestore.connection.js`
  - `server/connections/RealtimeDatabase.js`
  - `server/connections/CustomerioConnection.js`
  - migrated ClickHouse helper: `server/sources/plugins/clickhouse/clickhouse.connection.js`
  - `server/modules/firebaseConnector.js`
  - `server/modules/googleConnector.js`
  - `server/modules/paginateRequests.js`

### Backend routes

Primary files:

- `server/api/ConnectionRoute.js`
  - Connection CRUD.
  - Unsaved connection tests: `POST /team/:team_id/connections/:type/test`.
  - File-backed tests: `POST /team/:team_id/connections/:type/test/files`.
  - Saved connection test: `GET /team/:team_id/connections/:connection_id/test`.
  - API request preview: `POST /team/:team_id/connections/:connection_id/apiTest`.
  - Source helper route: `POST /team/:team_id/connections/:connection_id/helper/:method`.
- `server/api/DatasetRoute.js` and `server/api/ChartRoute.js`
  - Runtime execution enters `DatasetController`/`ChartController`.
- `server/api/ChartTemplateRoute.js`
  - New built-in chart-template route from the Stripe commit.

### Backend templates

There are two template systems today:

- Older dashboard/community/custom templates:
  - `server/templates/index.js`
  - `server/templates/{googleAnalytics,plausible,simpleanalytics,chartmogul,mailgun,strapi,custom}/...`
  - `server/controllers/TemplateController.js`
  - `server/api/TemplateRoute.js`
  - `server/controllers/ProjectController.js` calls template builders.
- New built-in chart templates added for Stripe:
  - `server/sources/shared/templates/chartTemplateLoader.js`
  - `server/sources/plugins/stripe/templates/core-revenue.json`
  - `server/controllers/ChartTemplateController.js`
  - `server/api/ChartTemplateRoute.js`

The new Stripe chart-template system is closer to the desired plugin-owned template model. Stripe template files and Stripe data-request defaults should stay in the Stripe plugin folder; the shared chart-template loader should discover templates from registered source plugins.

### Backend AI/orchestrator

Primary files:

- `server/modules/ai/orchestrator/orchestrator.js`
  - Hardcodes supported sources in tool descriptions and system prompt.
  - `buildSystemPrompt()` filters available connections to `mysql`, `postgres`, and `mongodb`.
  - `buildSemanticLayer()` loads all team connections, but later prompt/tool layers narrow support.
- `server/modules/ai/orchestrator/entityCreationRules.js`
  - Hardcodes supported connection types/subtypes.
- `server/modules/ai/orchestrator/tools/listConnections.js`
  - Filters connections through `SUPPORTED_CONNECTIONS`.
- `server/modules/ai/orchestrator/tools/getSchema.js`
  - Rejects unsupported types.
- `server/modules/ai/orchestrator/tools/runQuery.js`
  - Dispatches migrated runtime sources through the source registry.
- `server/modules/ai/generateSqlQuery.js`
- `server/modules/ai/generateMongoQuery.js`
- `server/modules/ai/generateClickhouseQuery.js`

### Frontend source metadata and assets

Primary files:

- `client/src/modules/availableConnections.js`
  - User-facing picker list and AI badge flags.
  - Contains subtype-like entries such as `stripe`, `strapi`, `timescaledb`, `supabasedb`, `rdsPostgres`, `rdsMysql`.
- `client/src/config/connectionImages.js`
  - Central image map keyed by `type` or `subType`.
- `client/src/assets/*`
  - Connection logos.

### Frontend connection forms and next-step UI

Primary files:

- `client/src/containers/Connections/ConnectionWizard.jsx`
  - Reads connection picker items and connection forms from `client/src/sources/index.js`.
  - Uses the selected source definition to render forms.
  - Uses `connectionToEdit.subType || connectionToEdit.type` for edit routing.
- Connection forms:
  - `client/src/containers/Connections/components/ApiConnectionForm.jsx`
  - migrated source-owned forms:
    - `client/src/sources/mongodb/mongodb-connection-form.jsx`
    - `client/src/sources/postgres/postgres-connection-form.jsx`
    - `client/src/sources/mysql/mysql-connection-form.jsx`
  - `client/src/containers/Connections/RealtimeDb/RealtimeDbConnectionForm.jsx`
  - `client/src/containers/Connections/GoogleAnalytics/GaConnectionForm.jsx`
  - `client/src/containers/Connections/Strapi/StrapiConnectionForm.jsx`
  - migrated source-owned forms:
    - `client/src/sources/clickhouse/clickhouse-connection-form.jsx`
    - `client/src/sources/firestore/firestore-connection-form.jsx`
    - `client/src/sources/stripe/stripe-connection-form.jsx`
    - `client/src/sources/customerio/customerio-connection-form.jsx`
- `client/src/containers/Connections/ConnectionNextSteps.jsx`
  - Hardcodes Stripe template setup when `connection.subType === "stripe"`.
  - Otherwise renders generic next steps.
- `client/src/containers/Connections/components/ChartTemplateSetup.jsx`
  - UI for chart-template selection and creation.

### Frontend dataset/data request builder

Primary files:

- `client/src/containers/Dataset/DatasetQuery.jsx`
  - Main current dataset query UI.
  - Resolves data request builders through `findSourceForConnection(...)` from `client/src/sources/index.js`.
- `client/src/containers/AddChart/components/DatarequestModal.jsx`
  - Older modal path that now uses the same frontend source registry for builder resolution.
- Builder components:
  - `client/src/containers/AddChart/components/ApiBuilder.jsx`
  - `client/src/sources/shared/sql/sql-builder.jsx`
  - `client/src/containers/Connections/RealtimeDb/RealtimeDbBuilder.jsx`
  - `client/src/containers/Connections/GoogleAnalytics/GaBuilder.jsx`
  - migrated source-owned builders:
    - `client/src/sources/clickhouse/clickhouse-builder.jsx`
    - `client/src/sources/firestore/firestore-builder.jsx`
    - `client/src/sources/mongodb/mongodb-builder.jsx`
    - `client/src/sources/customerio/customerio-builder.jsx`
- `client/src/containers/AddChart/components/ApiBuilder.jsx`
  - Contains Stripe-specific behavior by detecting `api.stripe.com` and setting `dataRequest.template = "stripe"`.

### Constants/enums for source types

There is no single authoritative source enum today.

Current source identifiers are spread across:

- `client/src/modules/availableConnections.js`
- `client/src/config/connectionImages.js`
- `server/controllers/ConnectionController.js`
- `server/controllers/DataRequestController.js`
- `server/controllers/DatasetController.js`
- `server/modules/ai/orchestrator/entityCreationRules.js`
- source-owned template folders under `server/sources/plugins/<source>/templates`
- Connection form defaults

The plugin registry should become the authoritative source manifest for new code paths.

### Tests/lint/build commands

From current package scripts:

- Root:
  - `npm run setup`
  - `npm run client`
  - `npm run server`
- Server:
  - `cd server && npm run test:run`
  - `cd server && npm run test:unit`
  - `cd server && npm run test:integration`
  - `cd server && npm run lint`
- Client:
  - `cd client && npm run build`
  - `cd client && npm run lint`
  - `cd client && npm run dev`

Existing relevant tests:

- `server/tests/unit/chartTemplateLoader.test.js`
- `server/tests/unit/stripeConnectionOptions.test.js`
- `server/tests/integration/chartTemplateRoute.test.js`
- `server/tests/integration/connectionRoute.security.test.js`
- `server/tests/integration/datasetRoute.projectScoping.test.js`
- `server/tests/unit/orchestratorResponsesApi.test.js`

## Proposed plugin shape

Keep the contract small at first. Add fields only when the app actually needs them.

Suggested CommonJS backend shape:

```js
module.exports = {
  id: "stripe",
  type: "api",
  subType: "stripe",
  name: "Stripe",
  category: "payments",
  description: "Connect to Stripe reporting data through the Stripe API.",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: false,
      authModes: ["basic_auth"],
    },
    data: {
      supportsQuery: false,
      supportsSchema: false,
      supportsResourcePicker: true,
      supportsPagination: true,
      supportsVariables: true,
      supportsJoins: true,
    },
    ui: {
      connectionForm: true,
      dataRequestBuilder: "api",
      queryEditor: null,
      nextSteps: "chartTemplates",
    },
    templates: {
      datasets: true,
      charts: true,
      dashboards: false,
    },
    ai: {
      canGenerateDatasets: false,
      canGenerateQueries: false,
      hasSourceInstructions: true,
      hasTools: true,
    },
  },

  backend: {
    testConnection,
    testUnsavedConnection,
    runDataRequest,
    getBuilderMetadata,
    actions,
  },

  templates: {
    charts: ["core-revenue"],
  },

  ai: {
    instructions,
    tools,
  },
};
```

Suggested ESM frontend shape:

```jsx
export default {
  id: "stripe",
  type: "api",
  subType: "stripe",
  name: "Stripe",
  category: "payments",
  description: "Connect to Stripe reporting data through the Stripe API.",
  capabilities,
  assets: {
    lightLogo,
    darkLogo,
  },
  frontend: {
    ConnectionForm: StripeConnectionForm,
    DataRequestBuilder: ApiBuilder,
    NextSteps: ChartTemplateNextSteps,
  },
};
```

## Backend registry

Create a backend registry under a server-local path, for example:

```txt
server/sources/index.js
server/sources/validateSourcePlugin.js
server/sources/plugins/api/api.plugin.js
server/sources/plugins/mongodb/mongodb.plugin.js
server/sources/plugins/postgres/postgres.plugin.js
server/sources/plugins/mysql/mysql.plugin.js
server/sources/plugins/rdsmysql/rdsmysql.plugin.js
server/sources/plugins/stripe/stripe.plugin.js
server/sources/shared/protocols/api.protocol.js
server/sources/shared/sql/sql.protocol.js
```

Suggested interface:

```js
function getSourceById(id) {
  const source = sources.find((item) => item.id === id);
  if (!source) throw new Error(`Unsupported source id: ${id}`);
  return source;
}

function getSourceForConnection(connection) {
  const sourceId = connection.subType || connection.type;
  const source = sources.find((item) => item.id === sourceId)
    || sources.find((item) => item.type === connection.type && !item.subType);

  if (!source) {
    throw new Error(`Unsupported connection source: ${sourceId}`);
  }

  return source;
}

function getSourceSummaries() {
  return sources.map((source) => ({
    id: source.id,
    type: source.type,
    subType: source.subType,
    name: source.name,
    category: source.category,
    description: source.description,
    capabilities: source.capabilities,
  }));
}
```

Use `getSourceForConnection(connection)` to replace source-specific branching in backend source execution paths.

Target replacement style:

```js
const source = getSourceForConnection(connection);

const result = await source.backend.runDataRequest({
  connection,
  dataRequest: originalDataRequest,
  chartId: chart_id,
  getCache,
  filters,
  timezone,
  variables,
  processedQuery,
  auditContext,
});
```

## Frontend registry

Create a frontend registry under a client-local path, for example:

```txt
client/src/sources/index.js
client/src/sources/definitions.js
client/src/sources/stripe/stripe.source.js
client/src/sources/stripe/stripe-connection-form.jsx
client/src/sources/customerio/customerio.source.js
client/src/sources/customerio/customerio-connection-form.jsx
client/src/sources/customerio/customerio-builder.jsx
```

Use it for:

- Connection picker
- Source display names
- Logos/icons
- Category grouping
- Source capability checks
- Connection form resolution
- Data request builder resolution
- Source-specific next-step UI

Target replacement style:

```jsx
const source = getSourcePlugin(selectedType);
const ConnectionForm = source.frontend.ConnectionForm;

return (
  <ConnectionForm
    onComplete={onComplete}
    editConnection={editConnection}
    subType={source.subType}
  />
);
```

For data request builders:

```jsx
const source = getSourceForConnection(selectedRequest.Connection);
const DataRequestBuilder = source.frontend.DataRequestBuilder;

return (
  <DataRequestBuilder
    dataRequest={dr}
    connection={dr.Connection}
    onChangeRequest={onChangeRequest}
    onSave={onSave}
    onDelete={onDelete}
  />
);
```

## Source actions

Replace `ConnectionController.runHelperMethod()` and `/helper/:method` with a generic action mechanism.

Existing route to migrate:

```txt
POST /team/:team_id/connections/:connection_id/helper/:method
```

Preferred route, following existing route conventions:

```txt
POST /team/:team_id/connections/:connection_id/source-action
```

Example payload:

```json
{
  "action": "listResources",
  "params": {
    "resource": "customers"
  }
}
```

Backend behavior:

```js
const source = getSourceForConnection(req.connection);
const action = source.backend.actions?.[req.body.action];

if (!action) {
  throw new Error("Unsupported source action");
}

const result = await action({
  connection: req.connection,
  params: req.body.params || {},
  user: req.user,
  teamId: req.params.team_id,
});

return res.json(result);
```

Rules:

- Validate action names against registered actions.
- Validate params per action.
- Reuse existing auth/team/connection access checks.
- Do not expose credentials.
- Return compact structured data.
- Keep action names generic across sources where possible.

Useful common actions:

```txt
listResources
getSchema
getSampleData
previewDataRequest
validateDataRequest
listTemplates
recommendTemplates
```

Useful SQL-specific actions:

```txt
listSchemas
listTables
listColumns
previewQuery
validateQuery
```

## Templates

Built-in source templates should be owned by the source plugin.

The current Stripe implementation is the reference shape:

- Keep Stripe data-request defaults in the Stripe source plugin.
- Let `ChartTemplateController` ask the source/plugin how to create template data requests.
- Keep the shared loader generic, but make it resolve template files through source plugin metadata.
- Preserve the current JSON template shape unless a plugin requirement forces a change.

A source may expose:

```js
templates: {
  directory: path.join(__dirname, "templates"),
  chartTemplates: ["core-revenue"],
  defaults: {
    dataRequest: {},
  },
}
```

Start with listing and creating existing chart templates. Add broader dashboard/template unification later.

## AI and orchestrator tools

The in-app AI/orchestrator should not hardcode source behavior.

Each source plugin can provide:

```js
ai: {
  instructions,
  examples,
  getContext,
  tools,
}
```

The orchestrator should compose:

- Global Chartbrew AI instructions
- User goal
- Current team/project/dashboard context
- Selected connection/source metadata
- Source capabilities
- Source-specific AI instructions
- Available source templates
- Available source tools

Do not dump huge schemas or raw datasets into the prompt. Prefer tool calls.

First AI migration should replace these hardcoded lists with plugin capabilities:

- `SUPPORTED_CONNECTIONS` in `server/modules/ai/orchestrator/entityCreationRules.js`
- Tool descriptions in `server/modules/ai/orchestrator/orchestrator.js`
- Connection filtering in `server/modules/ai/orchestrator/tools/listConnections.js`
- Type support checks in `getSchema`, `runQuery`, and `createDataset`

## Orchestrator tool contract

Expose source tools through a controlled adapter, not directly through arbitrary plugin functions.

Example conceptual shape:

```js
{
  name: "source.getSampleData",
  description: "Fetch a small sample from the selected source.",
  inputSchema: {
    type: "object",
    properties: {
      resource: { type: "string" },
    },
    required: ["resource"],
  },
  execute: async ({ resource }) => {
    return source.backend.actions.getSampleData({
      connection,
      params: { resource },
      user,
      teamId,
    });
  },
}
```

Rules:

- Tools must be explicitly registered.
- Tools must validate input.
- Tools must be scoped to the authenticated user/team/connection.
- Tools must return compact, structured data.
- Read-only tools should come before write/create tools.
- Create/update tools should require clear user intent.
- Use existing services where possible.
- Prefer stable generic tool names.

Start with read-only tools:

```txt
source.getCapabilities
source.listResources
source.getSchema
source.getSampleData
source.listTemplates
source.recommendTemplates
```

Add create tools later.

## Validation

Add lightweight validation for source plugins.

At minimum:

```js
function validateSourcePlugin(plugin) {
  if (!plugin.id) throw new Error("Source plugin is missing id");
  if (!plugin.type) throw new Error(`Source plugin ${plugin.id} is missing type`);
  if (!plugin.name) throw new Error(`Source plugin ${plugin.id} is missing name`);
  if (!plugin.capabilities) throw new Error(`Source plugin ${plugin.id} is missing capabilities`);
  if (!plugin.backend) throw new Error(`Source plugin ${plugin.id} is missing backend`);
}
```

Validate:

- Unique source IDs.
- Valid `type`/`subType` combinations.
- Required manifest fields.
- Required backend functions for enabled capabilities.
- Required frontend components for enabled UI capabilities.
- Template shape.
- Source action names.
- Orchestrator tool schemas.

## Suggested migration order

1. Add backend source registry and validation.
2. Add frontend source registry and replace `availableConnections`/`connectionImages` usage in the connection picker.
3. Migrate one frontend form-resolution path in `ConnectionWizard`.
4. Migrate data request builder resolution in `DatasetQuery`.
5. Migrate `DataRequestController.getBuilderMetadata()` to source metadata/actions.
6. Extract shared backend data-request execution dispatch from `DatasetController` and `DataRequestController` into a source registry call.
7. Move Stripe chart-template files and defaults into the Stripe plugin.
8. Replace `ConnectionNextSteps` Stripe branching with plugin next-step capability/UI.
9. Replace Customer.io helper methods with generic source actions.
10. Move AI/orchestrator source support from hardcoded lists to source capabilities.

## Smallest safe source to migrate first

Recommended first source: `stripe`.

Reasoning:

- It was just added in commit `ff2b5510300c7d8be2dda09bbf7df6b8c6ca2eb7`, so the source-specific changes are easy to identify.
- It is a subtype source (`type: "api"`, `subType: "stripe"`), which forces the registry to model the real `type`/`subType` architecture from the start.
- Its runtime data fetching already uses the generic API execution path, so the first migration can focus on metadata, connection form resolution, next-step/template ownership, and pagination/template defaults without changing low-level HTTP execution.
- Existing Stripe tests cover connection options and chart-template loading/routes.

Second source after Stripe: `postgres`, followed by `mysql`.

Reasoning:

- It exercises schema/query/AI capabilities.
- It shares execution with `mysql`, so the shared SQL protocol should be introduced before both SQL sources are fully migrated.
- MySQL should migrate with its `rdsMysql` variant as a separate dependent plugin.

Avoid migrating `api` first. It is the generic protocol base for several branded sources and would make the first PR too broad.

## Recommended first deliverable

Keep the first implementation pass small:

- Backend source registry with validation.
- Frontend source registry with validation-light conventions.
- Stripe plugin manifest on both backend and frontend.
- Connection picker reads from frontend registry instead of `availableConnections`.
- `ConnectionWizard` resolves the Stripe form through the registry.
- `ConnectionNextSteps` resolves Stripe template setup through plugin metadata/UI instead of `connection.subType === "stripe"`.
- `ChartTemplateController` gets Stripe data-request defaults from the Stripe backend plugin.
- Tests updated/added around registry validation and existing Stripe template behavior.
