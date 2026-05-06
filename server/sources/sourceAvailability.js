const SOURCE_DISABLED_ERROR_CODE = "SOURCE_DISABLED";

class SourceDisabledError extends Error {
  constructor(source) {
    const sourceName = source?.name || source?.id || "Unknown source";
    super(`${sourceName} is disabled on this server.`);
    this.name = "SourceDisabledError";
    this.code = SOURCE_DISABLED_ERROR_CODE;
    this.sourceId = source?.id || null;
    this.statusCode = 400;
  }
}

function parseSourceList(value) {
  if (!value) return new Set();

  return new Set(
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function sourceMatchesList(source, sourceIds) {
  return [source?.id, source?.type, source?.subType]
    .filter(Boolean)
    .some((id) => sourceIds.has(id));
}

function applySourceAvailability(source, env = process.env) {
  const disabledServerSources = parseSourceList(env.CB_DISABLED_SERVER_SOURCES);
  const serverEnabled = !sourceMatchesList(source, disabledServerSources);

  return {
    ...source,
    availability: {
      ...source.availability,
      server: {
        enabled: serverEnabled,
        ...source.availability?.server,
        ...(serverEnabled ? {} : { enabled: false }),
      },
    },
  };
}

function isSourceServerEnabled(source, env = process.env) {
  const disabledServerSources = parseSourceList(env.CB_DISABLED_SERVER_SOURCES);
  if (sourceMatchesList(source, disabledServerSources)) {
    return false;
  }

  return source?.availability?.server?.enabled !== false;
}

function assertSourceServerEnabled(source, env = process.env) {
  if (!isSourceServerEnabled(source, env)) {
    throw new SourceDisabledError(source);
  }
}

function isSourceDisabledError(error) {
  return error?.code === SOURCE_DISABLED_ERROR_CODE;
}

function serializeSourceDisabledError(error) {
  if (!isSourceDisabledError(error)) return null;

  return {
    code: error.code,
    sourceId: error.sourceId,
    message: error.message,
  };
}

module.exports = {
  SourceDisabledError,
  applySourceAvailability,
  assertSourceServerEnabled,
  isSourceDisabledError,
  isSourceServerEnabled,
  parseSourceList,
  serializeSourceDisabledError,
};
