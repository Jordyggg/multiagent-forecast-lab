import { defaultAgents, buildAgentState, runMultiAgentDebate } from "./agents.js";
import { modelCatalog } from "./models.js";
import { parseCsv, listTeams } from "./parser.js";
import { sampleCsv } from "./sampleData.js";

const fallbackProviders = [
  {
    id: "demo",
    name: "Dataset demo seguro",
    configured: true,
    docsUrl: "local-demo",
    notes: "Fuente local incluida en el proyecto."
  },
  {
    id: "football-data",
    name: "football-data.org",
    configured: false,
    docsUrl: "https://www.football-data.org/documentation/quickstart",
    notes: "Conector oficial para datos autorizados con token en servidor."
  },
  {
    id: "sportmonks",
    name: "Sportmonks",
    configured: false,
    docsUrl: "https://docs.sportmonks.com/football",
    notes: "Reservado para estadisticas avanzadas como xG en futuras iteraciones."
  }
];

const state = {
  rows: [],
  teams: [],
  agentState: buildAgentState(),
  latestResult: null,
  providers: fallbackProviders,
  currentSourceId: "demo"
};

const elements = {
  dataSource: document.querySelector("#data-source"),
  dataSourceHelp: document.querySelector("#data-source-help"),
  providerTeamIds: document.querySelector("#provider-team-ids"),
  providerSeason: document.querySelector("#provider-season"),
  providerCompetition: document.querySelector("#provider-competition"),
  providerStatus: document.querySelector("#provider-status"),
  loadProvider: document.querySelector("#load-provider"),
  scenarioTitle: document.querySelector("#scenario-title"),
  homeTeam: document.querySelector("#home-team"),
  awayTeam: document.querySelector("#away-team"),
  csvInput: document.querySelector("#csv-input"),
  agentGrid: document.querySelector("#agent-grid"),
  runForecast: document.querySelector("#run-forecast"),
  decisionTitle: document.querySelector("#decision-title"),
  decisionSubtitle: document.querySelector("#decision-subtitle"),
  homeProb: document.querySelector("#home-prob"),
  probDetail: document.querySelector("#prob-detail"),
  confidenceScore: document.querySelector("#confidence-score"),
  riskDetail: document.querySelector("#risk-detail"),
  scoreline: document.querySelector("#scoreline"),
  scoreRationale: document.querySelector("#score-rationale"),
  recommendationLabel: document.querySelector("#recommendation-label"),
  recommendationCopy: document.querySelector("#recommendation-copy"),
  agentOutput: document.querySelector("#agent-output"),
  trendChart: document.querySelector("#trend-chart"),
  exportReport: document.querySelector("#export-report"),
  agentCardTemplate: document.querySelector("#agent-card-template")
};

bootstrap();

async function bootstrap() {
  renderAgentControls();
  bindEvents();
  await loadProviderCatalog();
  elements.dataSource.value = state.currentSourceId;
  renderProviderDetails();

  try {
    await importSelectedSource({ resetOutput: false });
  } catch (error) {
    elements.csvInput.value = sampleCsv;
    ingestCsv(sampleCsv);
    setProviderStatus(error.message, "provider-warn");
  }

  renderEmptyState();
}

function bindEvents() {
  elements.dataSource.addEventListener("change", () => {
    state.currentSourceId = elements.dataSource.value;
    renderProviderDetails();
  });

  elements.loadProvider.addEventListener("click", async () => {
    try {
      await importSelectedSource({ resetOutput: true });
    } catch (error) {
      setProviderStatus(error.message, "provider-error");
      renderError(error.message);
    }
  });

  elements.runForecast.addEventListener("click", () => {
    try {
      ingestCsv(elements.csvInput.value);
      const result = runMultiAgentDebate({
        rows: state.rows,
        homeTeam: elements.homeTeam.value,
        awayTeam: elements.awayTeam.value,
        agentState: state.agentState,
        scenarioTitle: elements.scenarioTitle.value.trim() || "Escenario sin nombre"
      });
      state.latestResult = result;
      renderResult(result);
    } catch (error) {
      renderError(error.message);
    }
  });

  elements.exportReport.addEventListener("click", () => {
    if (!state.latestResult) {
      window.alert("Primero ejecuta el analisis para exportar un reporte.");
      return;
    }

    const report = buildReportMarkdown(state.latestResult);
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "multiagent-forecast-report.md";
    link.click();
    URL.revokeObjectURL(url);
  });
}

async function loadProviderCatalog() {
  try {
    const response = await fetch("/api/providers");
    if (!response.ok) {
      throw new Error("No se pudo cargar el catalogo de conectores del servidor.");
    }

    const payload = await response.json();
    state.providers = payload.providers;
  } catch (error) {
    state.providers = fallbackProviders;
  }
}

async function importSelectedSource({ resetOutput }) {
  const sourceId = elements.dataSource.value;
  state.currentSourceId = sourceId;

  if (sourceId === "manual") {
    ingestCsv(elements.csvInput.value);
    setProviderStatus("CSV manual cargado correctamente.", "provider-ok");
    if (resetOutput) {
      renderEmptyState();
    }
    return;
  }

  setProviderStatus("Importando dataset desde el conector seleccionado...", "provider-warn");

  const response = await fetch("/api/providers/load", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceId,
      params: {
        teamIds: elements.providerTeamIds.value,
        season: elements.providerSeason.value,
        competitionCode: elements.providerCompetition.value
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "La importacion del proveedor fallo.");
  }

  elements.csvInput.value = payload.csvText;
  ingestCsv(payload.csvText);

  const sourceLabel = payload.metadata?.sourceLabel || sourceId;
  const coverage = payload.metadata?.coverage ? ` Cobertura: ${payload.metadata.coverage}.` : "";
  const caveat = payload.metadata?.caveat ? ` ${payload.metadata.caveat}` : "";
  setProviderStatus(`${sourceLabel} importado correctamente.${coverage}${caveat}`, "provider-ok");

  if (resetOutput) {
    renderEmptyState();
  }
}

function renderProviderDetails() {
  const provider = state.providers.find((item) => item.id === state.currentSourceId);

  if (state.currentSourceId === "manual") {
    elements.dataSourceHelp.textContent = "Modo manual: puedes pegar tu propio CSV, editarlo y ejecutar el analisis localmente.";
    setProviderStatus("Sin dependencia externa. Tus datos quedan completamente bajo control del proyecto.", "provider-ok");
    return;
  }

  if (!provider) {
    elements.dataSourceHelp.textContent = "Conector no reconocido.";
    setProviderStatus("Selecciona una fuente valida.", "provider-error");
    return;
  }

  elements.dataSourceHelp.textContent = provider.notes;

  if (provider.configured) {
    setProviderStatus(`${provider.name} esta listo para importar desde el servidor.`, "provider-ok");
  } else {
    setProviderStatus(`${provider.name} aun no esta configurado en este entorno. Puedes seguir trabajando con el dataset demo o CSV manual.`, "provider-warn");
  }
}

function setProviderStatus(message, className) {
  elements.providerStatus.textContent = message;
  elements.providerStatus.className = className;
}

function ingestCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error("No pude leer el CSV. Verifica que tenga encabezados y filas.");
  }

  state.rows = rows;
  state.teams = listTeams(rows);
  fillTeamSelectors(state.teams);
}

function fillTeamSelectors(teams) {
  const currentHome = elements.homeTeam.value;
  const currentAway = elements.awayTeam.value;

  elements.homeTeam.innerHTML = "";
  elements.awayTeam.innerHTML = "";

  teams.forEach((team) => {
    elements.homeTeam.add(new Option(team, team));
    elements.awayTeam.add(new Option(team, team));
  });

  elements.homeTeam.value = teams.includes(currentHome) ? currentHome : teams[0];
  elements.awayTeam.value = teams.includes(currentAway) ? currentAway : teams[1] ?? teams[0];

  if (elements.homeTeam.value === elements.awayTeam.value && teams.length > 1) {
    elements.awayTeam.value = teams.find((team) => team !== elements.homeTeam.value);
  }
}

function renderAgentControls() {
  elements.agentGrid.innerHTML = "";

  defaultAgents.forEach((agent) => {
    const fragment = elements.agentCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".agent-card");
    const currentState = state.agentState.find((item) => item.id === agent.id);
    const enabled = fragment.querySelector(".agent-enabled");
    const modelSelect = fragment.querySelector(".agent-model");
    const weightInput = fragment.querySelector(".agent-weight");
    const weightLabel = fragment.querySelector(".agent-weight-label");

    fragment.querySelector(".agent-name").textContent = agent.name;
    fragment.querySelector(".agent-role").textContent = agent.role;

    enabled.checked = currentState.enabled;
    enabled.addEventListener("change", () => {
      currentState.enabled = enabled.checked;
    });

    modelCatalog.forEach((model) => {
      modelSelect.add(new Option(model.label, model.id));
    });
    modelSelect.value = currentState.modelId;
    modelSelect.addEventListener("change", () => {
      currentState.modelId = modelSelect.value;
    });

    weightInput.value = String(currentState.weight);
    weightLabel.textContent = `Influencia: ${currentState.weight.toFixed(1)}x`;
    weightInput.addEventListener("input", () => {
      currentState.weight = Number(weightInput.value);
      weightLabel.textContent = `Influencia: ${currentState.weight.toFixed(1)}x`;
    });

    card.dataset.agentId = agent.id;
    elements.agentGrid.append(fragment);
  });
}

function renderEmptyState() {
  elements.decisionTitle.textContent = "Listo para analizar";
  elements.decisionSubtitle.textContent = "Usa un conector oficial, el dataset demo o pega tus propios datos historicos.";
  elements.homeProb.textContent = "--";
  elements.probDetail.textContent = "Sin consenso aun";
  elements.confidenceScore.textContent = "--";
  elements.riskDetail.textContent = "Esperando debate";
  elements.scoreline.textContent = "--";
  elements.scoreRationale.textContent = "Sin estimacion";
  elements.recommendationLabel.textContent = "--";
  elements.recommendationCopy.textContent = "Sin recomendacion";
  elements.agentOutput.innerHTML = "";
  elements.trendChart.innerHTML = `<div class="chart-empty">El grafico cobrara vida cuando ejecutes el analisis.</div>`;
}

function renderError(message) {
  elements.decisionTitle.textContent = "No fue posible generar la prediccion";
  elements.decisionSubtitle.textContent = message;
  elements.agentOutput.innerHTML = "";
  elements.trendChart.innerHTML = `<div class="chart-empty">${message}</div>`;
}

function renderResult(result) {
  const { summary, reports, homeTeam, awayTeam, homeMetrics, awayMetrics } = result;

  elements.decisionTitle.textContent = summary.decision;
  elements.decisionSubtitle.textContent = `${result.scenarioTitle} con ${reports.length} agentes activos`;
  elements.homeProb.textContent = `${summary.homeWinProbability.toFixed(1)}%`;
  elements.probDetail.textContent = `${homeTeam}: ${summary.homeWinProbability.toFixed(1)}% | Empate: ${summary.drawProbability.toFixed(1)}% | ${awayTeam}: ${summary.awayWinProbability.toFixed(1)}%`;
  elements.confidenceScore.textContent = `${summary.confidence.toFixed(0)} / 100`;
  elements.riskDetail.textContent = `Riesgo ${summary.riskLevel}`;
  elements.scoreline.textContent = summary.scoreline;
  elements.scoreRationale.textContent = `${homeTeam} GF ${homeMetrics.goalsForPerGame.toFixed(2)} vs ${awayTeam} GC ${awayMetrics.goalsAgainstPerGame.toFixed(2)}`;
  elements.recommendationLabel.textContent = summary.recommendation.label;
  elements.recommendationCopy.textContent = summary.recommendation.copy;

  renderAgentReports(reports);
  renderTrendChart(homeTeam, awayTeam, homeMetrics.formSeries, awayMetrics.formSeries);
}

function renderAgentReports(reports) {
  elements.agentOutput.innerHTML = reports
    .map((report) => {
      const signalClass =
        report.stance === "positive" ? "signal-positive" : report.stance === "negative" ? "signal-negative" : "signal-cautious";
      const stanceLabel =
        report.stance === "positive" ? "A favor de la opcion A" : report.stance === "negative" ? "Resistencia al consenso" : "Lectura cauta";

      return `
        <article class="agent-report">
          <div class="agent-meta">
            <h3>${report.name}</h3>
            <small>${report.model.label}</small>
            <small>Peso ${report.weight.toFixed(1)}x</small>
            <span class="agent-signal ${signalClass}">${stanceLabel}</span>
            <small>Confianza ${report.confidence.toFixed(0)} / 100</small>
          </div>
          <div class="agent-thesis">
            <p>${report.thesis}</p>
            <ul class="agent-alerts">
              ${report.alerts.map((alert) => `<li>${alert}</li>`).join("")}
            </ul>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTrendChart(homeTeam, awayTeam, homeSeries, awaySeries) {
  const width = 720;
  const height = 230;
  const padding = 24;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const maxLength = Math.max(homeSeries.length, awaySeries.length);
  const values = [...homeSeries, ...awaySeries];
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 3);

  const mapPoint = (value, index, length) => {
    const x = padding + (index / Math.max(length - 1, 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return [x, y];
  };

  const buildPath = (series) =>
    series.map((value, index) => mapPoint(value, index, maxLength).join(",")).join(" ");

  const homePoints = buildPath(homeSeries);
  const awayPoints = buildPath(awaySeries);

  const homeCircles = homeSeries
    .map((value, index) => {
      const [x, y] = mapPoint(value, index, maxLength);
      return `<circle class="chart-point-home" cx="${x}" cy="${y}" r="4"></circle>`;
    })
    .join("");

  const awayCircles = awaySeries
    .map((value, index) => {
      const [x, y] = mapPoint(value, index, maxLength);
      return `<circle class="chart-point-away" cx="${x}" cy="${y}" r="4"></circle>`;
    })
    .join("");

  elements.trendChart.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ritmo reciente de puntos por partido">
      <line class="chart-axis" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}"></line>
      <line class="chart-axis" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}"></line>
      <polyline class="chart-line-home" points="${homePoints}"></polyline>
      <polyline class="chart-line-away" points="${awayPoints}"></polyline>
      ${homeCircles}
      ${awayCircles}
      <text class="chart-label" x="${padding}" y="18">${homeTeam}</text>
      <text class="chart-label" x="${width - 150}" y="18">${awayTeam}</text>
      <text class="chart-label" x="${padding}" y="${height - 8}">Partidos recientes</text>
      <text class="chart-label" x="${padding + 8}" y="${padding + 10}">3 pts</text>
      <text class="chart-label" x="${padding + 8}" y="${padding + chartHeight / 2}">1.5 pts</text>
      <text class="chart-label" x="${padding + 8}" y="${height - padding - 8}">0 pts</text>
    </svg>
  `;
}

function buildReportMarkdown(result) {
  const timestamp = new Date().toLocaleString("es-EC");
  const lines = [
    `# ${result.scenarioTitle}`,
    "",
    `Generado: ${timestamp}`,
    "",
    `Fuente de datos: ${state.currentSourceId}`,
    "",
    "## Decision",
    `- Decision principal: ${result.summary.decision}`,
    `- ${result.homeTeam}: ${result.summary.homeWinProbability.toFixed(1)}%`,
    `- Empate: ${result.summary.drawProbability.toFixed(1)}%`,
    `- ${result.awayTeam}: ${result.summary.awayWinProbability.toFixed(1)}%`,
    `- Confianza: ${result.summary.confidence.toFixed(0)} / 100`,
    `- Riesgo: ${result.summary.riskLevel}`,
    `- Marcador estimado: ${result.summary.scoreline}`,
    `- Recomendacion: ${result.summary.recommendation.label} - ${result.summary.recommendation.copy}`,
    "",
    "## Debate por agente",
    ...result.reports.flatMap((report) => [
      `### ${report.name}`,
      `- Modelo: ${report.model.label}`,
      `- Confianza: ${report.confidence.toFixed(0)} / 100`,
      `- Tesis: ${report.thesis}`,
      `- Alertas: ${report.alerts.join(" | ")}`,
      ""
    ])
  ];

  return lines.join("\n");
}
