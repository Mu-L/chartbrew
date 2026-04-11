import {
  beforeEach, describe, expect, it, vi
} from "vitest";

const db = require("../../models/models");
const listConnections = require("../../modules/ai/orchestrator/tools/listConnections");
const getSchema = require("../../modules/ai/orchestrator/tools/getSchema");
const {
  requireConnectionForTeam,
  requireDatasetForTeam,
  requireProjectForTeam,
} = require("../../modules/ai/orchestrator/tools/teamScope");

describe("AI orchestrator team scope", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("scopes list_connections to the calling team", async () => {
    vi.spyOn(db.Connection, "findAll").mockResolvedValue([
      {
        id: 12,
        type: "postgres",
        subType: null,
        name: "Primary DB",
      },
    ]);

    const result = await listConnections({ team_id: 7 });

    expect(db.Connection.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        team_id: 7,
        type: expect.any(Array),
      }),
    }));
    expect(result).toEqual({
      connections: [{
        id: 12,
        type: "postgres",
        subType: null,
        name: "Primary DB",
      }],
    });
  });

  it("rejects cross-team connections in get_schema", async () => {
    vi.spyOn(db.Connection, "findByPk").mockResolvedValue({
      id: 44,
      team_id: 99,
      type: "postgres",
      subType: null,
      name: "Other Team DB",
      schema: [],
    });

    await expect(getSchema({
      connection_id: 44,
      team_id: 7,
    })).rejects.toThrow("Connection does not belong to the specified team");
  });

  it("rejects cross-team projects and datasets in shared team scope helpers", async () => {
    vi.spyOn(db.Project, "findByPk").mockResolvedValue({
      id: 14,
      team_id: 3,
    });
    vi.spyOn(db.Dataset, "findByPk").mockResolvedValue({
      id: 21,
      team_id: 5,
    });

    await expect(requireProjectForTeam(14, 7)).rejects.toThrow("Project does not belong to the specified team");
    await expect(requireDatasetForTeam(21, 7)).rejects.toThrow("Dataset does not belong to the specified team");
  });

  it("allows access to same-team connections through the shared team scope helper", async () => {
    const connection = {
      id: 55,
      team_id: 7,
      type: "postgres",
      subType: null,
      name: "Scoped DB",
    };
    vi.spyOn(db.Connection, "findByPk").mockResolvedValue(connection);

    await expect(requireConnectionForTeam(55, 7)).resolves.toEqual(connection);
  });
});
