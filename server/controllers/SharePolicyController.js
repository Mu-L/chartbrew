const db = require("../models/models");

async function createSharePolicy(data) {
  return db.SharePolicy.create(data);
}

async function findById(id) {
  return db.SharePolicy.findByPk(id);
}

async function updateSharePolicy(id, data, entityType, entityId) {
  const where = { id };
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;

  const [updatedCount] = await db.SharePolicy.update(data, { where });
  if (!updatedCount) {
    throw new Error("404");
  }

  return db.SharePolicy.findByPk(id);
}

async function findByEntityId(entityType, entityId) {
  return db.SharePolicy.findAll({ where: { entity_type: entityType, entity_id: entityId } });
}

async function deleteSharePolicy(id, entityType, entityId) {
  const where = { id };
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;

  const deletedCount = await db.SharePolicy.destroy({ where });
  if (!deletedCount) {
    throw new Error("404");
  }

  return deletedCount;
}

module.exports = {
  createSharePolicy,
  findById,
  updateSharePolicy,
  findByEntityId,
  deleteSharePolicy,
};
