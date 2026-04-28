# Chartbrew source plugin progress

Last updated: April 28, 2026

## Current branch

`connection-plugins`

## Implementation guide

Use [`source-plugin-guide.md`](./source-plugin-guide.md) as the exact checklist for adding or migrating sources.

## Completed in first implementation slice

- Added backend source registry:
  - `server/sources/index.js`
  - `server/sources/validateSourcePlugin.js`
  - `server/sources/plugins/stripe/stripe.plugin.js`
- Added shared backend API protocol module:
  - `server/sources/shared/protocols/api.protocol.js`
- Added a Stripe backend source plugin with:
  - `id: "stripe"`
  - `type: "api"`
  - `subType: "stripe"`
  - source capabilities
  - chart-template data request defaults
  - delegated API execution/test/metadata methods
- Updated `server/controllers/ChartTemplateController.js` so Stripe chart-template data request defaults come from the source plugin instead of a controller-level `DEFAULT_STRIPE_DATA_REQUEST`.
- Updated `server/controllers/DataRequestController.js` so migrated source plugins can provide builder metadata before falling back to the existing type switch.
- Added frontend source registry:
  - `client/src/sources/index.js`
  - `client/src/sources/definitions.js`
- Moved connection picker metadata into the frontend registry. Migrated sources now keep metadata in source-local modules, while `definitions.js` remains a legacy bridge for unmigrated sources.
- Kept `client/src/modules/availableConnections.js` as a compatibility shim that derives from the registry for existing imports.
- Updated `client/src/containers/Connections/ConnectionWizard.jsx` so:
  - source cards come from the registry
  - logos come from source assets
  - connection forms resolve through `source.frontend.ConnectionForm`
  - the old explicit form branches were removed
- Updated `client/src/containers/Connections/ConnectionNextSteps.jsx` so Stripe template setup is capability-driven instead of checking `connection.subType === "stripe"`.
- Updated `client/src/containers/AddChart/components/ApiBuilder.jsx` so Stripe API request defaults come from source metadata instead of detecting `api.stripe.com`.
- Updated `client/src/containers/Dataset/DatasetQuery.jsx` so data request builders resolve through `source.frontend.DataRequestBuilder` instead of explicit `Connection.type` branches.
- Added backend unit coverage in `server/tests/unit/sourceRegistry.test.js`.

## Completed in second implementation slice

- Added a backend Customer.io source plugin:
  - `server/sources/plugins/customerio/customerio.plugin.js`
  - `id: "customerio"`
  - `type: "customerio"`
  - `subType: "customerio"`
  - source capabilities
  - an explicit source-action allowlist
- Registered Customer.io in the backend source registry.
- Added a generic plugin action route:
  - `POST /team/:team_id/connections/:connection_id/source-action`
- Kept the existing Customer.io helper route in place for compatibility.
- Moved the active Customer.io Redux thunk path to the new source-action endpoint while keeping the existing `runHelperMethod(...)` function name for current component imports.
- Added `runSourceAction(...)` as the forward-facing Redux thunk for new source-action callers.
- Added route security coverage for source actions:
  - allows exposed actions for project-scoped connections the user can access
  - rejects actions not exposed by the source plugin
  - rejects source actions for same-team connections outside the caller's assigned projects
- Extended backend source registry unit coverage for Customer.io.

## Completed in third implementation slice

- Added a Customer.io backend protocol module:
  - `server/sources/plugins/customerio/customerio.protocol.js`
- Wired the Customer.io source plugin to own:
  - saved connection tests
  - unsaved connection tests
  - runtime data-request execution
  - source actions
- Added a shared source runtime dispatcher:
  - `server/sources/runSourceDataRequest.js`
- Updated runtime data-request execution so migrated source plugins are tried before the old connection-type switch:
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
- Updated connection test routes so migrated source plugins are tried before `ConnectionController` fallback:
  - `GET /team/:team_id/connections/:connection_id/test`
  - `POST /team/:team_id/connections/:type/test`
  - `POST /team/:team_id/connections/:type/test/files`
- Moved the older chart `DatarequestModal.jsx` builder and logo resolution to the frontend source registry.
- Updated active Customer.io builder components to call `runSourceAction(...)` instead of `runHelperMethod(...)`.
- Removed the unused slice-level `runHelperMethod(...)` compatibility thunk from `client/src/slices/connection.js`.
- Removed the legacy Customer.io helper route:
  - `POST /team/:team_id/connections/:connection_id/helper/:method`
- Removed the unused legacy helper action from `client/src/actions/connection.js`.
- Moved Customer.io runtime/test ownership out of `ConnectionController` and into `server/sources/plugins/customerio/customerio.protocol.js`.
- Removed Customer.io branches from `ConnectionController`, `DataRequestController`, and `DatasetController` fallback switches.
- Extracted shared connector cache/audit helpers into:
  - `server/sources/shared/connectorRuntime.js`
- Extended source registry unit tests for:
  - Customer.io runtime methods
  - migrated source runner resolution for Stripe and Customer.io
  - fallback behavior for non-migrated generic API connections

## Completed in final Stripe/Customer.io closeout

- Kept Stripe on the shared API protocol; no native Stripe protocol was added.
- Updated `apiTest` so migrated API sources can provide preview behavior before the generic API fallback.
- Added route coverage that verifies Stripe API previews use the source plugin hook.
- Moved the Customer.io implementation module from `server/connections` into the source tree:
  - `server/sources/plugins/customerio/customerio.connection.js`
- Updated Customer.io source actions, runtime methods, and tests to use the source-owned implementation module.
- Added a frontend connection logo helper:
  - `client/src/modules/getConnectionLogo.js`
- Replaced remaining direct connection display logo lookups with registry-first logo resolution and old `connectionImages(...)` fallback.
- Standardized source-specific filenames:
  - backend source files use `<source>.<role>.js`, such as `customerio.protocol.js`
  - frontend source UI files use `<source>-<role>.jsx`, such as `customerio-builder.jsx`
- Moved migrated frontend source UI into source-owned folders:
  - `client/src/sources/stripe/stripe.source.js`
  - `client/src/sources/stripe/stripe-connection-form.jsx`
  - `client/src/sources/stripe/assets/*`
  - `client/src/sources/customerio/customerio.source.js`
  - `client/src/sources/customerio/customerio-connection-form.jsx`
  - `client/src/sources/customerio/customerio-builder.jsx`
  - `client/src/sources/customerio/customerio-*-query.jsx`
  - `client/src/sources/customerio/assets/*`
- Moved Stripe chart templates into the Stripe plugin folder:
  - `server/sources/plugins/stripe/templates/core-revenue.json`
- Moved the shared chart-template loader to `server/sources/shared/templates/chartTemplateLoader.js`.
- Updated chart-template loading so built-in chart templates are discovered from registered source plugins.

## Verification completed

Passed:

```sh
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/unit/stripeConnectionOptions.test.js tests/unit/chartTemplateLoader.test.js tests/integration/chartTemplateRoute.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/chartTemplateRoute.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js tests/integration/chartTemplateRoute.test.js tests/unit/stripeConnectionOptions.test.js tests/unit/chartTemplateLoader.test.js
cd client && npm run lint
cd server && npm run lint
cd client && npm run build
```

Notes:

- `client` build completed successfully.
- Vite reported the existing large chunk warnings.
- No new lint errors were introduced.

## Important implementation notes

- Stripe still persists as `type: "api"` and `subType: "stripe"`.
- Stripe still delegates runtime data fetching to the existing API execution path.
- The public call sites now resolve source-owned metadata/defaults before falling back to generic API behavior.
- This keeps a future native Stripe protocol possible without making the UI/template code depend on `Connection.type === "api"`.
- The frontend registry currently contains all picker and dataset-builder sources, not only Stripe, because `ConnectionWizard` and `DatasetQuery` need one source of truth for components.
- Frontend source definitions were split from component wiring so shared defaults can be imported by builders without circular imports.
- The backend registry currently contains Stripe and Customer.io.
- Stripe and Customer.io saved/unsaved connection tests now resolve through the source plugin first.
- Stripe and Customer.io runtime data-request execution now resolves through the source plugin first.
- Stripe delegates runtime data fetching, previews, connection tests, and builder metadata to the shared API protocol. This is intentional because Stripe has no custom behavior beyond branded defaults/templates right now.
- Replacing Stripe with a native protocol later should only require changing the Stripe plugin protocol wiring.
- Customer.io runtime/test implementation is source-owned in `server/sources/plugins/customerio/customerio.protocol.js`.
- Customer.io API implementation details are source-owned in `server/sources/plugins/customerio/customerio.connection.js`.
- There is no active Customer.io helper route in the backend. Current Customer.io builder components use the source-action endpoint.
- Connection display logos now resolve through the source registry first and fall back to the legacy `connectionImages(...)` map.

## Next steps

1. Start the next source migration. PostgreSQL remains the best candidate because it exercises schema support, SQL query execution, and AI query generation.
2. Replace the remaining `DataRequestController.getBuilderMetadata()` branches as each new source gets backend plugin coverage.
3. Move AI/orchestrator supported-source lists to source capabilities:
    - `server/modules/ai/orchestrator/entityCreationRules.js`
    - `server/modules/ai/orchestrator/tools/listConnections.js`
    - `server/modules/ai/orchestrator/tools/getSchema.js`
    - `server/modules/ai/orchestrator/orchestrator.js`

## Suggested next source after Stripe

PostgreSQL is the best next source after Stripe because it exercises:

- schema support
- query support
- AI query generation support
- shared SQL protocol behavior

Do not migrate generic `api` next unless the explicit goal is to create the shared API protocol module. `api` is a base execution protocol for several branded sources and is broader than one source migration.
