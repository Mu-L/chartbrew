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
const ConnectionController = require("../../controllers/ConnectionController.js");

async function seedProjectScopedAccess(models) {
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
    role: "projectEditor",
    projects: [allowedProject.id],
  });

  const allowedCustomerioConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [allowedProject.id],
    type: "customerio",
    subType: "customerio",
    host: "us",
    password: "allowed-token",
  }));

  const restrictedCustomerioConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [restrictedProject.id],
    type: "customerio",
    subType: "customerio",
    host: "us",
    password: "restricted-token",
  }));

  const allowedApiConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [allowedProject.id],
    type: "api",
    subType: "rest",
    host: "https://allowed.example.com",
    options: JSON.stringify([{ Authorization: "Bearer allowed-api-token" }]),
  }));

  const restrictedApiConnection = await models.Connection.create(connectionFactory.build({
    team_id: team.id,
    project_ids: [restrictedProject.id],
    type: "api",
    subType: "rest",
    host: "https://restricted.example.com",
    options: JSON.stringify([{ Authorization: "Bearer restricted-api-token" }]),
  }));

  return {
    team,
    user,
    token: generateTestToken({
      id: user.id,
      email: user.email,
      name: user.name,
    }),
    connections: {
      allowedCustomerioConnection,
      restrictedCustomerioConnection,
      allowedApiConnection,
      restrictedApiConnection,
    },
  };
}

describe("ConnectionRoute project scoping", () => {
  let app;
  let models;

  beforeAll(async () => {
    if (!testDbManager.getSequelize()) {
      await testDbManager.start();
    }

    app = await createTestApp();
    const connectionRoute = require("../../api/ConnectionRoute.js");
    connectionRoute(app);
    models = await getModels();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows safe helper routes for connections assigned to the caller's project", async () => {
    const seeded = await seedProjectScopedAccess(models);
    const helperSpy = vi.spyOn(ConnectionController.prototype, "runHelperMethod")
      .mockResolvedValue({ ok: true });

    const response = await request(app)
      .post(`/team/${seeded.team.id}/connections/${seeded.connections.allowedCustomerioConnection.id}/helper/getAllSegments`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send()
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(helperSpy).toHaveBeenCalledWith(
      `${seeded.connections.allowedCustomerioConnection.id}`,
      "getAllSegments",
      undefined
    );
  });

  it("rejects internal helper methods that should never be exposed to project members", async () => {
    const seeded = await seedProjectScopedAccess(models);
    const helperSpy = vi.spyOn(ConnectionController.prototype, "runHelperMethod");

    const response = await request(app)
      .post(`/team/${seeded.team.id}/connections/${seeded.connections.allowedCustomerioConnection.id}/helper/getConnectionOpt`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({ method: "GET", route: "segments?limit=1" })
      .expect(400);

    expect(response.body).toEqual({});
    expect(helperSpy).toHaveBeenCalledWith(
      `${seeded.connections.allowedCustomerioConnection.id}`,
      "getConnectionOpt",
      { method: "GET", route: "segments?limit=1" }
    );
  });

  it("rejects helper routes for same-team connections outside the caller's projects", async () => {
    const seeded = await seedProjectScopedAccess(models);
    const helperSpy = vi.spyOn(ConnectionController.prototype, "runHelperMethod")
      .mockResolvedValue({ ok: true });

    const response = await request(app)
      .post(`/team/${seeded.team.id}/connections/${seeded.connections.restrictedCustomerioConnection.id}/helper/getAllSegments`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send()
      .expect(403);

    expect(response.body).toEqual({ error: "Not authorized" });
    expect(helperSpy).not.toHaveBeenCalled();
  });

  it("allows apiTest for connections assigned to the caller's project", async () => {
    const seeded = await seedProjectScopedAccess(models);
    const apiTestSpy = vi.spyOn(ConnectionController.prototype, "testApiRequest")
      .mockResolvedValue({ responseData: { data: [{ id: 1 }] } });

    const response = await request(app)
      .post(`/team/${seeded.team.id}/connections/${seeded.connections.allowedApiConnection.id}/apiTest`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({
        dataRequest: {
          route: "/v1/customers?limit=5",
          method: "GET",
          useGlobalHeaders: true,
        },
      })
      .expect(200);

    expect(response.body).toEqual({ responseData: { data: [{ id: 1 }] } });
    expect(apiTestSpy).toHaveBeenCalledWith(expect.objectContaining({
      connection_id: `${seeded.connections.allowedApiConnection.id}`,
      dataRequest: {
        route: "/v1/customers?limit=5",
        method: "GET",
        useGlobalHeaders: true,
      },
    }));
  });

  it("rejects apiTest for same-team connections outside the caller's projects", async () => {
    const seeded = await seedProjectScopedAccess(models);
    const apiTestSpy = vi.spyOn(ConnectionController.prototype, "testApiRequest")
      .mockResolvedValue({ responseData: { data: [{ id: 1 }] } });

    const response = await request(app)
      .post(`/team/${seeded.team.id}/connections/${seeded.connections.restrictedApiConnection.id}/apiTest`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({
        dataRequest: {
          route: "/v1/customers?limit=5",
          method: "GET",
          useGlobalHeaders: true,
        },
      })
      .expect(403);

    expect(response.body).toEqual({ error: "Not authorized" });
    expect(apiTestSpy).not.toHaveBeenCalled();
  });
});
