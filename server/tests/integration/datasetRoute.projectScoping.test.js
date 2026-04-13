import {
  beforeAll, beforeEach, describe, expect, it, vi
} from "vitest";
import request from "supertest";
import { createRequire } from "module";

import { createTestApp } from "../helpers/testApp.js";
import { testDbManager } from "../helpers/testDbManager.js";
import { getModels } from "../helpers/dbHelpers.js";
import { generateTestToken } from "../helpers/authHelpers.js";
import { userFactory } from "../factories/userFactory.js";
import { teamFactory } from "../factories/teamFactory.js";
import { projectFactory } from "../factories/projectFactory.js";
import { connectionFactory } from "../factories/connectionFactory.js";

const require = createRequire(import.meta.url);
const DatasetController = require("../../controllers/DatasetController.js");

async function seedDatasetScopedAccess(models) {
  const user = await models.User.create(userFactory.build());
  const team = await models.Team.create(teamFactory.build());
  const allowedProject = await models.Project.create(projectFactory.build({
    team_id: team.id,
    ghost: false,
  }));
  const restrictedProject = await models.Project.create(projectFactory.build({
    team_id: team.id,
    ghost: false,
  }));

  await models.TeamRole.create({
    team_id: team.id,
    user_id: user.id,
    role: "projectAdmin",
    projects: [allowedProject.id],
  });

  const allowedDataset = await models.Dataset.create({
    team_id: team.id,
    project_ids: [allowedProject.id],
    draft: false,
    name: "Allowed Dataset",
    xAxis: "items[].label",
    yAxis: "items[].value",
    fieldsSchema: { value: "number" },
  });

  const restrictedDataset = await models.Dataset.create({
    team_id: team.id,
    project_ids: [restrictedProject.id],
    draft: false,
    name: "Restricted Dataset",
    xAxis: "items[].label",
    yAxis: "items[].value",
    fieldsSchema: { value: "number" },
  });

  const allowedConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [allowedProject.id],
    type: "api",
    subType: "rest",
    host: "https://allowed.example.com",
  }));

  const restrictedConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [restrictedProject.id],
    type: "api",
    subType: "rest",
    host: "https://restricted.example.com",
  }));

  const allowedDataRequest = await models.DataRequest.create({
    dataset_id: allowedDataset.id,
    connection_id: allowedConnection.id,
    method: "GET",
    route: "/allowed",
    query: "SELECT 1",
  });

  const token = generateTestToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return {
    team,
    token,
    datasets: {
      allowedDataset,
      restrictedDataset,
    },
    connections: {
      allowedConnection,
      restrictedConnection,
    },
    dataRequests: {
      allowedDataRequest,
    },
  };
}

describe("DatasetRoute project scoping", () => {
  let app;
  let models;

  beforeAll(async () => {
    if (!testDbManager.getSequelize()) {
      await testDbManager.start();
    }

    app = await createTestApp();
    const datasetRoute = require("../../api/DatasetRoute.js");
    const dataRequestRoute = require("../../api/DataRequestRoute.js");
    datasetRoute(app);
    dataRequestRoute(app);
    models = await getModels();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks reading a same-team dataset outside the caller's projects", async () => {
    const seeded = await seedDatasetScopedAccess(models);

    const response = await request(app)
      .get(`/team/${seeded.team.id}/datasets/${seeded.datasets.restrictedDataset.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(403);

    expect(response.body).toEqual({ message: "Access denied" });
  });

  it("blocks executing a same-team dataset outside the caller's projects", async () => {
    const seeded = await seedDatasetScopedAccess(models);
    const runSpy = vi.spyOn(DatasetController.prototype, "runRequest")
      .mockResolvedValue({ data: [{ value: 1 }] });

    const response = await request(app)
      .post(`/team/${seeded.team.id}/datasets/${seeded.datasets.restrictedDataset.id}/request`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({ getCache: false, variables: {} })
      .expect(403);

    expect(response.body).toEqual({ message: "Access denied" });
    expect(runSpy).not.toHaveBeenCalled();
  });

  it("pins data request creation to the route dataset instead of trusting the body dataset_id", async () => {
    const seeded = await seedDatasetScopedAccess(models);

    const response = await request(app)
      .post(`/team/${seeded.team.id}/datasets/${seeded.datasets.allowedDataset.id}/dataRequests`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({
        dataset_id: seeded.datasets.restrictedDataset.id,
        connection_id: seeded.connections.allowedConnection.id,
        method: "GET",
        route: "/fresh-data",
        query: "SELECT * FROM safe_table",
      })
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      dataset_id: seeded.datasets.allowedDataset.id,
      connection_id: seeded.connections.allowedConnection.id,
    }));

    const restrictedDataRequests = await models.DataRequest.findAll({
      where: { dataset_id: seeded.datasets.restrictedDataset.id },
    });
    expect(restrictedDataRequests).toHaveLength(0);
  });

  it("pins data request updates to the route dataset instead of allowing reassignment", async () => {
    const seeded = await seedDatasetScopedAccess(models);

    const response = await request(app)
      .put(`/team/${seeded.team.id}/datasets/${seeded.datasets.allowedDataset.id}/dataRequests/${seeded.dataRequests.allowedDataRequest.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({
        dataset_id: seeded.datasets.restrictedDataset.id,
        route: "/updated-route",
      })
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: seeded.dataRequests.allowedDataRequest.id,
      dataset_id: seeded.datasets.allowedDataset.id,
      route: "/updated-route",
    }));

    const refreshedDataRequest = await models.DataRequest.findByPk(seeded.dataRequests.allowedDataRequest.id);
    expect(refreshedDataRequest.dataset_id).toBe(seeded.datasets.allowedDataset.id);
  });
});
