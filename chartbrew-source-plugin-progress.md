# Chartbrew source plugin progress

Last updated: May 1, 2026

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
  - `client/src/sources/postgres/postgres.source.js`
  - `client/src/sources/postgres/postgres-connection-form.jsx`
  - `client/src/sources/postgres/postgres-builder.jsx`
  - `client/src/sources/postgres/assets/*`
  - `client/src/sources/shared/sql/sql-builder.jsx`
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

## Completed in Postgres migration slice

- Added the backend Postgres source plugin:
  - `server/sources/plugins/postgres/postgres.plugin.js`
  - `server/sources/plugins/postgres/postgres.protocol.js`
- Moved Postgres connection testing, create-time schema loading, data-request execution, AI schema loading, and legacy chart SQL query execution into the Postgres source protocol.
- Updated runtime dispatch to pass processed SQL queries to migrated source plugins.
- Removed Postgres from legacy MySQL/Postgres fallback branches; MySQL stays on the legacy SQL path until its own plugin migration.
- Added source-local Postgres frontend files and assets:
  - `client/src/sources/postgres/postgres.source.js`
  - `client/src/sources/postgres/postgres-connection-form.jsx`
  - `client/src/sources/postgres/postgres-builder.jsx`
  - `client/src/sources/postgres/assets/*`
- Moved the shared SQL builder to:
  - `client/src/sources/shared/sql/sql-builder.jsx`

## Completed in shared SQL/Postgres cleanup slice

- Added a shared SQL backend folder for reusable SQL runtime code:
  - `server/sources/shared/sql/externalDbConnection.js`
  - `server/sources/shared/sql/sql.protocol.js`
- Copied `server/modules/externalDbConnection.js` into the shared SQL source folder for migrated plugins. The legacy module stays in place until MySQL is migrated.
- Refactored the Postgres protocol into a thin source-owned wrapper around the shared SQL protocol.
- Kept source ownership for Postgres-specific behavior by passing `connectionType: "postgres"` from `server/sources/plugins/postgres/postgres.protocol.js`.
- Added the first source-owned AI query hook shape for Postgres:
  - `backend.ai.getSchema`
  - `backend.ai.generateQuery`
- Updated `DataRequestController.askAi(...)` to use source AI hooks before falling back to the legacy MongoDB/ClickHouse/SQL generator switch.
- Formalized `prepareConnectionData(...)` as an optional backend plugin hook and validated AI query hooks for sources that declare `canGenerateQueries`.
- Added optional `dependsOn` validation so future variant plugins can explicitly depend on a base plugin such as Postgres.
- Added direct unit coverage that verifies processed SQL queries are passed through the Postgres plugin wrapper.

## Completed in MySQL migration slice

- Added backend MySQL source plugins:
  - `server/sources/plugins/mysql/mysql.plugin.js`
  - `server/sources/plugins/mysql/mysql.protocol.js`
  - `server/sources/plugins/rdsmysql/rdsmysql.plugin.js`
  - `server/sources/plugins/rdsmysql/rdsmysql.protocol.js`
- Kept RDS MySQL as its own variant plugin with `dependsOn: ["mysql"]`.
- Wired MySQL and RDS MySQL to the shared SQL runtime for:
  - saved connection tests
  - unsaved connection tests
  - create-time schema loading
  - data-request execution
  - chart query previews
  - AI query generation hooks
- Removed MySQL from legacy controller dispatch in:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
  - `server/controllers/ChartController.js`
- Updated AI orchestrator query execution to route migrated SQL sources through the source registry before falling back to MongoDB legacy execution.
- Removed the legacy SQL connector module:
  - `server/modules/externalDbConnection.js`
- Moved MySQL frontend files and assets into source-owned folders:
  - `client/src/sources/mysql/mysql.source.js`
  - `client/src/sources/mysql/mysql-connection-form.jsx`
  - `client/src/sources/mysql/mysql-builder.jsx`
  - `client/src/sources/mysql/assets/*`
  - `client/src/sources/rdsmysql/rdsmysql.source.js`
  - `client/src/sources/rdsmysql/assets/*`

## Completed in Postgres variants migration slice

- Added separate backend plugins for Postgres variants:
  - `server/sources/plugins/timescaledb/timescaledb.plugin.js`
  - `server/sources/plugins/timescaledb/timescaledb.protocol.js`
  - `server/sources/plugins/supabasedb/supabasedb.plugin.js`
  - `server/sources/plugins/supabasedb/supabasedb.protocol.js`
  - `server/sources/plugins/rdspostgres/rdspostgres.plugin.js`
  - `server/sources/plugins/rdspostgres/rdspostgres.protocol.js`
- Kept TimescaleDB, Supabase DB, and RDS Postgres as separate source plugins with `dependsOn: ["postgres"]`.
- Wired all three variants to the shared SQL runtime for tests, create-time schema loading, data-request execution, chart query previews, and AI query generation hooks.
- Moved variant frontend metadata/assets into source-owned folders:
  - `client/src/sources/timescaledb/*`
  - `client/src/sources/supabasedb/*`
  - `client/src/sources/rdspostgres/*`
- Added variant-local frontend form/builder wrappers that delegate to the existing Postgres form and shared SQL builder.
- Updated registry coverage for Postgres variant lookup and processed SQL query routing.

## Completed in MongoDB migration slice

- Added the backend MongoDB source plugin:
  - `server/sources/plugins/mongodb/mongodb.plugin.js`
  - `server/sources/plugins/mongodb/mongodb.protocol.js`
- Moved MongoDB connection testing, runtime data-request execution, chart query previews, schema refresh, create-time schema update queueing, and AI query generation hooks into the MongoDB source protocol.
- Updated connection creation and schema-refresh routing so MongoDB-specific post-create/update behavior resolves through the source plugin instead of `ConnectionController`.
- Removed MongoDB runtime/test/query-preview branches from:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
  - `server/controllers/ChartController.js`
  - `server/modules/ai/orchestrator/tools/runQuery.js`
- Moved MongoDB frontend files and assets into a source-owned folder:
  - `client/src/sources/mongodb/mongodb.source.js`
  - `client/src/sources/mongodb/mongodb-connection-form.jsx`
  - `client/src/sources/mongodb/mongodb-builder.jsx`
  - `client/src/sources/mongodb/assets/*`
- Updated registry and structure coverage for MongoDB source lookup and source-owned files.

## Completed in ClickHouse migration slice

- Added the backend ClickHouse source plugin:
  - `server/sources/plugins/clickhouse/clickhouse.plugin.js`
  - `server/sources/plugins/clickhouse/clickhouse.protocol.js`
  - `server/sources/plugins/clickhouse/clickhouse.connection.js`
  - `server/sources/plugins/clickhouse/clickhouse.client.js`
- Moved ClickHouse connection testing, create-time schema loading, data-request execution, chart query previews, and AI query generation hooks into the ClickHouse source protocol.
- Removed ClickHouse runtime/test/schema branches from:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
- Moved ClickHouse frontend files and assets into a source-owned folder:
  - `client/src/sources/clickhouse/clickhouse.source.js`
  - `client/src/sources/clickhouse/clickhouse-connection-form.jsx`
  - `client/src/sources/clickhouse/clickhouse-builder.jsx`
  - `client/src/sources/clickhouse/assets/*`
- Removed the legacy ClickHouse connector module folder from active imports:
  - `server/modules/clickhouse/*`
- Updated registry and structure coverage for ClickHouse source lookup, runtime query routing, and source-owned files.

## Completed in Firestore migration slice

- Added the backend Firestore source plugin:
  - `server/sources/plugins/firestore/firestore.plugin.js`
  - `server/sources/plugins/firestore/firestore.protocol.js`
  - `server/sources/plugins/firestore/firestore.connection.js`
- Moved Firestore connection testing, data-request execution, builder metadata, and response configuration merging into the Firestore source protocol.
- Removed Firestore runtime/test/builder-metadata branches from:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
- Moved Firestore frontend files and assets into a source-owned folder:
  - `client/src/sources/firestore/firestore.source.js`
  - `client/src/sources/firestore/firestore-connection-form.jsx`
  - `client/src/sources/firestore/firestore-builder.jsx`
  - `client/src/sources/firestore/assets/*`
- Updated registry and structure coverage for Firestore source lookup, runtime runner resolution, and source-owned files.

## Completed in RealtimeDB migration slice

- Added the backend RealtimeDB source plugin:
  - `server/sources/plugins/realtimedb/realtimedb.plugin.js`
  - `server/sources/plugins/realtimedb/realtimedb.protocol.js`
  - `server/sources/plugins/realtimedb/realtimedb.connection.js`
- Moved RealtimeDB connection testing, data-request execution, and builder metadata into the RealtimeDB source protocol.
- Removed RealtimeDB runtime/test/builder-metadata branches from:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
- Removed the now-unused legacy Firebase token helper:
  - `server/modules/firebaseConnector.js`
- Moved RealtimeDB frontend files and assets into a source-owned folder:
  - `client/src/sources/realtimedb/realtimedb.source.js`
  - `client/src/sources/realtimedb/realtimedb-connection-form.jsx`
  - `client/src/sources/realtimedb/realtimedb-builder.jsx`
  - `client/src/sources/realtimedb/assets/*`
- Updated registry and structure coverage for RealtimeDB source lookup, runtime runner resolution, and source-owned files.

## Completed in Google Analytics migration slice

- Added the backend Google Analytics source plugin:
  - `server/sources/plugins/googleAnalytics/googleAnalytics.plugin.js`
  - `server/sources/plugins/googleAnalytics/googleAnalytics.protocol.js`
  - `server/sources/plugins/googleAnalytics/googleAnalytics.connection.js`
- Moved Google Analytics connection testing, data-request execution, and builder metadata into the Google Analytics source protocol.
- Removed Google Analytics runtime/test/builder-metadata branches from:
  - `server/controllers/ConnectionController.js`
  - `server/controllers/DataRequestController.js`
  - `server/controllers/DatasetController.js`
- Moved the legacy Google connector implementation out of `server/modules` and into the source-owned plugin folder.
- Updated Google OAuth routes and the legacy dashboard template builder to import the source-owned Google Analytics connector.
- Moved Google Analytics frontend files and assets into a source-owned folder:
  - `client/src/sources/googleAnalytics/googleAnalytics.source.js`
  - `client/src/sources/googleAnalytics/googleAnalytics-connection-form.jsx`
  - `client/src/sources/googleAnalytics/googleAnalytics-builder.jsx`
  - `client/src/sources/googleAnalytics/googleAnalytics-template.jsx`
  - `client/src/sources/googleAnalytics/googleAnalytics-api.js`
  - `client/src/sources/googleAnalytics/assets/*`
- Updated registry and structure coverage for Google Analytics source lookup, runtime runner resolution, builder metadata, and source-owned files.

## Verification completed

Passed:

```sh
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/unit/stripeConnectionOptions.test.js tests/unit/chartTemplateLoader.test.js tests/integration/chartTemplateRoute.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/chartTemplateRoute.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/integration/connectionRoute.security.test.js tests/integration/chartTemplateRoute.test.js tests/unit/stripeConnectionOptions.test.js tests/unit/chartTemplateLoader.test.js
cd server && npm run test:run -- tests/unit/sourcePluginStructure.test.js tests/unit/sourceRegistry.test.js tests/integration/runtimeCache.test.js tests/integration/connectionRoute.security.test.js
cd server && npm run test:run -- tests/unit/chartTemplateLoader.test.js tests/integration/chartTemplateRoute.test.js
cd server && npm run test:run -- tests/unit/sqlProtocol.test.js tests/unit/sourceRegistry.test.js tests/unit/sourcePluginStructure.test.js tests/integration/runtimeCache.test.js
cd server && npm run test:run -- tests/unit/sourceRegistry.test.js tests/unit/sourcePluginStructure.test.js
cd client && npm run lint
cd server && npm run lint
cd client && npm run build
npm run test:run -- tests/unit/sourceRegistry.test.js tests/unit/sourcePluginStructure.test.js
npm run lint # from server
npm run lint # from client
npm run build # from client
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
- The backend registry currently contains Stripe, Customer.io, MongoDB, ClickHouse, Firestore, RealtimeDB, Postgres, TimescaleDB, Supabase DB, RDS Postgres, MySQL, and RDS MySQL.
- Stripe and Customer.io saved/unsaved connection tests now resolve through the source plugin first.
- Stripe and Customer.io runtime data-request execution now resolves through the source plugin first.
- Stripe delegates runtime data fetching, previews, connection tests, and builder metadata to the shared API protocol. This is intentional because Stripe has no custom behavior beyond branded defaults/templates right now.
- Replacing Stripe with a native protocol later should only require changing the Stripe plugin protocol wiring.
- Customer.io runtime/test implementation is source-owned in `server/sources/plugins/customerio/customerio.protocol.js`.
- Customer.io API implementation details are source-owned in `server/sources/plugins/customerio/customerio.connection.js`.
- There is no active Customer.io helper route in the backend. Current Customer.io builder components use the source-action endpoint.
- Connection display logos now resolve through the source registry first and fall back to the legacy `connectionImages(...)` map.
- Postgres runtime/test/schema behavior is source-owned in `server/sources/plugins/postgres/postgres.protocol.js`.
- Postgres now depends on the shared SQL source runtime instead of duplicating generic SQL connection/query/cache/audit code.
- MySQL runtime/test/schema behavior is source-owned in `server/sources/plugins/mysql/mysql.protocol.js`.
- MongoDB runtime/test/schema/query-preview behavior is source-owned in `server/sources/plugins/mongodb/mongodb.protocol.js`.
- ClickHouse runtime/test/schema/query-preview behavior is source-owned in `server/sources/plugins/clickhouse/clickhouse.protocol.js`.
- Firestore runtime/test/builder-metadata behavior is source-owned in `server/sources/plugins/firestore/firestore.protocol.js`.
- RealtimeDB runtime/test/builder-metadata behavior is source-owned in `server/sources/plugins/realtimedb/realtimedb.protocol.js`.
- RDS MySQL is a separate source plugin in `server/sources/plugins/rdsmysql` and depends on MySQL.
- TimescaleDB, Supabase DB, and RDS Postgres are separate source plugins and depend on Postgres.
- The legacy `server/modules/externalDbConnection.js` module has been removed. SQL connection handling now lives under `server/sources/shared/sql`.
- Keep SQL variants as separate plugins when they may need their own templates, defaults, AI harness, or UI, even if they delegate to the Postgres/shared SQL runtime.

## Next steps

1. Migrate remaining source plugins, keeping source-specific backend and frontend code in source-owned folders:
   - generic `api`
   - `strapi`
2. Replace the remaining `DataRequestController.getBuilderMetadata()` branches as each new source gets backend plugin coverage.
3. Move AI/orchestrator supported-source lists to source capabilities:
    - `server/modules/ai/orchestrator/entityCreationRules.js`
    - `server/modules/ai/orchestrator/tools/listConnections.js`
    - `server/modules/ai/orchestrator/tools/getSchema.js`
    - `server/modules/ai/orchestrator/orchestrator.js`
