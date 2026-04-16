const runtimeCache = require("../modules/runtimeCache");

const CACHE_PREFIX = "datarequest-cache";
const CACHE_SCHEMA_VERSION = runtimeCache.RUNTIME_CACHE_CONFIG?.cacheSchemaVersion || "1";

const cacheKey = (drId) => `${CACHE_PREFIX}:v${CACHE_SCHEMA_VERSION}:${drId}`;

const deserialize = (rawValue) => {
  if (!rawValue) return false;

  if (typeof rawValue === "string") {
    return JSON.parse(rawValue);
  }

  return rawValue;
};

const findLast = async (drId, includeData = true) => {
  try {
    const rawValue = await runtimeCache.store.get(cacheKey(drId));
    const cacheValue = deserialize(rawValue);

    if (!cacheValue) {
      return false;
    }

    if (!includeData) {
      return {
        dr_id: drId,
        createdAt: cacheValue.createdAt,
      };
    }

    return cacheValue;
  } catch (_error) {
    return false;
  }
};

const update = async (data, drId) => {
  try {
    const cacheValue = {
      ...data,
      dr_id: drId,
      createdAt: data?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await runtimeCache.store.set(cacheKey(drId), JSON.stringify(cacheValue));
    return findLast(drId);
  } catch (error) {
    return Promise.reject(error);
  }
};

const create = async (drId, data) => {
  return update(data, drId);
};

const remove = async (drId) => {
  try {
    await runtimeCache.store.del(cacheKey(drId));
    return true;
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  create,
  findLast,
  update,
  remove,
};
