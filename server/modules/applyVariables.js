const { applySourceVariables } = require("../sources/applySourceVariables");
const { applyApiVariables } = require("../sources/shared/protocols/api.variables");
const {
  applyMysqlOrPostgresVariables,
} = require("../sources/shared/sql/sql.variables");
const {
  applyFirestoreVariables,
} = require("../sources/plugins/firestore/firestore.variables");
const {
  applyRealtimeDbVariables,
} = require("../sources/plugins/realtimedb/realtimedb.variables");

module.exports = {
  applyVariables: applySourceVariables,
  applyMysqlOrPostgresVariables,
  applyApiVariables,
  applyFirestoreVariables,
  applyRealtimeDbVariables,
};
