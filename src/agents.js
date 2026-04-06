import { getModelById } from "./models.js";

export const defaultAgents = [
  {
    id: "historian",
    name: "Historian",
    role: "Lee el largo plazo y detecta dominancia estructural.",
    defaultModel: "gpt-5.4",
    defaultWeight: 1.2,
    coefficients: { formEdge: 0.24, attackEdge: 0.26, defenseEdge: 0.2, homeAdvantage: 0.16, volatilityEdge: -0.14, injuryEdge: -0.14 }
  },
  {
    id: "momentum",
    name: "Momentum Scout",
    role: "Premia la forma reciente y los cambios de ritmo.",
    defaultModel: "time-series-engine",
    defaultWeight: 1.1,
    coefficients: { formEdge: 0.34, attackEdge: 0.2, defenseEdge: 0.16, homeAdvantage: 0.1, volatilityEdge: -0.1, injuryEdge: -0.1 }
  },
  {
    id: "risk",
    name: "Risk Auditor",
    role: "Busca sesgos, volatilidad y razones para no sobreconfiar.",
    defaultModel: "risk-guardian",
    defaultWeight: 1,
    coefficients: { formEdge: 0.08, attackEdge: 0.1, defenseEdge: 0.12, homeAdvantage: 0.06, volatilityEdge: -0.34, injuryEdge: -0.3 }
  },
  {
    id: "contrarian",
    name: "Contrarian",
    role: "Discute el consenso y estresa escenarios opuestos.",
    defaultModel: "ensemble-researcher",
    defaultWeight: 0.9,
    coefficients: { formEdge: -0.08, attackEdge: 0.14, defenseEdge: 0.12, homeAdvantage: 0.05, volatilityEdge: -0.25, injuryEdge: -0.08 }
  },
  {
    id: "strategist",
    name: "Decision Synthesizer",
    role: "Convierte el debate en una decision accionable y entendible.",
    defaultModel: "gpt-5.4",
    defaultWeight: 1.3,
    coefficients: { formEdge: 0.24, attackEdge: 0.24, defenseEdge: 0.24, homeAdvantage: 0.12, volatilityEdge: -0.1, injuryEdge: -0.06 }
  }
];

export function buildAgentState() {
  return defaultAgents.map((agent) => ({
    id: agent.id,
    enabled: true,
    modelId: agent.defaultModel,
    weight: agent.defaultWeight
  }));
}

export function runMultiAgentDebate({ rows, homeTeam, awayTeam, agentState, scenarioTitle }) {
  const homeHistory = selectTeamRows(rows, homeTeam).slice(-8);
  const awayHistory = selectTeamRows(rows, awayTeam).slice(-8);

  if (homeTeam === awayTeam) {
    throw new Error("Selecciona dos equipos distintos para comparar el escenario.");
  }

  if (homeHistory.length < 3 || awayHistory.length < 3) {
    throw new Error("Se necesitan al menos 3 partidos historicos por cada equipo para generar una lectura confiable.");
  }

  const homeMetrics = calculateTeamMetrics(homeHistory, "home");
  const awayMetrics = calculateTeamMetrics(awayHistory, "away");
  const features = buildFeatureVector(homeMetrics, awayMetrics);

  const reports = defaultAgents
    .map((agent) => {
      const currentState = agentState.find((item) => item.id === agent.id);
      if (!currentState?.enabled) {
        return null;
      }

      const model = getModelById(currentState.modelId);
      const signal = evaluateSignal(agent.coefficients, features);
      const confidence = deriveConfidence(features, model, currentState.weight, agent.id);

      return {
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        model,
        weight: currentState.weight,
        signal,
        confidence,
        stance: classifySignal(signal),
        thesis: buildThesis(agent.id, features, homeTeam, awayTeam, model),
        alerts: buildAlerts(agent.id, features, awayTeam),
        contribution: signal * (confidence / 100) * currentState.weight * model.multiplier
      };
    })
    .filter(Boolean);

  if (!reports.length) {
    throw new Error("Activa al menos un agente para poder generar consenso.");
  }

  const consensusScore = reports.reduce((total, report) => total + report.contribution, 0) / reports.length;
  const homeWinProbability = clamp(50 + consensusScore * 26, 8, 89);
  const confidence = clamp(
    reports.reduce((total, report) => total + report.confidence, 0) / reports.length,
    28,
    94
  );
  const drawProbability = clamp(18 + Math.abs(50 - homeWinProbability) * -0.22 + averageVolatility(homeMetrics, awayMetrics) * 16, 9, 29);
  const awayWinProbability = clamp(100 - homeWinProbability - drawProbability, 5, 78);
  const projectedScoreline = estimateScoreline(homeMetrics, awayMetrics);

  return {
    scenarioTitle,
    homeTeam,
    awayTeam,
    homeMetrics,
    awayMetrics,
    features,
    reports,
    summary: {
      homeWinProbability,
      awayWinProbability,
      drawProbability,
      confidence,
      riskLevel: confidence > 72 ? "Gestionable" : confidence > 56 ? "Moderado" : "Elevado",
      recommendation: buildRecommendation(homeWinProbability, confidence),
      decision: buildDecision(homeWinProbability, confidence, homeTeam, awayTeam),
      scoreline: projectedScoreline
    }
  };
}

function selectTeamRows(rows, team) {
  return rows
    .filter((row) => row.team === team)
    .sort((left, right) => new Date(left.date) - new Date(right.date));
}

function calculateTeamMetrics(history, preferredLocation) {
  const totals = history.reduce(
    (accumulator, match, index) => {
      const recencyWeight = 0.72 + (index / history.length) * 0.55;
      accumulator.points += match.form_points;
      accumulator.weightedPoints += match.form_points * recencyWeight;
      accumulator.goalsFor += match.team_score;
      accumulator.goalsAgainst += match.opponent_score;
      accumulator.xgDelta += match.xg_for - match.xg_against;
      accumulator.shotsDelta += match.shots_for - match.shots_against;
      accumulator.injuries += match.injuries;
      accumulator.marketOdds += match.market_odds;
      accumulator.goalDiffSeries.push(match.goal_diff);
      accumulator.formSeries.push(match.form_points);
      if (match.location === preferredLocation) {
        accumulator.locationBoost += match.form_points;
      }
      return accumulator;
    },
    {
      points: 0,
      weightedPoints: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      xgDelta: 0,
      shotsDelta: 0,
      injuries: 0,
      marketOdds: 0,
      locationBoost: 0,
      goalDiffSeries: [],
      formSeries: []
    }
  );

  const sampleSize = history.length;
  return {
    sampleSize,
    pointsPerGame: totals.points / sampleSize,
    weightedPointsPerGame: totals.weightedPoints / sampleSize,
    goalsForPerGame: totals.goalsFor / sampleSize,
    goalsAgainstPerGame: totals.goalsAgainst / sampleSize,
    xgDeltaPerGame: totals.xgDelta / sampleSize,
    shotsDeltaPerGame: totals.shotsDelta / sampleSize,
    injuriesPerGame: totals.injuries / sampleSize,
    avgMarketOdds: totals.marketOdds / sampleSize,
    locationBoost: totals.locationBoost / sampleSize,
    volatility: standardDeviation(totals.goalDiffSeries),
    formSeries: totals.formSeries,
    goalDiffSeries: totals.goalDiffSeries,
    averageGoalDiff: average(totals.goalDiffSeries)
  };
}

function buildFeatureVector(homeMetrics, awayMetrics) {
  return {
    formEdge: normalize(homeMetrics.weightedPointsPerGame - awayMetrics.weightedPointsPerGame, 2),
    attackEdge: normalize(
      (homeMetrics.goalsForPerGame + homeMetrics.xgDeltaPerGame * 0.7 + homeMetrics.shotsDeltaPerGame * 0.05) -
      (awayMetrics.goalsForPerGame + awayMetrics.xgDeltaPerGame * 0.7 + awayMetrics.shotsDeltaPerGame * 0.05),
      3
    ),
    defenseEdge: normalize(
      (awayMetrics.goalsAgainstPerGame - homeMetrics.goalsAgainstPerGame) +
      (homeMetrics.xgDeltaPerGame - awayMetrics.xgDeltaPerGame) * 0.45,
      3
    ),
    homeAdvantage: normalize(homeMetrics.locationBoost - awayMetrics.locationBoost, 3),
    volatilityEdge: normalize(awayMetrics.volatility - homeMetrics.volatility, 2),
    injuryEdge: normalize(awayMetrics.injuriesPerGame - homeMetrics.injuriesPerGame, 2),
    marketEdge: normalize(awayMetrics.avgMarketOdds - homeMetrics.avgMarketOdds, 2)
  };
}

function evaluateSignal(coefficients, features) {
  const rawScore = Object.entries(coefficients).reduce((total, [key, value]) => total + value * features[key], 0) + features.marketEdge * 0.06;
  return clamp(rawScore * 100, -100, 100) / 100;
}

function deriveConfidence(features, model, weight, agentId) {
  const featureStrength =
    Math.abs(features.formEdge) * 24 +
    Math.abs(features.attackEdge) * 20 +
    Math.abs(features.defenseEdge) * 16 +
    Math.abs(features.homeAdvantage) * 10;
  const riskPenalty = Math.max(0, 14 - features.volatilityEdge * 12 - features.injuryEdge * 6);
  const roleBias = agentId === "risk" ? -4 : agentId === "strategist" ? 4 : 0;
  return clamp(48 + featureStrength - riskPenalty + model.confidenceBias + weight * 8 + roleBias, 35, 95);
}

function buildThesis(agentId, features, homeTeam, awayTeam, model) {
  const advantage = features.formEdge + features.attackEdge + features.defenseEdge + features.homeAdvantage;
  const edgeTeam = advantage >= 0 ? homeTeam : awayTeam;
  const balance = Math.abs(advantage) > 1.1 ? "una ventaja marcada" : Math.abs(advantage) > 0.55 ? "una ventaja razonable" : "un duelo muy fino";

  const intros = {
    historian: `${model.label} detecta ${balance} para ${edgeTeam} cuando se observa la pelicula completa del historial.`,
    momentum: `${model.label} encuentra que el pulso reciente esta inclinando el escenario hacia ${edgeTeam}.`,
    risk: `${model.label} evalua si el favoritismo es real o si solo parece fuerte por una lectura incompleta.`,
    contrarian: `${model.label} intenta romper el consenso inicial para descubrir donde el mercado podria estar exagerando.`,
    strategist: `${model.label} integra las senales para producir una decision con foco practico.`
  };

  return `${intros[agentId]} Form edge ${toSigned(features.formEdge)}, ataque ${toSigned(features.attackEdge)} y defensa ${toSigned(features.defenseEdge)}.`;
}

function buildAlerts(agentId, features, awayTeam) {
  const alerts = [];

  if (features.volatilityEdge < -0.15) {
    alerts.push("La volatilidad reciente del favorito reduce la fiabilidad del pronostico.");
  }

  if (features.injuryEdge < -0.1) {
    alerts.push("La carga de lesiones del lado local obliga a bajar conviccion.");
  }

  if (Math.abs(features.attackEdge) < 0.12 && agentId !== "momentum") {
    alerts.push("No hay una superioridad ofensiva rotunda; el partido puede trabarse.");
  }

  if (features.marketEdge < -0.12 && agentId === "contrarian") {
    alerts.push(`El mercado esta mas alineado con ${awayTeam} de lo que sugiere la narrativa popular.`);
  }

  if (!alerts.length) {
    alerts.push("No detecta alarmas criticas fuera del ruido normal del evento.");
  }

  return alerts;
}

function buildRecommendation(homeProbability, confidence) {
  if (homeProbability >= 64 && confidence >= 70) {
    return {
      label: "Accion decidida",
      copy: "El consenso favorece una postura ofensiva: hay senal suficiente para respaldar la opcion A."
    };
  }

  if (homeProbability >= 55 && confidence >= 58) {
    return {
      label: "Ventaja ligera",
      copy: "La opcion A parece superior, pero conviene gestionar riesgo y no sobredimensionar la apuesta."
    };
  }

  if (homeProbability <= 42) {
    return {
      label: "Replantear escenario",
      copy: "La lectura favorece a la opcion B o un guion opuesto al esperado inicialmente."
    };
  }

  return {
    label: "Esperar confirmacion",
    copy: "Hay argumentos cruzados; se recomienda recolectar una variable extra antes de decidir."
  };
}

function buildDecision(homeProbability, confidence, homeTeam, awayTeam) {
  if (homeProbability >= 62 && confidence >= 68) {
    return `${homeTeam} llega como favorito razonado`;
  }

  if (homeProbability <= 41 && confidence >= 58) {
    return `${awayTeam} puede romper el libreto`;
  }

  return "Escenario abierto con ligera inclinacion";
}

function estimateScoreline(homeMetrics, awayMetrics) {
  const homeGoals = clamp(
    Math.round((homeMetrics.goalsForPerGame + awayMetrics.goalsAgainstPerGame) / 1.55 + homeMetrics.xgDeltaPerGame * 0.35),
    0,
    4
  );
  const awayGoals = clamp(
    Math.round((awayMetrics.goalsForPerGame + homeMetrics.goalsAgainstPerGame) / 1.7 + awayMetrics.xgDeltaPerGame * 0.28),
    0,
    4
  );

  return `${homeGoals} - ${awayGoals}`;
}

function classifySignal(signal) {
  if (signal > 0.18) {
    return "positive";
  }
  if (signal < -0.12) {
    return "negative";
  }
  return "cautious";
}

function averageVolatility(homeMetrics, awayMetrics) {
  return (homeMetrics.volatility + awayMetrics.volatility) / 2;
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values) {
  const mean = average(values);
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalize(value, scale) {
  return clamp(value / scale, -1, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toSigned(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
