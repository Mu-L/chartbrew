const mongoose = require("mongoose");
const { Queue } = require("bullmq");

const db = require("../../../models/models");
const drCacheController = require("../../../controllers/DataRequestCacheController");
const assembleMongoUrl = require("../../../modules/assembleMongoUrl");
const validateMongoQuery = require("../../../modules/validateMongoQuery");
const { generateMongoQuery } = require("../../../modules/ai/generateMongoQuery");
const updateMongoSchemaWorker = require("../../../crons/workers/updateMongoSchema");
const { getQueueOptions } = require("../../../redisConnection");
const { serializeResponsePreview } = require("../../../modules/updateAudit");
const {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
} = require("../../shared/connectorRuntime");

const { ObjectId } = mongoose.Types;

function stringifyMongoIds(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  const valueType = typeof value;
  if (valueType !== "object") return value;

  if ((value instanceof ObjectId) || (value && value._bsontype === "ObjectId")) {
    return typeof value.toHexString === "function" ? value.toHexString() : String(value);
  }

  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => stringifyMongoIds(item, seen));
  }

  const result = {};
  Object.keys(value).forEach((key) => {
    result[key] = stringifyMongoIds(value[key], seen);
  });
  return result;
}

function getQueryToExecute(query) {
  if (typeof query !== "string" || query.trim().length === 0) {
    const error = new Error("MongoDB query is required");
    error.auditStage = "query";
    throw error;
  }

  let formattedQuery = query;
  if (formattedQuery.indexOf("connection.") === 0) {
    formattedQuery = formattedQuery.replace("connection.", "");
  }

  const validation = validateMongoQuery(formattedQuery);
  if (!validation.valid) {
    const error = new Error(`Invalid MongoDB query: ${validation.message}`);
    error.auditStage = "query";
    throw error;
  }

  return formattedQuery;
}

async function closeMongoConnection(mongoConnection) {
  if (!mongoConnection || typeof mongoConnection.close !== "function") {
    return;
  }

  try {
    await mongoConnection.close();
  } catch {
    // no-op
  }
}

async function getSavedConnection(connection) {
  if (!connection?.id) {
    return connection;
  }

  return db.Connection.findByPk(connection.id)
    .then((savedConnection) => savedConnection || connection)
    .catch(() => connection);
}

function getConnectionUrl(connection) {
  return assembleMongoUrl(connection);
}

async function createMongoConnection(connection, options = {}) {
  const savedConnection = await getSavedConnection(connection);
  const mongoConnection = mongoose.createConnection(getConnectionUrl(savedConnection), options);
  await mongoConnection.asPromise();
  return {
    savedConnection,
    mongoConnection,
  };
}

async function testConnection({ connection }) {
  let mongoConnection;

  try {
    const result = await createMongoConnection(connection);
    mongoConnection = result.mongoConnection;
    const collections = await mongoConnection.db.listCollections().toArray();

    return {
      success: true,
      collections,
    };
  } finally {
    await closeMongoConnection(mongoConnection);
  }
}

function testUnsavedConnection({ connection }) {
  return testConnection({ connection });
}

async function executeMongoQuery({ connection, query, connectTimeoutMS }) {
  let mongoConnection;
  const formattedQuery = getQueryToExecute(query);

  try {
    const result = await createMongoConnection(connection, { connectTimeoutMS });
    mongoConnection = result.mongoConnection;

    let data;
    try {
      data = await Function(`'use strict';return (mongoConnection, ObjectId) => mongoConnection.${formattedQuery}.toArray()`)()(mongoConnection, ObjectId); // eslint-disable-line
    } catch {
      data = await Function(`'use strict';return (mongoConnection, ObjectId) => mongoConnection.${formattedQuery}`)()(mongoConnection, ObjectId); // eslint-disable-line
    }

    let finalData = data;
    if (finalData && typeof finalData?.next === "function") {
      finalData = await finalData.toArray();
    }
    if (formattedQuery.indexOf("count(") > -1) {
      finalData = { count: finalData };
    }

    return stringifyMongoIds(finalData);
  } finally {
    await closeMongoConnection(mongoConnection);
  }
}

async function addSchemaUpdateJob(connectionId) {
  const connection = await db.Connection.findByPk(connectionId);

  if (!connection) {
    throw new Error("Connection not found");
  }

  if (connection.type !== "mongodb") {
    throw new Error("Connection is not a MongoDB connection");
  }

  const queue = new Queue("updateMongoDBSchemaQueue", getQueueOptions());
  const job = await queue.add(`update-mongo-schema-${connectionId}`, { connection_id: connectionId }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  });

  return job.waitUntilFinished(queue);
}

function afterConnectionCreated({ connection }) {
  return addSchemaUpdateJob(connection.id);
}

async function updateSchema({ connection }) {
  await updateMongoSchemaWorker({
    data: {
      connection_id: connection.id,
    },
  });

  return db.Connection.findByPk(connection.id);
}

async function getSchema({ connection }) {
  if (connection?.schema) {
    return connection.schema;
  }

  const updatedConnection = await updateSchema({ connection });
  return updatedConnection?.schema;
}

async function runDataRequest({
  connection,
  dataRequest,
  getCache,
  processedQuery = null,
  auditContext = null,
}) {
  if (getCache) {
    const drCache = await checkAndGetCache(connection.id, dataRequest);
    if (drCache) {
      await completeConnectorAudit(auditContext, {
        cacheHit: true,
        connectionType: "mongodb",
        ...serializeResponsePreview(drCache.responseData),
      });
      return drCache;
    }
  }

  try {
    const finalData = await executeMongoQuery({
      connection,
      query: processedQuery || dataRequest.query,
      connectTimeoutMS: 100000,
    });

    const dataToCache = {
      dataRequest,
      responseData: {
        data: finalData,
      },
      connection_id: connection.id,
    };

    await drCacheController.create(dataRequest.id, dataToCache);
    await completeConnectorAudit(auditContext, {
      cacheHit: false,
      connectionType: "mongodb",
      ...serializeResponsePreview(dataToCache.responseData),
    });

    addSchemaUpdateJob(connection.id).catch(() => {});

    return dataToCache;
  } catch (error) {
    await failConnectorAudit(auditContext, error, error.auditStage || "connection", {
      cacheHit: false,
      connectionType: "mongodb",
    });
    return Promise.reject(error);
  }
}

function runChartQuery({ connection, query }) {
  return executeMongoQuery({
    connection,
    query,
    connectTimeoutMS: 30000,
  });
}

function generateQuery({
  schema,
  question,
  conversationHistory,
  currentQuery,
}) {
  return generateMongoQuery(schema, question, conversationHistory, currentQuery);
}

module.exports = {
  addSchemaUpdateJob,
  afterConnectionCreated,
  generateQuery,
  getConnectionUrl,
  getQueryToExecute,
  getSchema,
  runChartQuery,
  runDataRequest,
  stringifyMongoIds,
  testConnection,
  testUnsavedConnection,
  updateSchema,
};
