import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  Surface,
  TextField,
} from "@heroui/react";
import {
  LuArrowLeft,
  LuBot,
  LuChartArea,
  LuCheck,
  LuLayoutDashboard,
  LuPlus,
  LuSparkles,
} from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import canAccess from "../../config/canAccess";
import connectionImages from "../../config/connectionImages";
import {
  getChartTemplate,
  listChartTemplates,
  createFromChartTemplate,
  selectActiveChartTemplate,
  selectChartTemplateResult,
} from "../../slices/chartTemplate";
import { getConnection, selectConnections } from "../../slices/connection";
import { getProjects, selectProjects } from "../../slices/project";
import { selectTeam } from "../../slices/team";
import { selectUser } from "../../slices/user";
import { showAiModal } from "../../slices/ui";
import { useTheme } from "../../modules/ThemeContext";

function ConnectionNextSteps() {
  const [dashboardMode, setDashboardMode] = useState("existing");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [newDashboardName, setNewDashboardName] = useState("Stripe Revenue");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
  const [selectedChartIds, setSelectedChartIds] = useState([]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const params = useParams();
  const { isDark } = useTheme();

  const team = useSelector(selectTeam);
  const user = useSelector(selectUser);
  const connections = useSelector(selectConnections);
  const projects = useSelector(selectProjects);
  const template = useSelector(selectActiveChartTemplate);
  const result = useSelector(selectChartTemplateResult);
  const templateLoading = useSelector((state) => state.chartTemplate.loading);
  const templateError = useSelector((state) => state.chartTemplate.error);

  const connection = connections.find((item) => `${item.id}` === `${params.connectionId}`);
  const visibleProjects = useMemo(() => (projects || []).filter((project) => !project.ghost), [projects]);
  const canUseAi = user?.id && team?.TeamRoles && canAccess("teamAdmin", user.id, team.TeamRoles);

  useEffect(() => {
    if (team?.id && params.connectionId) {
      dispatch(getConnection({ team_id: team.id, connection_id: params.connectionId }));
      dispatch(getProjects({ team_id: team.id }));
    }
  }, [dispatch, params.connectionId, team?.id]);

  useEffect(() => {
    if (!selectedProjectId && visibleProjects.length > 0) {
      setSelectedProjectId(`${visibleProjects[0].id}`);
    }
  }, [selectedProjectId, visibleProjects]);

  useEffect(() => {
    if (team?.id && connection?.subType === "stripe") {
      dispatch(listChartTemplates({ team_id: team.id, source: "stripe" }))
        .then((response) => {
          const firstTemplate = response.payload?.[0];
          if (firstTemplate) {
            dispatch(getChartTemplate({
              team_id: team.id,
              source: firstTemplate.source,
              slug: firstTemplate.slug,
            }));
          }
        });
    }
  }, [connection?.subType, dispatch, team?.id]);

  useEffect(() => {
    if (template?.datasets?.length > 0 && selectedDatasetIds.length === 0) {
      setSelectedDatasetIds(template.datasets.map((dataset) => dataset.id));
    }
    if (template?.charts?.length > 0 && selectedChartIds.length === 0) {
      setSelectedChartIds(template.charts.map((chart) => chart.id));
    }
  }, [selectedChartIds.length, selectedDatasetIds.length, template]);

  const _onAskAi = () => {
    dispatch(showAiModal());
  };

  const _onBuildFromScratch = () => {
    navigate(`/datasets/new?connection_id=${params.connectionId}`);
  };

  const _toggleDataset = (datasetId) => {
    const nextDatasetIds = selectedDatasetIds.includes(datasetId)
      ? selectedDatasetIds.filter((id) => id !== datasetId)
      : [...selectedDatasetIds, datasetId];

    setSelectedDatasetIds(nextDatasetIds);
    setSelectedChartIds((currentChartIds) => template.charts
      .filter((chart) => currentChartIds.includes(chart.id))
      .filter((chart) => chart.requiredDatasetIds.every((id) => nextDatasetIds.includes(id)))
      .map((chart) => chart.id));
  };

  const _toggleChart = (chartId) => {
    if (selectedChartIds.includes(chartId)) {
      setSelectedChartIds(selectedChartIds.filter((id) => id !== chartId));
    } else {
      setSelectedChartIds([...selectedChartIds, chartId]);
    }
  };

  const _isChartAvailable = (chart) => {
    return chart.requiredDatasetIds.every((datasetId) => selectedDatasetIds.includes(datasetId));
  };

  const _createTemplates = () => {
    const dashboard = dashboardMode === "new"
      ? { type: "new", name: newDashboardName || "Stripe Revenue" }
      : { type: "existing", project_id: selectedProjectId };

    dispatch(createFromChartTemplate({
      team_id: team.id,
      source: "stripe",
      slug: template.slug,
      data: {
        connection_id: connection.id,
        dashboard,
        dataset_template_ids: selectedDatasetIds,
        chart_template_ids: selectedChartIds,
      },
    }));
  };

  const _renderGenericNextSteps = () => (
    <Surface className="rounded-3xl border border-divider p-5" variant="default">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xl font-semibold">Your connection is ready</p>
          <p className="text-sm text-foreground-500">Create a dataset to start visualizing this source.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Button variant="primary" onPress={_onBuildFromScratch}>
            <LuChartArea />
            Create dataset
          </Button>
          <Button variant="secondary" onPress={() => navigate("/")}>
            <LuLayoutDashboard />
            Return to dashboards
          </Button>
          {canUseAi && (
            <Button variant="tertiary" onPress={_onAskAi}>
              <LuBot />
              Create with AI
            </Button>
          )}
        </div>
      </div>
    </Surface>
  );

  if (!connection) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <span className="text-sm text-foreground-500">Loading connection...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex flex-row items-center gap-2">
        <Link to="/connections" className="text-xl font-semibold">
          <LuArrowLeft size={24} className="text-foreground" />
        </Link>
        <span className="text-xl font-semibold">Next steps</span>
      </div>

      <Surface className="rounded-3xl border border-divider p-5" variant="default">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-row items-center gap-3">
            <img
              alt={connection.subType || connection.type}
              className="h-14 w-14 rounded-lg object-contain"
              src={connectionImages(isDark)[connection.subType] || connectionImages(isDark)[connection.type]}
            />
            <div>
              <p className="text-xl font-semibold">{connection.name}</p>
              <p className="text-sm text-foreground-500">Choose how you want to start building.</p>
            </div>
          </div>
          <Button variant="tertiary" onPress={_onBuildFromScratch}>
            <LuChartArea />
            Build from scratch
          </Button>
        </div>
      </Surface>

      <div className="h-4" />
      {connection.subType !== "stripe" && _renderGenericNextSteps()}

      {connection.subType === "stripe" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Surface className="rounded-3xl border border-divider p-5" variant="default">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row items-center gap-2">
                    <LuSparkles className="text-primary" />
                    <p className="text-xl font-semibold">Use chart templates</p>
                  </div>
                  <p className="text-sm text-foreground-500">Select the Stripe datasets and prepared charts to create.</p>
                </div>

                {templateError && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Could not create templates</Alert.Title>
                      <Alert.Description>{templateError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                {templateLoading && !template && (
                  <span className="text-sm text-foreground-500">Loading Stripe templates...</span>
                )}

                {template && (
                  <>
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-sm text-foreground-500">{template.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <p className="mb-3 text-sm font-semibold">Datasets</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {template.datasets.map((dataset) => (
                          <Card key={dataset.id} className="border border-content3 shadow-none">
                            <Card.Content>
                              <Checkbox
                                id={`stripe-dataset-${dataset.id}`}
                                isSelected={selectedDatasetIds.includes(dataset.id)}
                                onChange={() => _toggleDataset(dataset.id)}
                              >
                                <Checkbox.Control className="size-4 shrink-0">
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                                <Checkbox.Content>
                                  <Label htmlFor={`stripe-dataset-${dataset.id}`} className="text-sm font-semibold">
                                    {dataset.name}
                                  </Label>
                                  <p className="text-xs text-foreground-500">{dataset.description}</p>
                                </Checkbox.Content>
                              </Checkbox>
                            </Card.Content>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold">Charts</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {template.charts.map((chart) => {
                          const available = _isChartAvailable(chart);
                          return (
                            <Card key={chart.id} className="border border-content3 shadow-none">
                              <Card.Content>
                                <Checkbox
                                  id={`stripe-chart-${chart.id}`}
                                  isDisabled={!available}
                                  isSelected={selectedChartIds.includes(chart.id) && available}
                                  onChange={() => _toggleChart(chart.id)}
                                >
                                  <Checkbox.Control className="size-4 shrink-0">
                                    <Checkbox.Indicator />
                                  </Checkbox.Control>
                                  <Checkbox.Content>
                                    <div className="flex flex-row items-center gap-2">
                                      <Label htmlFor={`stripe-chart-${chart.id}`} className="text-sm font-semibold">
                                        {chart.name}
                                      </Label>
                                      {!available && <Chip size="sm" variant="soft" color="warning">Needs dataset</Chip>}
                                    </div>
                                    <p className="text-xs text-foreground-500">{chart.description}</p>
                                  </Checkbox.Content>
                                </Checkbox>
                              </Card.Content>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Surface>
          </div>

          <div>
            <Surface className="rounded-3xl border border-divider p-5" variant="default">
              <div className="flex flex-col gap-4">
                <p className="text-lg font-semibold">Destination dashboard</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={dashboardMode === "existing" ? "primary" : "tertiary"}
                    onPress={() => setDashboardMode("existing")}
                  >
                    Existing
                  </Button>
                  <Button
                    variant={dashboardMode === "new" ? "primary" : "tertiary"}
                    onPress={() => setDashboardMode("new")}
                  >
                    <LuPlus />
                    New
                  </Button>
                </div>

                {dashboardMode === "existing" && (
                  <Select
                    placeholder="Select dashboard"
                    fullWidth
                    selectionMode="single"
                    value={selectedProjectId}
                    onChange={(value) => setSelectedProjectId(value)}
                    variant="secondary"
                  >
                    <Label>Select a dashboard</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {visibleProjects.map((project) => (
                          <ListBox.Item key={project.id} id={`${project.id}`} textValue={project.name}>
                            {project.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                {dashboardMode === "new" && (
                  <TextField fullWidth name="stripe-template-dashboard-name">
                    <Label>Dashboard name</Label>
                    <Input
                      value={newDashboardName}
                      onChange={(e) => setNewDashboardName(e.target.value)}
                      variant="secondary"
                    />
                  </TextField>
                )}

                <Separator />

                <div className="flex flex-col gap-1 text-sm text-foreground-500">
                  <span>{`${selectedDatasetIds.length} datasets selected`}</span>
                  <span>{`${selectedChartIds.length} charts selected`}</span>
                </div>

                {result && (
                  <Alert status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Stripe dashboard created</Alert.Title>
                      <Alert.Description>
                        {`${result.datasets.length} datasets and ${result.charts.length} charts were created.`}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                {!result && (
                  <Button
                    isDisabled={!template || selectedDatasetIds.length === 0 || selectedChartIds.length === 0 || (dashboardMode === "existing" && !selectedProjectId)}
                    isPending={templateLoading}
                    variant="primary"
                    onPress={_createTemplates}
                  >
                    <LuSparkles />
                    Create selected charts
                  </Button>
                )}

                {result && (
                  <Button
                    variant="primary"
                    onPress={() => navigate(`/dashboard/${result.project_id}`)}
                  >
                    <LuCheck />
                    Open dashboard
                  </Button>
                )}
              </div>
            </Surface>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionNextSteps;

