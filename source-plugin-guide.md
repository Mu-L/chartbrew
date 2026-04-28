# Source plugin guide

This guide is the implementation checklist for adding or migrating a Chartbrew source in `chartbrew-os`.

Use it together with:

- [`chartbrew-source-plugin-initial-spec.md`](./chartbrew-source-plugin-initial-spec.md)
- [`chartbrew-source-plugin-progress.md`](./chartbrew-source-plugin-progress.md)

## Principles

- Keep source-specific implementation with the source plugin.
- Prefer registry and capability checks over `connection.type` or `connection.subType` branches.
- Migrate one source at a time, but remove old branches for that migrated source in the same change.
- Do not keep legacy helper routes, compatibility thunks, or controller branches unless an active UI or API caller still needs them.
- Branded API sources can use the shared API protocol when they do not need custom behavior. Do not create a native protocol just to wrap the API protocol.

## Source identity

Every source needs a stable plugin `id`, plus the persisted connection identity:

```js
{
  id: "stripe",
  type: "api",
  subType: "stripe",
}
```

Rules:

- `id` is the source registry key used by UI, templates, and plugin lookup.
- `type` is the persisted execution family, such as `api`, `postgres`, `mongodb`, or `customerio`.
- `subType` is the persisted brand or variant when needed.
- For plain protocol sources, `id`, `type`, and `subType` can all match.
- For branded API sources, keep `type: "api"` and use `subType` for the brand.

## Backend checklist

### 1. Create the source plugin

Add a file:

```txt
server/sources/plugins/<sourceId>.js
```

The plugin should export source metadata, capabilities, backend behavior, and optional template metadata:

```js
const protocol = require("../protocols/<protocol>");

module.exports = {
  id: "<sourceId>",
  type: "<connectionType>",
  subType: "<connectionSubType>",
  name: "<Display name>",
  category: "<category>",
  description: "<short description>",

  capabilities: {
    connection: {
      supportsTest: true,
      supportsOAuth: false,
      supportsFiles: false,
      authModes: [],
    },
    data: {
      supportsQuery: false,
      supportsSchema: false,
      supportsResourcePicker: false,
      supportsPagination: false,
      supportsVariables: true,
      supportsJoins: true,
    },
    templates: {
      datasets: false,
      charts: false,
      dashboards: false,
    },
    ai: {
      canGenerateDatasets: false,
      canGenerateQueries: false,
      hasSourceInstructions: false,
      hasTools: false,
    },
  },

  backend: {
    ...protocol,
  },
};
```

Use Stripe as the branded API example:

- `server/sources/plugins/stripe.js`
- `server/sources/protocols/api.js`

Use Customer.io as the custom protocol example:

- `server/sources/plugins/customerio.js`
- `server/sources/protocols/customerio.js`
- `server/sources/protocols/customerioConnection.js`

### 2. Register the plugin

Update:

```txt
server/sources/index.js
```

Import the plugin and add it to the `sources` array. The registry validates required fields and exposes:

- `getSourceById(id)`
- `getSourceForConnection(connection)`
- `findSourceForConnection(connection)`
- `getSourceSummaries()`

### 3. Add or reuse a protocol module

Protocol modules live in:

```txt
server/sources/protocols/
```

A backend protocol can implement:

- `testConnection({ connection })`
- `testUnsavedConnection({ connection, extras })`
- `runDataRequest({ connection, dataRequest, chartId, getCache, filters, timezone, variables, auditContext })`
- `previewDataRequest({ connection, dataRequest, itemsLimit, items, offset, pagination, paginationField })`
- `getBuilderMetadata({ connection, dataRequest, options })`
- `actions`

Only implement what the source needs.

If the source has custom runtime behavior, keep it in `server/sources/protocols/<source>.js` or a sibling source-owned implementation file. Do not add new custom source methods to `ConnectionController`.

If the source only brands the API connector, reuse `server/sources/protocols/api.js`.

### 4. Move source-specific actions

For source-specific UI helper calls, expose actions from the plugin:

```js
const actions = {
  getAllSegments({ connection }) {
    return sourceImplementation.getAllSegments(connection);
  },
};

module.exports = {
  // ...
  capabilities: {
    // ...
    actions: Object.keys(actions),
  },
  backend: {
    ...protocol,
    actions,
  },
};
```

Actions are called through:

```txt
POST /team/:team_id/connections/:connection_id/source-action
```

Do not add new routes like `/helper/:method`. The route already:

- verifies token
- checks connection permissions
- resolves the source from the connection
- rejects actions not exposed by the plugin

### 5. Route backend execution through the registry

Migrate runtime dispatch by asking the registry first.

Current runtime dispatcher:

```txt
server/sources/runSourceDataRequest.js
```

Current callers:

- `server/controllers/DataRequestController.js`
- `server/controllers/DatasetController.js`

When migrating a source, make sure the source is handled by `source.backend.runDataRequest(...)` and remove any old fallback branch for that same source.

### 6. Route connection tests and previews through the plugin

Current route:

```txt
server/api/ConnectionRoute.js
```

The following paths should resolve migrated sources through plugin methods first:

- `GET /team/:team_id/connections/:connection_id/test`
- `POST /team/:team_id/connections/:type/test`
- `POST /team/:team_id/connections/:type/test/files`
- `POST /team/:team_id/connections/:connection_id/apiTest`
- `POST /team/:team_id/connections/:connection_id/source-action`

For branded API sources such as Stripe, `apiTest` should call `source.backend.previewDataRequest(...)` through the shared API protocol.

### 7. Move implementation ownership

When migrating a source, move source-specific runtime code out of shared controllers and into source-owned files.

Good:

```txt
server/sources/protocols/customerio.js
server/sources/protocols/customerioConnection.js
```

Avoid:

```txt
server/controllers/ConnectionController.js -> runCustomerio()
server/controllers/ConnectionController.js -> testCustomerio()
server/api/ConnectionRoute.js -> /helper/:method
```

Shared runtime utilities can live outside the source if they are genuinely reusable. Existing example:

```txt
server/modules/connectorRuntime.js
```

### 8. Add backend tests

Update or add tests in:

```txt
server/tests/unit/sourceRegistry.test.js
server/tests/integration/connectionRoute.security.test.js
```

Minimum coverage for a migrated source:

- registry resolves by `id`
- registry resolves from persisted connection shape
- source exposes expected backend methods
- runtime dispatcher returns a runner for migrated sources
- protected source actions reject unlisted actions
- project-scoped users cannot call source actions on restricted connections
- API preview/test routes use plugin hooks for migrated API sources

Run focused verification:

```sh
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run lint
```

## Frontend checklist

### 1. Add source definition metadata

Update:

```txt
client/src/sources/definitions.js
```

Add the source metadata, capabilities, assets, defaults, and templates:

```js
{
  id: "<sourceId>",
  type: "<connectionType>",
  subType: "<connectionSubType>",
  name: "<Display name>",
  category: "<category>",
  capabilities: {
    ai: { canGenerateQueries: false },
    templates: { charts: false },
    nextSteps: { chartTemplates: false },
  },
  assets: {
    lightLogo,
    darkLogo,
  },
}
```

Keep this file free of React component imports. Builders import defaults from this file, so component wiring belongs in `client/src/sources/index.js`.

### 2. Wire frontend components

Update:

```txt
client/src/sources/index.js
```

Add source-specific components:

```js
const FRONTEND_BY_SOURCE_ID = {
  <sourceId>: {
    ConnectionForm,
    DataRequestBuilder,
  },
};
```

Current registry-driven screens:

- `client/src/containers/Connections/ConnectionWizard.jsx`
- `client/src/containers/Dataset/DatasetQuery.jsx`
- `client/src/containers/AddChart/components/DatarequestModal.jsx`

Do not add new explicit form or builder branches to those screens.

### 3. Use source actions from UI

Use:

```js
runSourceAction({
  team_id,
  connection_id,
  action,
  params,
})
```

from:

```txt
client/src/slices/connection.js
```

Do not add new `runHelperMethod` thunks or route calls.

### 4. Use registry-first logos

For connection display logos, use:

```txt
client/src/modules/getConnectionLogo.js
```

This resolves the source registry logo first and falls back to the legacy `connectionImages(...)` map.

For source picker cards where the source object is already available, `getSourceLogo(source, isDark)` is fine.

### 5. Add or update frontend verification

Run:

```sh
cd client && npm run lint
cd client && npm run build
```

If you changed screens materially, test the relevant flow in the browser:

- connection creation
- connection edit
- dataset request builder opening existing requests
- data-request preview/run
- any source action dropdowns or resource pickers

## Template checklist

If the source ships built-in chart templates:

1. Add template files under:

   ```txt
   server/chartTemplates/<sourceId>/
   ```

2. Add template metadata to the backend plugin:

   ```js
   templates: {
     chartTemplates: ["template-id"],
     defaults: {
       dataRequest: DEFAULT_DATA_REQUEST,
     },
   }
   ```

3. Add frontend source metadata:

   ```js
   capabilities: {
     templates: { charts: true },
     nextSteps: { chartTemplates: true },
   },
   templates: {
     chartTemplates: ["template-id"],
   },
   defaults: {
     dataRequest: {},
   },
   ```

4. Ensure `ChartTemplateController` gets defaults from the source plugin, not controller-local constants.

## AI/orchestrator checklist

Do this after the source has backend runtime support.

Move hardcoded supported-source lists toward source capabilities in:

- `server/modules/ai/orchestrator/entityCreationRules.js`
- `server/modules/ai/orchestrator/tools/listConnections.js`
- `server/modules/ai/orchestrator/tools/getSchema.js`
- `server/modules/ai/orchestrator/orchestrator.js`

For query-generating sources, add source capabilities first, then route AI behavior from those capabilities.

## Cleanup checklist

Before considering a source migrated, search for old source-specific branches:

```sh
rg "<sourceId>|<Connection.type>|<Connection.subType>" server/controllers server/api client/src
```

Remove migrated-source branches from:

- `ConnectionController`
- `DataRequestController`
- `DatasetController`
- route-specific helper endpoints
- frontend builder/form switch statements
- one-off logo maps at display call sites

It is acceptable for generic protocol code to mention protocol names. For example, the shared API protocol can remain API-specific, and `paginateRequests.js` can keep template-specific pagination behavior until that is deliberately migrated.

## Verification checklist

Run at minimum:

```sh
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run lint
cd client && npm run lint
cd client && npm run build
```

Add source-specific focused tests when templates, protocol behavior, schema loading, or AI behavior are touched.
