const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");
const _ = require("lodash");
const jwt = require("jsonwebtoken");

const settings = process.env.NODE_ENV === "production" ? require("../settings") : require("../settings-dev");

const ProjectController = require("../controllers/ProjectController");
const TeamController = require("../controllers/TeamController");
const verifyToken = require("../modules/verifyToken");
const accessControl = require("../modules/accessControl");
const refreshChartsApi = require("../modules/refreshChartsApi");
const getUserFromToken = require("../modules/getUserFromToken");
const db = require("../models/models");

module.exports = (app) => {
  const projectController = new ProjectController();
  const teamController = new TeamController();

  const checkPermissions = (actionType = "readOwn") => {
    return async (req, res, next) => {
      const projectId = req.params.id;
      const teamId = req.params.team_id || req.body?.team_id;

      let teamRole;
      let project;

      if (projectId) {
        project = await projectController.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });
      }

      if (teamId) {
        teamRole = await teamController.getTeamRole(teamId, req.user.id);
      } else {
        teamRole = await teamController.getTeamRole(project.team_id, req.user.id);
      }

      if (!teamRole?.role) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (["teamOwner", "teamAdmin"].includes(teamRole.role)) {
        const permission = accessControl.can(teamRole.role)[actionType]("project");
        if (!permission.granted) {
          return res.status(403).json({ message: "Access denied" });
        }

        return next();
      }

      if (teamRole?.projects?.length > 0) {
        if (projectId) {
          const filteredProjects = teamRole.projects.filter((o) => `${o}` === `${projectId}`);
          if (filteredProjects.length === 0) {
            return res.status(403).json({ message: "Access denied" });
          }
        }

        const permission = accessControl.can(teamRole.role)[actionType]("project");
        if (!permission.granted) {
          return res.status(403).json({ message: "Access denied" });
        }

        req.user.projects = teamRole.projects;

        return next();
      }

      return res.status(403).json({ message: "Access denied" });
    };
  };

  /*
  ** [MASTER] Route to get all the projects
  */
  app.get("/project", verifyToken, (req, res) => {
    if (!req.user.admin) {
      return res.status(401).send({ error: "Not authorized" });
    }

    return projectController.findAll()
      .then((projects) => {
        return res.status(200).send(projects);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -----------------------------------------

  /*
  ** Route to create a project
  */
  app.post("/project", verifyToken, checkPermissions("createOwn"), (req, res) => {
    return projectController.create(req.user.id, req.body)
      .then((project) => {
        return res.status(200).send(project);
      })
      .catch((error) => {
        if (error.message && error.message.indexOf("401") > -1) {
          return res.status(401).send({ error: "Not authorized" });
        }
        return res.status(400).send(error);
      });
  });
  // -----------------------------------------

  /*
  ** Route to get a project by ID
  */
  app.get("/project/:id", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.findById(req.params.id)
      .then((project) => {
        return res.status(200).send(project);
      })
      .catch((error) => {
        if (error.message === "401") {
          return res.status(401).send({ error: "Not authorized" });
        }
        if (error.message === "404") {
          return res.status(404).send({ error: "Not Found" });
        }
        return res.status(400).send(error);
      });
  });
  // -----------------------------------------

  /*
  ** Route to update a project ID
  */
  app.put("/project/:id", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.update(req.params.id, req.body)
      .then((project) => {
        return res.status(200).send(project);
      })
      .catch((error) => {
        if (error.message === "401") {
          return res.status(401).send({ error: "Not authorized" });
        }
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to update a project's Logo
  */
  app.post("/project/:id/logo", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    let logoPath;

    req.pipe(req.busboy);
    req.busboy.on("file", (fieldname, file, info) => {
      const newFilename = `${nanoid(6)}-${info.filename}`;
      const uploadPath = path.normalize(`${__dirname}/../uploads/${newFilename}`);
      logoPath = `uploads/${newFilename}`;

      file.pipe(fs.createWriteStream(uploadPath));
    });

    req.busboy.on("finish", () => {
      return projectController.update(req.params.id, { logo: logoPath })
        .then((project) => {
          return res.status(200).send(project);
        })
        .catch((err) => {
          return res.status(400).send(err);
        });
    });
  });
  // -------------------------------------------

  /*
  ** Route to remove a project
  */
  app.delete("/project/:id", verifyToken, checkPermissions("deleteAny"), (req, res) => {
    return projectController.remove(req.params.id, req.user.id)
      .then(() => {
        return res.status(200).send({ removed: true });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route return a list of projects within a team
  */
  app.get("/project/team/:team_id", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.getTeamProjects(req.params.team_id)
      .then((projects) => {
        let filteredProjects = projects;
        if (req.user.projects) {
          filteredProjects = projects.filter((o) => {
            return req.user.projects.includes(o.id) || o.ghost;
          });
        }

        return res.status(200).send(filteredProjects);
      })
      .catch((error) => {
        if (error.message === "401") {
          return res.status(401).send({ error: "Not authorized" });
        }
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to get a project with a public dashboard
  */
  app.get("/project/dashboard/:brewName", getUserFromToken, async (req, res) => {
    let processedProject;
    try {
      const project = await projectController.getPublicDashboard(req.params.brewName);
      processedProject = _.cloneDeep(project);
      processedProject.setDataValue("password", "");

      if (req.user) {
        // now determine whether to show the dashboard or not
        const teamRole = await teamController.getTeamRole(project.team_id, req.user.id);

        if ((teamRole && teamRole.role)) {
          return res.status(200).send(project);
        }
      }

      // LEGACY/INTERNAL: Check for accessToken first (bypasses SharePolicy for snapshots/internal)
      if (req.query.accessToken) {
        try {
          const decodedToken = jwt.verify(req.query.accessToken, settings.encryptionKey);
          if (decodedToken.project_id === project.id) {
            // Handle variables for legacy accessToken - not implemented yet
            const urlVariables = projectController._extractVariablesFromQuery(req.query);
            if (Object.keys(urlVariables).length > 0) {
              try {
                const updatedProject = await projectController
                  .applyVariablesToCharts(project, urlVariables);
                return res.status(200).send(updatedProject);
              } catch (error) {
                // If variable application fails, return the project without variables
                // eslint-disable-next-line no-console
                console.error("Failed to apply variables to dashboard:", error);
              }
            }

            return res.status(200).send(processedProject);
          }
        } catch (error) {
          // Token is invalid, continue with SharePolicy flow
        }
      }

      // Check if there's a SharePolicy for this project
      const sharePolicy = await db.SharePolicy.findOne({
        where: {
          entity_type: "Project",
          entity_id: project.id,
        },
      });

      // If SharePolicy exists, check the policy
      if (sharePolicy) {
        if (sharePolicy.visibility === "disabled") {
          return res.status(403).send("Share policy is disabled");
        }

        // SECURITY: SharePolicy tokens only work for public projects
        if (!project.public) {
          return res.status(401).send("Not authorized to access this page");
        }

        if (sharePolicy.visibility !== "public") {
          // SharePolicy exists and requires token verification
          if (!req.query.token) {
            if (project.public
              && project.passwordProtected
              && req.query.pass === project.password
            ) {
              // Allow password access for backwards compatibility if no token provided
              return res.status(200).send(processedProject);
            }
            return res.status(401).send("Access token required");
          }

          try {
            const decodedToken = jwt.verify(req.query.token, settings.encryptionKey);
            if (decodedToken?.sub?.type !== "Project" || `${decodedToken?.sub?.id}` !== `${project.id}`) {
              return res.status(401).send("Invalid token");
            }

            if (decodedToken?.exp < Date.now() / 1000) {
              return res.status(401).send("Token expired");
            }

            // SECURITY: If dashboard is password protected, require password even with valid token
            if (project.passwordProtected) {
              if (!req.query.pass || req.query.pass !== project.password) {
                return res.status(403).send("Enter the correct password");
              }
            }

            // Handle variable filtering based on share policy
            const urlVariables = projectController
              ._extractVariablesFromQuery(req.query);
            const finalVariables = projectController
              ._mergeVariablesWithPolicy(urlVariables, sharePolicy);

            // Apply variables to the charts if needed
            if (Object.keys(finalVariables).length > 0) {
              try {
                const updatedProject = await projectController
                  .applyVariablesToCharts(project, finalVariables);
                return res.status(200).send(updatedProject);
              } catch (error) {
                // If variable application fails, return the project without variables
                // eslint-disable-next-line no-console
                console.error("Failed to apply variables to dashboard:", error);
                return res.status(200).send(processedProject);
              }
            }

            return res.status(200).send(processedProject);
          } catch (tokenError) {
            return res.status(401).send("Invalid or expired token");
          }
        }
      }

      // Handle variables for projects without SharePolicy (backwards compatibility)
      // SECURITY: URL variables only processed for public projects
      if (project.public) {
        const urlVariables = projectController._extractVariablesFromQuery(req.query);
        if (Object.keys(urlVariables).length > 0) {
          // SECURITY: If dashboard is password protected, require password for URL variables
          if (project.passwordProtected) {
            if (!req.query.pass || req.query.pass !== project.password) {
              return res.status(403).send("Enter the correct password");
            }
          }

          try {
            const updatedProject = await projectController
              .applyVariablesToCharts(project, urlVariables);
            return res.status(200).send(updatedProject);
          } catch (error) {
            // If variable application fails, return the project without variables
            // eslint-disable-next-line no-console
            console.error("Failed to apply variables to dashboard:", error);
          }
        }
      }

      if (project.public && !project.passwordProtected) {
        return res.status(200).send(processedProject);
      }

      if (project.public && project.passwordProtected && req.query.pass === project.password) {
        return res.status(200).send(processedProject);
      }

      if (project.public && project.passwordProtected && req.query.pass !== project.password) {
        return res.status(403).send("Enter the correct password");
      }

      if (!project.public) return res.status(401).send("Not authorized to access this page");

      return res.status(400).send("Cannot get the data");
    } catch (error) {
      if (error && error.message === "404") {
        return res.status(404).send(error);
      }
      return res.status(400).send(error);
    }
  });
  // -------------------------------------------

  /*
  ** Route to generate a dashboard template
  */
  app.post("/project/:id/template/:template", verifyToken, checkPermissions("createAny"), (req, res) => {
    return projectController.generateTemplate(
      req.params.id,
      req.body,
      req.params.template,
    )
      .then((result) => {
        refreshChartsApi(req.params.id, result, req.headers.authorization);

        return res.status(200).send(result);
      })
      .catch((err) => {
        if (err && err.message && `${err.message}`.indexOf("404") > -1) {
          return res.status(404).send(err);
        }
        if (err && err.message && `${err.message}`.indexOf("403") > -1) {
          return res.status(403).send(err);
        }
        return res.status(400).send(err);
      });
  });
  // -------------------------------------------

  /*
  ** Route to get a project's variables
  */
  app.get("/project/:id/variables", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.getVariables(req.params.id)
      .then((variables) => {
        return res.status(200).send(variables);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to create a project variable
  */
  app.post("/project/:id/variables", verifyToken, checkPermissions("createOwn"), (req, res) => {
    return projectController.createVariable(req.params.id, req.body)
      .then((variable) => {
        return res.status(200).send(variable);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to update a project variable
  */
  app.put("/project/:id/variables/:variableId", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.updateVariable(req.params.variableId, req.body)
      .then((variable) => {
        return res.status(200).send(variable);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });

  /*
  ** Route to delete a project variable
  */
  app.delete("/project/:id/variables/:variableId", verifyToken, checkPermissions("deleteOwn"), (req, res) => {
    return projectController.deleteVariable(req.params.variableId)
      .then(() => {
        return res.status(200).send({ removed: true });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to take a snapshot of a project
  */
  app.post("/project/:id/snapshot", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.takeSnapshot(req.params.id, req.body)
      .then((snapshot) => {
        return res.status(200).send({ snapshot_path: snapshot });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to create a dashboard filter
  */
  app.post("/project/:id/dashboard-filter", verifyToken, checkPermissions("createOwn"), (req, res) => {
    return projectController.createDashboardFilter(req.params.id, req.body)
      .then((dashboardFilter) => {
        return res.status(200).send(dashboardFilter);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to get a dashboard filter
  */
  app.get("/project/:id/dashboard-filter/:dashboardFilterId", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.getDashboardFilter(req.params.dashboardFilterId)
      .then((dashboardFilter) => {
        return res.status(200).send(dashboardFilter);
      });
  });
  // -------------------------------------------

  /*
  ** Route to get all dashboard filters
  */
  app.get("/project/:id/dashboard-filters", verifyToken, checkPermissions("readOwn"), (req, res) => {
    return projectController.getDashboardFilters(req.params.id)
      .then((dashboardFilters) => {
        return res.status(200).send(dashboardFilters);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to update a dashboard filter
  */
  app.put("/project/:id/dashboard-filter/:dashboardFilterId", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.updateDashboardFilter(req.params.dashboardFilterId, req.body)
      .then((dashboardFilter) => {
        return res.status(200).send(dashboardFilter);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to delete a dashboard filter
  */
  app.delete("/project/:id/dashboard-filter/:dashboardFilterId", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.deleteDashboardFilter(req.params.dashboardFilterId)
      .then(() => {
        return res.status(200).send({ removed: true });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to create a project share policy
  */
  app.post("/project/:id/share/policy", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.createSharePolicy(req.params.id)
      .then((sharePolicy) => {
        return res.status(200).send(sharePolicy);
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  /*
  ** Route to generate a project share token
  */
  app.post("/project/:id/share/token", verifyToken, checkPermissions("updateOwn"), (req, res) => {
    return projectController.generateShareToken(req.params.id, req.body)
      .then(({ token, url }) => {
        return res.status(200).send({ token, url });
      })
      .catch((error) => {
        return res.status(400).send(error);
      });
  });
  // -------------------------------------------

  return (req, res, next) => {
    next();
  };
};
