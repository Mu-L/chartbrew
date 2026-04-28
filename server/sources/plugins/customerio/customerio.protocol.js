const request = require("request-promise");

const db = require("../../../models/models");
const drCacheController = require("../../../controllers/DataRequestCacheController");
const CustomerioConnection = require("./customerio.connection");
const { serializeResponsePreview } = require("../../../modules/updateAudit");
const {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
} = require("../../shared/connectorRuntime");

function getSavedConnection(connection) {
  if (!connection?.id) return Promise.resolve(connection);

  return db.Connection.findByPk(connection.id)
    .then((savedConnection) => savedConnection || connection)
    .catch(() => connection);
}

async function testCustomerio(connection) {
  const options = CustomerioConnection.getConnectionOpt(connection, {
    method: "GET",
    route: "activities"
  });
  options.json = true;

  return request(options);
}

function testConnection({ connection }) {
  return testCustomerio(connection)
    .then(() => ({ success: true }));
}

function testUnsavedConnection({ connection }) {
  return testCustomerio(connection);
}

async function runDataRequest({
  connection,
  dataRequest,
  getCache,
  auditContext = null,
}) {
  if (getCache) {
    const drCache = await checkAndGetCache(connection.id, dataRequest);
    if (drCache) {
      await completeConnectorAudit(auditContext, {
        cacheHit: true,
        connectionType: "customerio",
        ...serializeResponsePreview(drCache.responseData),
      });
      return drCache;
    }
  }

  const savedConnection = await getSavedConnection(connection);

  let routeType = "customers";
  if (dataRequest?.route?.indexOf("campaigns") === 0) {
    routeType = "campaigns";
  } else if (dataRequest?.route?.indexOf("activities") === 0) {
    routeType = "activities";
  }

  const routeFetchers = {
    customers: CustomerioConnection.getCustomers,
    campaigns: CustomerioConnection.getCampaignMetrics,
    activities: CustomerioConnection.getActivities,
  };
  const fetchRoute = routeFetchers[routeType];

  if (!fetchRoute) {
    await failConnectorAudit(auditContext, new Error("Unsupported Customer.io route"), "connection", {
      cacheHit: false,
      connectionType: "customerio",
      routeType,
    });
    return Promise.reject(404);
  }

  return fetchRoute(savedConnection, dataRequest)
    .then(async (responseData) => {
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
        connectionType: "customerio",
        routeType,
        ...serializeResponsePreview(dataToCache.responseData),
      });

      return dataToCache;
    })
    .catch(async (err) => {
      await failConnectorAudit(auditContext, err, err.auditStage || "connection", {
        cacheHit: false,
        connectionType: "customerio",
        routeType,
      });
      return Promise.reject(err);
    });
}

module.exports = {
  testCustomerio,
  testConnection,
  testUnsavedConnection,
  runDataRequest,
};
