# FS-20260415-filter-aware-runtime-cache-progress

## Goal
Add filter-aware Redis-backed runtime caching for dashboard chart loads so Chartbrew can reuse meaningful filtered states, avoid the unfiltered-first flash, and prewarm commonly used variants during dashboard auto-update.

## Scope
In scope for this pass:
- Server-side runtime filter classification and canonical hashing
- Redis-backed chart-result cache for runtime-filtered chart responses
- Redis-backed source/dataset cache keyed only by source-affecting runtime inputs
- Runtime cache metadata on filtered chart responses (`cacheStatus`, `variantHash`, `stale`)
- Variant usage tracking and dashboard auto-update prewarming
- Client dashboard boot changes to fetch filtered runtime state before showing charts when filters are already active
- Unit/integration coverage for runtime hashing/classification and cache hit behavior

Out of scope for this pass:
- Removing legacy file-backed `ChartCache` / `DataRequestCache`
- New dashboard batch runtime endpoint
- Applying the new runtime cache model to out-of-scope legacy surfaces noted in `server/docs/agents/filtering-guide.md`

## Progress
- [x] Runtime filter normalization extended with classified payload buckets and stable source/chart hashes (`server/modules/chartRuntimeFilters.js`)
- [x] Redis-backed runtime cache service added with:
  - versioned chart/source keys
  - TTL + stale window support
  - in-memory fallback for tests/no-Redis environments
  - variant usage tracking and top-variant lookup
  - single-flight request collapsing (`server/modules/runtimeCache.js`)
- [x] `ChartController.updateChartData()` integrated with runtime chart cache reads/writes, stale-while-revalidate behavior, and response metadata (`server/controllers/ChartController.js`)
- [x] `DatasetController.runRequest()` integrated with runtime source cache reads/writes for source-affecting filter subsets (`server/controllers/DatasetController.js`)
- [x] Dashboard auto-update worker extended to prewarm top tracked runtime variants after the default refresh (`server/crons/workers/updateDashboard.js`)
- [x] Client runtime payload builder updated to mirror server cacheable payload semantics (`client/src/modules/chartRuntimeFilters.js`)
- [x] Private dashboard initial load now blocks on runtime hydration when saved dashboard/chart filters are active, preventing the default-data flash (`client/src/containers/ProjectDashboard/ProjectDashboard.jsx`)
- [x] Public dashboard/report initial load now blocks on runtime hydration when dashboard filters are active (`client/src/containers/PublicDashboard/PublicDashboard.jsx`, `client/src/containers/PublicDashboard/Report.jsx`)
- [x] Added integration coverage for chart-result cache hits and source-cache reuse plus unit coverage for classification/hash stability (`server/tests/integration/runtimeCache.test.js`, `server/tests/unit/chartRuntimeFilters.test.js`, `server/tests/unit/clientChartRuntimeFilters.test.js`)

## Implementation notes
- Chart-result cache keys use chart id + chart config fingerprint + normalized cacheable runtime payload hash.
- Source cache keys use dataset id + dataset/source fingerprint + normalized source-affecting runtime payload hash.
- Current server classification defaults:
  - variables => source-affecting
  - dashboard date filters => source-affecting
  - dashboard field filters => server-parse-affecting
  - chart-local exposed filters => server-parse-affecting
  - explicit UI-only filter types such as pagination/sort/view => client-only
- Runtime-filtered responses are cached in Redis but still do not overwrite the default persisted `chart.chartData`.
- `refresh=true` continues to bypass cache reads, but regenerated runtime variants are written back into the runtime cache.
- Usage/prewarm is chart-scoped, not dashboard-scoped, for this first pass.

## Compatibility notes
- Existing chart filter routes and client request shapes are unchanged.
- Default chart persistence in MySQL remains intact for compatibility.
- Legacy file-backed caches still exist and continue to back non-runtime/default flows where already used.
- Runtime-filtered responses may now include `cacheStatus`, `variantHash`, and `stale`; these are additive.

## Verification
- [x] `cd chartbrew-os/server && npm run test:run -- tests/unit/chartRuntimeFilters.test.js tests/unit/clientChartRuntimeFilters.test.js tests/integration/chartController.cdcBindings.test.js tests/integration/runtimeCache.test.js`
- [x] `cd chartbrew-os/server && npm run lint`

## Follow-up
- Validate runtime cache behavior against a real Redis instance in a non-test environment.
- Decide when to retire or de-emphasize legacy file-backed chart/data-request cache paths.
- Consider a dashboard batch runtime endpoint if per-chart runtime requests become a bottleneck.
