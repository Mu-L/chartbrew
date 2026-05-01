const querystring = require("querystring");
const moment = require("moment");
const fs = require("fs");

const db = require("../models/models");
const ProjectController = require("./ProjectController");
const paginateRequests = require("../modules/paginateRequests");
const safeRequest = require("../modules/safeRequest");
const googleConnector = require("../modules/googleConnector");
const oauthController = require("./OAuthController");
const determineType = require("../modules/determineType");
const drCacheController = require("./DataRequestCacheController");
const { applyApiVariables } = require("../modules/applyVariables");
const { buildChartRuntimeContext } = require("../modules/chartRuntimeFilters");
const {
  getItemCount,
  sanitizeSnippet,
  serializeResponsePreview,
} = require("../modules/updateAudit");
const {
  checkAndGetCache,
  completeConnectorAudit,
  failConnectorAudit,
} = require("../sources/shared/connectorRuntime");

const getMomentObj = (timezone) => {
  if (timezone) {
    return (...args) => moment(...args).tz(timezone);
  } else {
    return (...args) => moment.utc(...args);
  }
};

function buildApiPolicyContext(source, connection, overrides = {}) {
  const context = {
    source,
    teamId: overrides.teamId || connection?.team_id || null,
    connectionId: overrides.connectionId || connection?.id || null,
  };

  if (typeof overrides.allowPrivateHost === "boolean") {
    context.allowPrivateHost = overrides.allowPrivateHost;
  } else if (overrides.allowPrivateHost === null) {
    context.allowPrivateHost = null;
  } else if (typeof connection?.allowPrivateHost === "boolean") {
    context.allowPrivateHost = connection.allowPrivateHost;
  } else {
    context.allowPrivateHost = null;
  }

  return context;
}

function isArrayPresent(responseData) {
  let arrayFound = false;
  Object.keys(responseData).forEach((k1) => {
    if (determineType(responseData[k1]) === "array") {
      arrayFound = true;
    }

    if (!arrayFound && determineType(responseData[k1]) === "object") {
      Object.keys(responseData[k1]).forEach((k2) => {
        if (determineType(responseData[k1][k2]) === "array") {
          arrayFound = true;
        }

        if (!arrayFound && determineType(responseData[k1][k2]) === "object") {
          Object.keys(responseData[k1][k2]).forEach((k3) => {
            if (determineType(responseData[k1][k2][k3]) === "array") {
              arrayFound = true;
            }
          });
        }
      });
    }
  });

  return arrayFound;
}

class ConnectionController {
  constructor() {
    this.projectController = new ProjectController();
  }

  findAll() {
    return db.Connection.findAll({
      attributes: { exclude: ["dbName", "password", "username", "options", "port", "host", "sslCa", "sslCert", "sslKey"] },
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
    })
      .then((connections) => {
        return Promise.resolve(connections);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  findById(id) {
    return db.Connection.findByPk(id, {
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
    })
      .then((connection) => {
        if (!connection) {
          return new Promise((resolve, reject) => reject(new Error(404)));
        }
        return connection;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  findByIdAndTeam(id, teamId) {
    return db.Connection.findOne({
      where: { id, team_id: teamId },
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
    })
      .then((connection) => {
        if (!connection) {
          return new Promise((resolve, reject) => reject(new Error(404)));
        }
        return connection;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  findByTeam(teamId) {
    return db.Connection.findAll({
      where: { team_id: teamId },
      attributes: { exclude: ["password", "schema"] },
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
      order: [["createdAt", "DESC"]],
    })
      .then((connections) => {
        return connections;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  findByProject(projectId) {
    return db.Connection.findAll({
      where: { project_id: projectId },
      attributes: { exclude: ["password"] },
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
    })
      .then((connections) => {
        return connections;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  findByProjects(teamId, projects) {
    return db.Connection.findAll({
      where: { team_id: teamId },
      attributes: { exclude: ["password"] },
      include: [{ model: db.OAuth, attributes: { exclude: ["refreshToken"] } }],
      order: [["createdAt", "DESC"]],
    })
      .then((connections) => {
        const filteredConnections = connections.filter((connection) => {
          if (!connection.project_ids) return false;
          return connection.project_ids.some((projectId) => {
            return projects.includes(projectId);
          });
        });

        return filteredConnections;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  async create(data) {
    const dataToSave = { ...data };

    if (!data.type) data.type = "mongodb"; // eslint-disable-line

    return db.Connection.create(dataToSave)
      .then((connection) => connection)
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  update(id, data) {
    return db.Connection.update(data, { where: { id } })
      .then(() => {
        return this.findById(id);
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  async removeConnection(id, removeDatasets) {
    if (removeDatasets) {
      try {
        const drs = await db.DataRequest.findAll({ where: { connection_id: id } });
        const datasetIds = drs.map((dr) => dr.dataset_id);

        await db.DataRequest.destroy({ where: { connection_id: id } });
        await db.Dataset.destroy({ where: { id: datasetIds } });
      } catch (e) {
        //
      }
    }

    const connection = await this.findById(id);
    // remove certificates and keys if present
    try {
      if (connection.sslCa) {
        fs.unlink(connection.sslCa, () => {});
      }
      if (connection.sslCert) {
        fs.unlink(connection.sslCert, () => {});
      }
      if (connection.sslKey) {
        fs.unlink(connection.sslKey, () => {});
      }
      if (connection.sshPrivateKey) {
        fs.unlink(connection.sshPrivateKey, () => {});
      }
    } catch (e) {
      //
    }

    return db.Connection.destroy({ where: { id } })
      .then(() => {
        return true;
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  getApiTestOptions(connection) {
    if (connection.type !== "api") return false;

    const testOptions = {
      url: connection.host,
      method: "GET",
      headers: {},
      resolveWithFullResponse: true,
    };

    let globalHeaders = connection.options;
    if (connection.getHeaders) {
      globalHeaders = connection.getHeaders(connection);
    } else if (connection.authentication && connection.authentication.type === "bearer_token") {
      testOptions.headers.authorization = `Bearer ${connection.authentication.token}`;
    }

    if (globalHeaders && globalHeaders.length > 0) {
      for (const option of connection.options) {
        testOptions.headers[Object.keys(option)[0]] = option[Object.keys(option)[0]];
      }
    }

    // Basic Auth
    if (connection.authentication && connection.authentication.type === "basic_auth") {
      testOptions.auth = {
        user: connection.authentication.user,
        pass: connection.authentication.pass,
      };
    }

    return testOptions;
  }

  testRequest(data, extras) {
    const certificates = {};
    if (extras?.files?.length > 0) {
      try {
        extras.files.forEach((file) => {
          // Handle SSL certificates
          if (file.fieldname === "sslCa" || file.fieldname === "sslCert" || file.fieldname === "sslKey") {
            certificates[file.fieldname] = file.path; // Use the temporary file path for testing
          }
          // Handle SSH private key
          if (file.fieldname === "sshPrivateKey") {
            certificates.sshPrivateKey = file.path;
          }
        });
      } catch (error) {
        return Promise.reject(new Error(`Error processing certificate files: ${error.message}`));
      }
    }

    let connectionParams = { ...data };

    if (Object.keys(certificates).length > 0) {
      connectionParams = { ...connectionParams, ...certificates };
    }

    if (data.type === "api") {
      return this.testApi(connectionParams, buildApiPolicyContext(
        "connection_type_test",
        null,
        {
          teamId: data.team_id || null,
          connectionId: null,
          // Unsaved test payloads should not override private network policy.
          allowPrivateHost: null,
        }
      ));
    } else if (data.type === "googleAnalytics") {
      return this.testGoogleAnalytics(connectionParams);
    }

    return new Promise((resolve, reject) => reject(new Error("No request type specified")));
  }

  testApi(data, policyContext = {}) {
    const testOpt = this.getApiTestOptions(data);
    return safeRequest(testOpt, policyContext);
  }

  testConnection(id) {
    let gConnection;
    return db.Connection.findByPk(id)
      .then((connection) => {
        gConnection = connection;
        switch (connection.type) {
          case "api":
            return this.testApi(connection, buildApiPolicyContext("connection_test", connection));
          case "googleAnalytics":
            return this.testGoogleAnalytics(connection);
          default:
            return new Promise((resolve, reject) => reject(new Error(400)));
        }
      })
      .then((response) => {
        switch (gConnection.type) {
          case "api":
            if (response.statusCode < 300) {
              return new Promise((resolve) => resolve({ success: true }));
            }
            return new Promise((resolve, reject) => reject(new Error(400)));
          case "googleAnalytics":
            return new Promise((resolve) => resolve(response));
          default:
            return new Promise((resolve, reject) => reject(new Error(400)));
        }
      })
      .then(() => {
        return new Promise((resolve) => resolve({ success: true }));
      })
      .catch((err) => {
        return new Promise((resolve, reject) => reject(err));
      });
  }

  testApiRequest({
    connection_id, dataRequest, itemsLimit, items, offset, pagination, paginationField,
  }) {
    const limit = itemsLimit
      ? parseInt(itemsLimit, 10) : 0;
    return this.findById(connection_id)
      .then((connection) => {
        const policyContext = buildApiPolicyContext("api_request_test", connection);
        const tempUrl = `${connection.getApiUrl(connection)}${dataRequest.route || ""}`;
        const queryParams = querystring.parse(tempUrl.split("?")[1]);

        let url = tempUrl;
        if (url.indexOf("?") > -1) {
          url = tempUrl.substring(0, tempUrl.indexOf("?"));
        }

        const options = {
          url,
          method: dataRequest.method || "GET",
          headers: {},
          qs: queryParams,
          resolveWithFullResponse: true,
          simple: false,
        };

        // prepare the headers
        let headers = {};
        if (dataRequest.useGlobalHeaders) {
          const globalHeaders = connection.getHeaders(connection);
          for (const opt of globalHeaders) {
            headers = Object.assign(opt, headers);
          }

          if (dataRequest.headers) {
            headers = Object.assign(dataRequest.headers, headers);
          }
        }

        options.headers = headers;

        if (dataRequest.body && dataRequest.method !== "GET") {
          options.body = dataRequest.body;
          options.headers["Content-Type"] = "application/json";
        }

        if (pagination) {
          if ((options.url.indexOf(`?${items}=`) || options.url.indexOf(`&${items}=`))
            && (options.url.indexOf(`?${offset}=`) || options.url.indexOf(`&${offset}=`))
          ) {
            return paginateRequests(dataRequest.template, {
              options,
              limit,
              items,
              offset,
              paginationField,
              policyContext,
            });
          }
        }

        return safeRequest(options, policyContext);
      })
      .then((response) => {
        if (pagination) {
          return new Promise((resolve) => resolve(response));
        }

        if (response.statusCode < 300) {
          try {
            return new Promise((resolve) => resolve(JSON.parse(response.body)));
          } catch (e) {
            return new Promise((resolve, reject) => reject(400));
          }
        } else {
          return new Promise((resolve, reject) => reject(response.statusCode));
        }
      })
      .catch((error) => {
        return new Promise((resolve, reject) => reject(error));
      });
  }

  async runApiRequest(id, chartId, dataRequest, getCache, filters, timezone = "", runtimeVariables = {}, auditContext = null) {
    if (getCache) {
      const drCache = await checkAndGetCache(id, dataRequest);
      if (drCache) {
        await completeConnectorAudit(auditContext, {
          cacheHit: true,
          connectionType: "api",
          ...serializeResponsePreview(drCache.responseData),
        });
        return drCache;
      }
    }

    const limit = dataRequest.itemsLimit
      ? parseInt(dataRequest.itemsLimit, 10) : 0;
    const { variables } = dataRequest;

    return this.findById(id)
      .then(async (connection) => {
        const policyContext = buildApiPolicyContext("api_request_run", connection);
        // Apply variable substitution for API requests
        let processedRoute = dataRequest.route || "";
        let processedHeaders = dataRequest.headers || {};
        let processedBody = dataRequest.body || "";

        try {
          const result = applyApiVariables(dataRequest, runtimeVariables);
          processedRoute = result.processedRoute || processedRoute;
          processedHeaders = result.processedHeaders || processedHeaders;
          processedBody = result.processedBody || processedBody;
        } catch (error) {
          // If there's an error in variable processing, return it
          return Promise.reject(error);
        }

        let tempUrl = connection.getApiUrl(connection);
        let route = processedRoute;
        if (route && (route[0] !== "/" && route[0] !== "?")) {
          route = `/${route}`;
        }

        tempUrl += route;

        const queryParams = querystring.parse(tempUrl.split("?")[1]);

        // if any queryParams has variables, modify them here
        if (queryParams && Object.keys(queryParams).length > 0) {
          // First, process generic variables (excluding start_date and end_date)
          if (dataRequest.VariableBindings && dataRequest.VariableBindings.length > 0) {
            // Process each query parameter for variables
            for (const q of Object.keys(queryParams)) {
              const paramValue = queryParams[q];
              if (typeof paramValue === "string") {
                let processedValue = paramValue;

                // Find all variables in this parameter value
                const variableMatches = [...paramValue.matchAll(/\{\{([^}]+)\}\}/g)];

                for (const match of variableMatches) {
                  const variableName = match[1].trim();

                  // Skip reserved date variables - they're handled separately below
                  if (variableName === "start_date" || variableName === "end_date") {
                    // oxlint-disable-next-line no-continue
                    continue;
                  }

                  const binding = dataRequest.VariableBindings
                    .find((vb) => vb.name === variableName);

                  // Check for runtime variable value first
                  const runtimeValue = runtimeVariables[variableName];
                  const hasRuntimeValue = runtimeValue !== null
                    && runtimeValue !== undefined && runtimeValue !== "";

                  // Check for default value
                  const hasDefaultValue = binding?.default_value !== null
                    && binding?.default_value !== undefined
                    && binding?.default_value !== "";

                  if (hasRuntimeValue) {
                    // Priority 1: Use runtime value
                    let replacementValue = runtimeValue;

                    // Handle different data types based on binding type (if available)
                    if (binding?.type) {
                      switch (binding.type) {
                        case "string":
                          replacementValue = String(runtimeValue);
                          break;
                        case "number":
                          replacementValue = Number.isNaN(Number(runtimeValue))
                            ? "0" : String(runtimeValue);
                          break;
                        case "boolean":
                          replacementValue = (runtimeValue === "true" || runtimeValue === true)
                            ? "true" : "false";
                          break;
                        case "date":
                          replacementValue = String(runtimeValue);
                          break;
                        default:
                          replacementValue = String(runtimeValue);
                      }
                    } else {
                      // No binding type info, treat as string
                      replacementValue = String(runtimeValue);
                    }

                    processedValue = processedValue.replace(match[0], replacementValue);
                  } else if (hasDefaultValue && binding) {
                    // Priority 2: Use default value
                    let replacementValue = binding.default_value;

                    if (binding.type) {
                      switch (binding.type) {
                        case "string":
                          replacementValue = String(binding.default_value);
                          break;
                        case "number":
                          replacementValue = Number.isNaN(Number(binding.default_value))
                            ? "0" : String(binding.default_value);
                          break;
                        case "boolean":
                          replacementValue = binding.default_value === "true"
                            || binding.default_value === true ? "true" : "false";
                          break;
                        case "date":
                          replacementValue = String(binding.default_value);
                          break;
                        default:
                          replacementValue = String(binding.default_value);
                      }
                    } else {
                      replacementValue = String(binding.default_value);
                    }

                    processedValue = processedValue.replace(match[0], replacementValue);
                  } else {
                    // Priority 3: No runtime value and no default value
                    if (binding?.required) {
                      // Required variable without value - throw error
                      const errorMsg = `Required variable '${variableName}' has no value provided and no default value`;
                      throw new Error(errorMsg);
                    }

                    // Not required and no value - remove the placeholder
                    processedValue = processedValue.replace(match[0], "");
                  }
                }

                // Update the query parameter with processed value
                queryParams[q] = processedValue;
              }
            }
          }

          // Now handle special date variables
          // first, check for the keys to avoid making an unnecessary query to the DB
          const keysFound = {};
          Object.keys(queryParams).forEach((q) => {
            const paramValue = queryParams[q];
            // Check for exact matches
            if (paramValue === "{{start_date}}") {
              keysFound[q] = { type: "startDate", format: "single" };
            } else if (paramValue === "{{end_date}}") {
              keysFound[q] = { type: "endDate", format: "single" };
            } else if (typeof paramValue === "string") {
              // Check for combined variables using regex
              const startDateMatch = paramValue.match(/{{start_date}}/);
              const endDateMatch = paramValue.match(/{{end_date}}/);
              if (startDateMatch || endDateMatch) {
                keysFound[q] = {
                  type: "combined",
                  hasStartDate: !!startDateMatch,
                  hasEndDate: !!endDateMatch,
                  originalValue: paramValue
                };
              }
            }
          });

          // something was found, go through all and replace the date variables
          if (Object.keys(keysFound).length > 0) {
            const chart = await db.Chart.findByPk(chartId);
            const runtimeContext = chart
              ? buildChartRuntimeContext(chart, filters, runtimeVariables, timezone)
              : null;
            const effectiveDateRange = runtimeContext?.effectiveDateRange;

            if (chart && effectiveDateRange) {
              Object.keys(keysFound).forEach((q) => {
                const value = keysFound[q];
                const startDate = effectiveDateRange.startDate;
                const endDate = effectiveDateRange.endDate;

                if (value.format === "single") {
                  if (value.type === "startDate" && startDate) {
                    queryParams[q] = startDate.format(chart.dateVarsFormat || "");
                  } else if (value.type === "endDate" && endDate) {
                    queryParams[q] = endDate.format(chart.dateVarsFormat || "");
                  }
                } else if (value.type === "combined") {
                  let formattedValue = value.originalValue;
                  if (value.hasStartDate && startDate) {
                    formattedValue = formattedValue.replace(/{{start_date}}/g, startDate.format(chart.dateVarsFormat || ""));
                  }
                  if (value.hasEndDate && endDate) {
                    formattedValue = formattedValue.replace(/{{end_date}}/g, endDate.format(chart.dateVarsFormat || ""));
                  }
                  queryParams[q] = formattedValue;
                }
              });
            } else if (variables?.startDate?.value && variables?.endDate?.value) {
              Object.keys(keysFound).forEach((q) => {
                const value = keysFound[q];
                const startDate = getMomentObj(timezone)(variables.startDate.value);
                const endDate = getMomentObj(timezone)(variables.endDate.value);

                if (value.format === "single") {
                  if (value.type === "startDate" && startDate) {
                    queryParams[q] = startDate.format(variables.dateFormat?.value || "");
                  } else if (value.type === "endDate" && endDate) {
                    queryParams[q] = endDate.format(variables.dateFormat?.value || "");
                  }
                } else if (value.type === "combined") {
                  let formattedValue = value.originalValue;
                  if (value.hasStartDate && startDate) {
                    formattedValue = formattedValue.replace(/{{start_date}}/g, startDate.format(variables.dateFormat?.value || ""));
                  }
                  if (value.hasEndDate && endDate) {
                    formattedValue = formattedValue.replace(/{{end_date}}/g, endDate.format(variables.dateFormat?.value || ""));
                  }
                  queryParams[q] = formattedValue;
                }
              });
            }
          }
        }

        let url = tempUrl;
        if (url.indexOf("?") > -1) {
          url = tempUrl.substring(0, tempUrl.indexOf("?"));
        }

        // if ant variable queryParams are left, remove them
        if (queryParams && Object.keys(queryParams).length > 0) {
          Object.keys(queryParams).forEach((q) => {
            if (queryParams[q] === "{{start_date}}" || queryParams[q] === "{{end_date}}") {
              delete queryParams[q];
            }
          });
        }

        const options = {
          url,
          method: dataRequest.method || "GET",
          headers: {},
          qs: queryParams,
          resolveWithFullResponse: true,
          simple: false,
        };

        // prepare the headers
        let headers = {};
        if (dataRequest.useGlobalHeaders) {
          const globalHeaders = connection.getHeaders(connection);
          for (const opt of globalHeaders) {
            headers = Object.assign(opt, headers);
          }

          if (processedHeaders) {
            headers = Object.assign(processedHeaders, headers);
          }
        }

        options.headers = headers;

        if (processedBody && dataRequest.method !== "GET") {
          options.body = processedBody;
          options.headers["Content-Type"] = "application/json";
        }

        // Basic auth
        if (connection.authentication && connection.authentication.type === "basic_auth") {
          options.auth = {
            user: connection.authentication.user,
            pass: connection.authentication.pass,
          };
        }

        if (dataRequest.pagination) {
          if ((options.url.indexOf(`?${dataRequest.items}=`) || options.url.indexOf(`&${dataRequest.items}=`))
            && (options.url.indexOf(`?${dataRequest.offset}=`) || options.url.indexOf(`&${dataRequest.offset}=`))
          ) {
            return paginateRequests(dataRequest.template, {
              options,
              limit,
              items: dataRequest.items,
              offset: dataRequest.offset,
              paginationField: dataRequest.paginationField,
              policyContext,
            });
          }
        }

        return safeRequest(options, policyContext);
      })
      .then(async (response) => {
        if (dataRequest.pagination) {
          // cache the data for later use
          const dataToCache = {
            dataRequest,
            responseData: {
              data: response,
            },
            connection_id: id,
          };

          await drCacheController.create(dataRequest.id, dataToCache);
          await completeConnectorAudit(auditContext, {
            cacheHit: false,
            connectionType: "api",
            paginated: true,
            itemCount: getItemCount(response),
            responseSnippet: sanitizeSnippet(response),
          });

          return new Promise((resolve) => resolve(dataToCache));
        }

        if (response.statusCode < 300) {
          try {
            let responseData = JSON.parse(response.body);

            // check if there are arrays to take into account
            // transform the data in 1-item array if that's the case
            // check for arrays in 3 levels
            if (determineType(responseData) === "object" && !isArrayPresent(responseData)) {
              responseData = [responseData];
            }

            // cache the data for later use
            const dataToCache = {
              dataRequest,
              responseData: {
                data: responseData,
              },
              connection_id: id,
            };

            await drCacheController.create(dataRequest.id, dataToCache);
            await completeConnectorAudit(auditContext, {
              cacheHit: false,
              connectionType: "api",
              statusCode: response.statusCode,
              bodySnippet: sanitizeSnippet(response.body),
              ...serializeResponsePreview(dataToCache.responseData),
            });

            return new Promise((resolve) => resolve(dataToCache));
          } catch (e) {
            return new Promise((resolve, reject) => reject(400));
          }
        } else {
          return new Promise((resolve, reject) => reject(response.statusCode));
        }
      })
      .catch(async (error) => {
        await failConnectorAudit(auditContext, error, error.auditStage || "connection", {
          cacheHit: false,
          connectionType: "api",
          statusCode: error?.statusCode || (typeof error === "number" ? error : null),
          responseSnippet: sanitizeSnippet(error?.body || error?.error || error?.message || error),
        });
        return new Promise((resolve, reject) => reject(error));
      });
  }

  async runGoogleAnalytics(conn, dataRequest, getCache, auditContext = null) {
    let connection = conn;
    if (connection.id) {
      try {
        connection = await this.findById(connection.id);
      } catch (e) {
        connection = conn;
      }
    }

    if (getCache) {
      const drCache = await checkAndGetCache(connection.id, dataRequest);
      if (drCache) {
        await completeConnectorAudit(auditContext, {
          cacheHit: true,
          connectionType: "googleAnalytics",
          ...serializeResponsePreview(drCache.responseData),
        });
        return drCache;
      }
    }

    if (!connection.oauth_id) return Promise.reject({ error: "No oauth token" });

    const oauth = await oauthController.findById(connection.oauth_id);
    return googleConnector.getAnalytics(oauth, dataRequest)
      .then(async (responseData) => {
        // cache the data for later use
        const dataToCache = {
          dataRequest,
          responseData: {
            data: responseData,
          },
          connection_id: connection.id,
        };

        await drCacheController.create(dataRequest.id, dataToCache);
        await completeConnectorAudit(auditContext, {
          cacheHit: false,
          connectionType: "googleAnalytics",
          ...serializeResponsePreview(dataToCache.responseData),
        });

        return dataToCache;
      })
      .catch(async (err) => {
        await failConnectorAudit(auditContext, err, err.auditStage || "connection", {
          cacheHit: false,
          connectionType: "googleAnalytics",
        });
        return new Promise((resolve, reject) => reject(err));
      });
  }

  async testGoogleAnalytics(connection) {
    if (!connection.oauth_id) return Promise.reject({ error: "No oauth token" });

    const oauth = await oauthController.findById(connection.oauth_id);
    return googleConnector.getAccounts(oauth.refreshToken, connection.oauth_id);
  }

  async getApiBuilderMetadata(connectionId, { includeSensitive = false } = {}) {
    const connection = await this.findById(connectionId);
    let globalHeaders = connection.getHeaders(connection);

    if (!Array.isArray(globalHeaders)) {
      try {
        globalHeaders = JSON.parse(globalHeaders);
      } catch (error) {
        globalHeaders = [];
      }
    }

    return {
      host: connection.getApiUrl(connection),
      globalHeaders: globalHeaders.map((header) => {
        const key = Object.keys(header || {})[0];
        const value = key ? header[key] : "";
        let serializedValue = value;
        if (!includeSensitive) {
          serializedValue = value ? "Hidden" : "";
        }
        return {
          key: key || "",
          value: serializedValue,
        };
      }),
      hasGlobalHeaders: globalHeaders.length > 0,
    };
  }

  async getGoogleAnalyticsBuilderMetadata(connectionId, { propertyId = null } = {}) {
    const connection = await this.findById(connectionId);
    const accounts = await this.testGoogleAnalytics(connection);
    let metadata = null;

    if (propertyId) {
      const oauth = await oauthController.findById(connection.oauth_id);
      if (!oauth) {
        return Promise.reject(new Error("OAuth is not registered properly"));
      }

      metadata = await googleConnector.getMetadata(oauth.refreshToken, propertyId);
    }

    return {
      accounts,
      metadata,
    };
  }

  async duplicateConnection(connectionId, name) {
    const connection = await db.Connection.findByPk(connectionId);
    const connectionToSave = connection.toJSON();
    delete connectionToSave.id;
    delete connectionToSave.createdAt;
    delete connectionToSave.updatedAt;

    if (name) {
      connectionToSave.name = name;
    }

    const newConnection = await db.Connection.create(connectionToSave);
    return newConnection;
  }

}

module.exports = ConnectionController;
