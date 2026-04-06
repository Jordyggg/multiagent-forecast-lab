import { defaultAgents, buildAgentState, runMultiAgentDebate } from "./agents.js";
import { modelCatalog } from "./models.js";
import { parseCsv, listTeams } from "./parser.js";
import { sampleCsv } from "./sampleData.js";

const state = {
  rows: [],
  teams: [],
  agentState: buildAgentState(),
  latestResult: null
};

const elements = {
  scenarioTitle: document.querySelector("#scenario-title"),
  homeTeam: document.querySelector("#home-team"),
  awayTeam: document.querySelector("#away-team"),
  csvInput: document.querySelector("#csv-input"),
  agentGrid: document.querySelector("#agent-grid"),
  loadSample: document.querySelector("#load-sample"),
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

function bootstrap() {
  renderAgentControls();
  bindEvents();
  elements.csvInput.value = sampleCsv;
  ingestCsv(sampleCsv);
  renderEmptyState();
}

function bindEvents() {
  elements.loadSample.addEventListener("click", () => {
    elements.csvInput.value = sampleCsv;
    ingestCsv(sampleCsv);
    renderEmptyState();
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
  elements.decisionSubtitle.textContent = "Usa el dataset demo o pega tus propios datos historicos.";
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
