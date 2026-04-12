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

async function seedPolicyOwnershipFixtures(models) {
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

  const allowedChart = await models.Chart.create({
    project_id: allowedProject.id,
    name: "Allowed Chart",
    type: "line",
    draft: false,
    chartData: {
      labels: ["Jan"],
      datasets: [{ label: "Allowed", data: [1] }],
    },
  });

  const restrictedChart = await models.Chart.create({
    project_id: restrictedProject.id,
    name: "Restricted Chart",
    type: "line",
    draft: false,
    chartData: {
      labels: ["Jan"],
      datasets: [{ label: "Restricted", data: [2] }],
    },
  });

  const allowedProjectPolicy = await models.SharePolicy.create({
    entity_type: "Project",
    entity_id: allowedProject.id,
    visibility: "private",
  });

  const restrictedProjectPolicy = await models.SharePolicy.create({
    entity_type: "Project",
    entity_id: restrictedProject.id,
    visibility: "private",
  });

  const allowedChartPolicy = await models.SharePolicy.create({
    entity_type: "Chart",
    entity_id: allowedChart.id,
    visibility: "private",
  });

  const restrictedChartPolicy = await models.SharePolicy.create({
    entity_type: "Chart",
    entity_id: restrictedChart.id,
    visibility: "private",
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
    allowedChart,
    restrictedChart,
    allowedProjectPolicy,
    restrictedProjectPolicy,
    allowedChartPolicy,
    restrictedChartPolicy,
  };
}

describe("Share policy ownership enforcement", () => {
  let app;
  let models;

  beforeAll(async () => {
    if (!testDbManager.getSequelize()) {
      await testDbManager.start();
    }

    app = await createTestApp();
    const projectRoute = require("../../api/ProjectRoute.js");
    const chartRoute = require("../../api/ChartRoute.js");
    projectRoute(app);
    chartRoute(app);
    models = await getModels();
  });
  it("allows updating a share policy that belongs to the authorized project", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .put(`/project/${seeded.allowedProject.id}/share/policy/${seeded.allowedProjectPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({ visibility: "public" })
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: seeded.allowedProjectPolicy.id,
      entity_type: "Project",
      entity_id: seeded.allowedProject.id,
      visibility: "public",
    }));
  });

  it("blocks updating a project share policy that belongs to a different project", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .put(`/project/${seeded.allowedProject.id}/share/policy/${seeded.restrictedProjectPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({ visibility: "public" })
      .expect(404);

    expect(response.body).toEqual({ error: "Share policy not found" });

    const victimPolicy = await models.SharePolicy.findByPk(seeded.restrictedProjectPolicy.id);
    expect(victimPolicy.visibility).toBe("private");
  });

  it("blocks deleting a project share policy that belongs to a different project", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .delete(`/project/${seeded.allowedProject.id}/share/policy/${seeded.restrictedProjectPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(404);

    expect(response.body).toEqual({ error: "Share policy not found" });

    const victimPolicy = await models.SharePolicy.findByPk(seeded.restrictedProjectPolicy.id);
    expect(victimPolicy).not.toBeNull();
  });

  it("allows deleting a share policy that belongs to the authorized chart", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .delete(`/project/${seeded.allowedProject.id}/chart/${seeded.allowedChart.id}/share/policy/${seeded.allowedChartPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(200);

    expect(response.body).toEqual({ deleted: true });

    const deletedPolicy = await models.SharePolicy.findByPk(seeded.allowedChartPolicy.id);
    expect(deletedPolicy).toBeNull();
  });

  it("blocks updating a chart share policy that belongs to a different chart", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .put(`/project/${seeded.allowedProject.id}/chart/${seeded.allowedChart.id}/share/policy/${seeded.restrictedChartPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .send({ visibility: "public" })
      .expect(404);

    expect(response.body).toEqual({ error: "Share policy not found" });

    const victimPolicy = await models.SharePolicy.findByPk(seeded.restrictedChartPolicy.id);
    expect(victimPolicy.visibility).toBe("private");
  });

  it("blocks deleting a chart share policy that belongs to a different chart", async () => {
    const seeded = await seedPolicyOwnershipFixtures(models);

    const response = await request(app)
      .delete(`/project/${seeded.allowedProject.id}/chart/${seeded.allowedChart.id}/share/policy/${seeded.restrictedChartPolicy.id}`)
      .set("Authorization", `Bearer ${seeded.token}`)
      .expect(404);

    expect(response.body).toEqual({ error: "Share policy not found" });

    const victimPolicy = await models.SharePolicy.findByPk(seeded.restrictedChartPolicy.id);
    expect(victimPolicy).not.toBeNull();
  });
});
