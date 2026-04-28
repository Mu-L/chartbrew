function validateSourcePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Source plugin must be an object");
  }

  if (!plugin.id || typeof plugin.id !== "string") {
    throw new Error("Source plugin is missing id");
  }

  if (!plugin.type || typeof plugin.type !== "string") {
    throw new Error(`Source plugin ${plugin.id} is missing type`);
  }

  if (!plugin.name || typeof plugin.name !== "string") {
    throw new Error(`Source plugin ${plugin.id} is missing name`);
  }

  if (!plugin.capabilities || typeof plugin.capabilities !== "object") {
    throw new Error(`Source plugin ${plugin.id} is missing capabilities`);
  }

  if (!plugin.backend || typeof plugin.backend !== "object") {
    throw new Error(`Source plugin ${plugin.id} is missing backend`);
  }

  return plugin;
}

module.exports = validateSourcePlugin;
