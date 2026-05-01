const db = require("../../../models/models");
const drCacheController = require("../../../controllers/DataRequestCacheController");
const { applyVariables } = require("../../../modules/applyVariables");
const { serializeResponsePreview } = require("../../../modules/updateAudit");
const {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
} = require("../../shared/connectorRuntime");
const FirestoreConnection = require("./firestore.connection");

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

function createFirestoreConnection(connection, dataRequestId) {
  return new FirestoreConnection(normalizeConnection(connection), dataRequestId);
}

async function listCollections({ connection, dataRequestId }) {
  const firestore = createFirestoreConnection(connection, dataRequestId);
  return firestore.listCollections();
}

async function testConnection({ connection }) {
  return listCollections({ connection });
}

function testUnsavedConnection({ connection }) {
  return testConnection({ connection });
}

async function getBuilderMetadata({ connection, dataRequest }) {
  const savedConnection = await getSavedConnection(connection);
  const collections = await listCollections({
    connection: savedConnection,
    dataRequestId: `builder_meta_${savedConnection.id || dataRequest?.id || "unsaved"}`,
  });
  return { collections };
}

async function mergeResponseConfiguration(dataRequest, responseData) {
  if (!responseData?.configuration) {
    return dataRequest;
  }

  const configuration = {
    ...(dataRequest.configuration || {}),
    ...responseData.configuration,
  };

  await db.DataRequest.update(
    { configuration },
    { where: { id: dataRequest.id } }
  );

  return {
    ...dataRequest,
    configuration,
  };
}

async function runDataRequest({
  connection,
  dataRequest,
  getCache,
  variables = {},
  auditContext = null,
}) {
  if (getCache) {
    const drCache = await checkAndGetCache(connection.id, dataRequest);
    if (drCache) {
      drCache.dataRequest = await mergeResponseConfiguration(
        drCache.dataRequest || dataRequest,
        drCache.responseData
      );
      await completeConnectorAudit(auditContext, {
        cacheHit: true,
        connectionType: "firestore",
        ...serializeResponsePreview(drCache.responseData),
      });
      return drCache;
    }
  }

  try {
    const savedConnection = await getSavedConnection(connection);
    const firestoreConnection = createFirestoreConnection(savedConnection, dataRequest.id);

    let processedDataRequest = dataRequest;
    if (dataRequest.VariableBindings && dataRequest.VariableBindings.length > 0) {
      const dataRequestWithConnection = {
        ...JSON.parse(JSON.stringify(dataRequest)),
        Connection: savedConnection,
      };
      const result = applyVariables(dataRequestWithConnection, variables);
      processedDataRequest = result.processedDataRequest || result.dataRequest || dataRequest;
    }

    const responseData = await firestoreConnection.get(processedDataRequest);
    const dataRequestToCache = await mergeResponseConfiguration(dataRequest, responseData);

    const dataToCache = {
      dataRequest: dataRequestToCache,
      responseData,
      connection_id: savedConnection.id,
    };

    await drCacheController.create(dataRequest.id, dataToCache);
    await completeConnectorAudit(auditContext, {
      cacheHit: false,
      connectionType: "firestore",
      ...serializeResponsePreview(dataToCache.responseData),
    });

    return dataToCache;
  } catch (error) {
    await failConnectorAudit(auditContext, error, error.auditStage || "connection", {
      cacheHit: false,
      connectionType: "firestore",
    });
    return Promise.reject(error);
  }
}

module.exports = {
  createFirestoreConnection,
  getBuilderMetadata,
  getSavedConnection,
  listCollections,
  mergeResponseConfiguration,
  normalizeConnection,
  runDataRequest,
  toPlainConnection,
  testConnection,
  testUnsavedConnection,
};
