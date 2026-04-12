import {
  beforeAll, describe, expect, it
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

const require = createRequire(import.meta.url);

async function seedDashboardAccessFixtures(models) {
  const user = await models.User.create(userFactory.build());
  const team = await models.Team.create(teamFactory.build());

  const allowedProject = await models.Project.create(projectFactory.build({
    team_id: team.id,
    ghost: false,
    public: false,
    brewName: "allowed-dashboard",
    passwordProtected: true,
    password: "allowed-secret",
  }));

  const restrictedProject = await models.Project.create(projectFactory.build({
    team_id: team.id,
    ghost: false,
    public: false,
    brewName: "restricted-dashboard",
    passwordProtected: true,
    password: "victim-secret",
  }));

  await models.TeamRole.create({
    team_id: team.id,
    user_id: user.id,
    role: "projectEditor",
    projects: [allowedProject.id],
  });

  await models.Chart.create({
    project_id: allowedProject.id,
    name: "Allowed Dashboard Chart",
    type: "line",
    draft: false,
    onReport: true,
    chartData: {
      labels: ["Jan"],
      datasets: [{ label: "Allowed", data: [1] }],
    },
  });

  await models.Chart.create({
    project_id: restrictedProject.id,
    name: "Restricted Dashboard Chart",
    type: "line",
    draft: false,
    onReport: true,
    chartData: {
      labels: ["Jan"],
      datasets: [{ label: "Restricted", data: [2] }],
    },
  });

  const token = generateTestToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return {
    token,
    allowedProject,
    restrictedProject,
  };
}

describe("ProjectRoute legacy dashboard access", () => {
  let app;
  let models;

  beforeAll(async () => {
    if (!testDbManager.getSequelize()) {
      await testDbManager.start();
    }

    app = await createTestApp();
    const projectRoute = require("../../api/ProjectRoute.js");
    projectRoute(app);
    models = await getModels();
  });

  it("blocks same-team users from reading a private dashboard outside their project scope", async () => {
    const seeded = await seedDashboardAccessFixtures(models);

    const response = await request(app)
      .get(`/project/dashboard/${seeded.restrictedProject.brewName}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(401);

    expect(response.text).toContain("Not authorized");
  });

  it("allows project members to use the legacy dashboard route without leaking the report password", async () => {
    const seeded = await seedDashboardAccessFixtures(models);

    const response = await request(app)
      .get(`/project/dashboard/${seeded.allowedProject.brewName}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: seeded.allowedProject.id,
      brewName: seeded.allowedProject.brewName,
      password: "",
    }));
    expect(response.body.password).not.toBe("allowed-secret");
  });
});
