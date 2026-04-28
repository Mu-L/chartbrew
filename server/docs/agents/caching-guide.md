# Caching Guide

## Cache Layers

- `chart-cache:*`
  - Redis
  - final chart payload for `chartId + chartVersion + viewerScope + chartVariantHash`
- `source-cache:*`
  - Redis
  - raw dataset/source payload for `datasetId + sourceVersion + viewerScope + sourceVariantHash`
- `runtime-cache:*`
  - Redis
  - registries and usage metadata for runtime cache entries
- `datarequest-cache:*`
  - Redis
  - legacy connector-level cache for a single `DataRequest`
- `ChartCache`
  - legacy chart preview/query cache
  - not part of the runtime filter cache

## Runtime Cache Rules

- Only server-meaningful runtime state is cacheable.
- Client-only state is excluded from runtime cache keys.
- Runtime-filtered results are not persisted back to `chart.chartData`.
- `getCache=true`
  - allows cache reads
- `getCache=false`
  - bypasses cache reads
  - fresh results may still refresh cache state

## Request Order

1. Build normalized runtime context.
2. Try `chart-cache`.
3. On miss, try `source-cache`.
4. On miss, run the connector, which may still use `datarequest-cache`.
5. Parse chart output.
6. Write `source-cache` and `chart-cache` when applicable.

## Key Distinction

- `chart-cache`
  - skips source fetch + parsing
- `source-cache`
  - skips source fetch only
- `datarequest-cache`
  - skips a single connector request only

## Invalidation Shape

- Runtime caches use versioned keys, so config/query changes move reads to new keys.
- `datarequest-cache` is keyed by `DataRequest` id and the live request shape check in `server/modules/connectorRuntime.js`.
