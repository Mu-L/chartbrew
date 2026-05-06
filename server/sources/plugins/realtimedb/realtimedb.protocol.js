const db = require("../../../models/models");
const drCacheController = require("../../../controllers/DataRequestCacheController");
const { applyRealtimeDbVariables } = require("./realtimedb.variables");
const { serializeResponsePreview } = require("../../../modules/updateAudit");
const {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
} = require("../../shared/connectorRuntime");
const RealtimeDatabase = require("./realtimedb.connection");

function toPlainConnection(connection) {
  if (connection?.toJSON) {
    return connection.toJSON();
  }

  if (connection?.get) {
    return connection.get({ plain: true });
  }

  return connection;
}

function normalizeConnection(connection) {
  const parsedConnection = { ...toPlainConnection(connection) };

  if (typeof parsedConnection.firebaseServiceAccount !== "object") {
    try {
      parsedConnection.firebaseServiceAccount = JSON.parse(parsedConnection.firebaseServiceAccount);
    } catch {
      throw new Error("The authentication JSON is not formatted correctly.");
    }
  } else if (!parsedConnection.firebaseServiceAccount) {
    throw new Error("The firebase authentication is missing");
  }

  return parsedConnection;
}

async function getSavedConnection(connection) {
  if (!connection?.id) {
    return connection;
  }

  return db.Connection.findByPk(connection.id)
    .then((savedConnection) => savedConnection || connection)
    .catch(() => connection);
}

function createRealtimeDatabase(connection, dataRequestId) {
  return new RealtimeDatabase(normalizeConnection(connection), dataRequestId);
}

async function testConnection({ connection }) {
  const realtimeDatabase = createRealtimeDatabase(connection);
  if (realtimeDatabase.db) {
    return "Connection successful";
  }

  throw new Error("Could not connect to the database. Please check if the Service Account details are correct.");
}

function testUnsavedConnection({ connection }) {
  return testConnection({ connection });
}

async function getBuilderMetadata({ connection }) {
  const savedConnection = normalizeConnection(await getSavedConnection(connection));
  return {
    connectionString: savedConnection.connectionString || "",
    projectId: savedConnection.firebaseServiceAccount?.project_id || "",
  };
}

async function runDataRequest({
  connection,
  dataRequest,
  getCache,
  variables = {},
  processedDataRequest = null,
  auditContext = null,
}) {
  if (getCache) {
    const drCache = await checkAndGetCache(connection.id, dataRequest);
    if (drCache) {
      await completeConnectorAudit(auditContext, {
        cacheHit: true,
        connectionType: "realtimedb",
        ...serializeResponsePreview(drCache.responseData),
      });
      return drCache;
    }
  }

  try {
    const savedConnection = await getSavedConnection(connection);
    const realtimeDatabase = createRealtimeDatabase(savedConnection, dataRequest.id);

    let dataRequestToRun = processedDataRequest || dataRequest;
    if (!processedDataRequest && dataRequest.VariableBindings && dataRequest.VariableBindings.length > 0) {
      const dataRequestWithConnection = {
        ...JSON.parse(JSON.stringify(dataRequest)),
        Connection: savedConnection,
      };
      const result = applyRealtimeDbVariables(dataRequestWithConnection, variables);
      dataRequestToRun = result.processedDataRequest || result.dataRequest || dataRequest;
    }

    const responseData = await realtimeDatabase.getData(dataRequestToRun);
    const dataToCache = {
      dataRequest,
      responseData: {
        data: responseData,
      },
      connection_id: savedConnection.id,
    };

    await drCacheController.create(dataRequest.id, dataToCache);
    await completeConnectorAudit(auditContext, {
      cacheHit: false,
      connectionType: "realtimedb",
      ...serializeResponsePreview(dataToCache.responseData),
    });

    return dataToCache;
  } catch (error) {
    await failConnectorAudit(auditContext, error, error.auditStage || "connection", {
      cacheHit: false,
      connectionType: "realtimedb",
    });
    return Promise.reject(error);
  }
}

module.exports = {
  applyVariables({ dataRequest, variables }) {
    return applyRealtimeDbVariables(dataRequest, variables);
  },
  createRealtimeDatabase,
  getBuilderMetadata,
  getSavedConnection,
  normalizeConnection,
  runDataRequest,
  testConnection,
  testUnsavedConnection,
  toPlainConnection,
};
