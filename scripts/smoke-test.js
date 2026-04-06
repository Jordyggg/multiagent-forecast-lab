import { sampleCsv } from "../src/sampleData.js";
import { parseCsv } from "../src/parser.js";
import { buildAgentState, runMultiAgentDebate } from "../src/agents.js";

const rows = parseCsv(sampleCsv);
const result = runMultiAgentDebate({
  rows,
  homeTeam: "Aurora FC",
  awayTeam: "Titan United",
  agentState: buildAgentState(),
  scenarioTitle: "Smoke Test"
});

console.log(JSON.stringify(result.summary, null, 2));
