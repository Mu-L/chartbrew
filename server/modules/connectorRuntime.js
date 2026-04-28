const _ = require("lodash");

const drCacheController = require("../controllers/DataRequestCacheController");
const {
  completeRun,
  failRun,
  finishEvent,
} = require("./updateAudit");

async function checkAndGetCache(connectionId, dataRequest) {
  try {
    const drCache = await drCacheController.findLast(dataRequest.id);
    const cachedDataRequest = { ...drCache.dataRequest };
    cachedDataRequest.updatedAt = "";
    cachedDataRequest.createdAt = "";
    delete cachedDataRequest.Connection;

    const liveDataRequest = dataRequest.toJSON ? dataRequest.toJSON() : { ...dataRequest };
    liveDataRequest.updatedAt = "";
    liveDataRequest.createdAt = "";
    delete liveDataRequest.Connection;

    if (_.isEqual(cachedDataRequest, liveDataRequest) && drCache.connection_id === connectionId) {
      return {
        responseData: drCache.responseData,
        dataRequest: drCache.dataRequest,
      };
    }
  } catch (e) {
    return false;
  }

  return false;
}

async function completeConnectorAudit(auditContext, payload = {}, summary = null) {
  if (!auditContext?.traceContext) {
    return;
  }

  const finalPayload = {
    ...(auditContext.requestMetadata || {}),
    ...payload,
  };

  if (auditContext.requestEvent) {
    await finishEvent(auditContext.traceContext, auditContext.requestEvent, "success", finalPayload);
  }

  await completeRun(auditContext.traceContext, {
    status: "success",
    payload: finalPayload,
    summary: summary || finalPayload,
  });
}

async function failConnectorAudit(auditContext, error, stage = "connection", payload = {}) {
  if (!auditContext?.traceContext) {
    return;
  }

  const wrappedError = error instanceof Error ? error : new Error(String(error));
  wrappedError.auditStage = wrappedError.auditStage || stage;

  const finalPayload = {
    ...(auditContext.requestMetadata || {}),
    ...payload,
  };

  if (auditContext.requestEvent) {
    await finishEvent(auditContext.traceContext, auditContext.requestEvent, "failed", {
      ...finalPayload,
      errorMessage: wrappedError.message,
    });
  }

  await failRun(auditContext.traceContext, wrappedError, {
    stage: wrappedError.auditStage || stage,
    payload: finalPayload,
    summary: finalPayload,
  });

  wrappedError.auditLogged = true;
}

module.exports = {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
};
