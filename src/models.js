export const modelCatalog = [
  {
    id: "gpt-5.4",
    label: "GPT-5.4 Strategist",
    multiplier: 1.12,
    confidenceBias: 6,
    traits: "razonamiento profundo y sintesis robusta"
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini Scout",
    multiplier: 0.98,
    confidenceBias: 1,
    traits: "velocidad, patrones cortos y lectura agil"
  },
  {
    id: "time-series-engine",
    label: "Time-Series Engine",
    multiplier: 1.05,
    confidenceBias: 3,
    traits: "series temporales, tendencia y momentum"
  },
  {
    id: "risk-guardian",
    label: "Risk Guardian",
    multiplier: 0.94,
    confidenceBias: -3,
    traits: "prudencia, penalizacion de volatilidad y sesgos"
  },
  {
    id: "ensemble-researcher",
    label: "Ensemble Researcher",
    multiplier: 1.08,
    confidenceBias: 4,
    traits: "fusion de senales y comparacion de escenarios"
  }
];

export function getModelById(modelId) {
  return modelCatalog.find((model) => model.id === modelId) ?? modelCatalog[0];
}
