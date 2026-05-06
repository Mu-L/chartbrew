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

function getDisabledUiSources() {
  return parseSourceList(import.meta.env?.VITE_DISABLED_UI_SOURCES);
}

export function applySourceAvailability(source) {
  const disabledUiSources = getDisabledUiSources();
  const canCreateConnections = !sourceMatchesList(source, disabledUiSources);

  return {
    ...source,
    availability: {
      ...source.availability,
      ui: {
        canCreateConnections,
        ...source.availability?.ui,
        ...(canCreateConnections ? {} : { canCreateConnections: false }),
      },
    },
  };
}

export function canCreateSourceConnections(source) {
  return source?.availability?.ui?.canCreateConnections !== false;
}
