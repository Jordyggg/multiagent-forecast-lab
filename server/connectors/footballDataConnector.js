import https from "node:https";
import { buildCsv, createProviderError, parseTeamIds } from "./shared.js";

const apiBaseUrl = "https://api.football-data.org/v4";

export const footballDataConnector = {
  id: "football-data",
  name: "football-data.org",
  mode: "official-api",
  configured: Boolean(process.env.FOOTBALL_DATA_API_TOKEN),
  docsUrl: "https://www.football-data.org/documentation/quickstart",
  notes: "Conector oficial pensado para datos autorizados. Usa X-Auth-Token en servidor y convierte partidos terminados al formato del laboratorio.",
  async loadDataset(params = {}) {
    if (!process.env.FOOTBALL_DATA_API_TOKEN) {
      throw createProviderError("Configura FOOTBALL_DATA_API_TOKEN para usar football-data.org.", 400);
    }

    const teamIds = parseTeamIds(params.teamIds);
    if (!teamIds.length) {
      throw createProviderError("Indica al menos un team ID valido, por ejemplo 57,64.", 400);
    }

    const season = String(params.season || "").trim();
    const competitionCode = String(params.competitionCode || "").trim();
    const rowBuckets = await Promise.all(
      teamIds.map((teamId) => fetchTeamMatches({ teamId, season, competitionCode }))
    );

    const rows = rowBuckets.flat();
    if (!rows.length) {
      throw createProviderError("football-data.org no devolvio partidos terminados para esos parametros.", 404);
    }

    return {
      csvText: buildCsv(rows),
      metadata: {
        sourceLabel: this.name,
        coverage: competitionCode || "Multicompeticion",
        teams: teamIds.join(", "),
        caveat: "football-data.org entrega una cobertura mas solida en resultados y odds que en estadisticas avanzadas como xG."
      }
    };
  }
};

async function fetchTeamMatches({ teamId, season, competitionCode }) {
  const search = new URLSearchParams({ status: "FINISHED", limit: "12" });
  if (season) {
    search.set("season", season);
  }
  if (competitionCode) {
    search.set("competitions", competitionCode);
  }

  const url = `${apiBaseUrl}/teams/${teamId}/matches?${search.toString()}`;
  const payload = await fetchJson(url, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_DATA_API_TOKEN
    }
  });

  return (payload.matches || []).map((match) => normalizeMatch(match, teamId));
}

function normalizeMatch(match, teamId) {
  const isHome = match.homeTeam?.id === teamId;
  const fullTime = match.score?.fullTime || {};
  const teamScore = isHome ? safeNumber(fullTime.home) : safeNumber(fullTime.away);
  const opponentScore = isHome ? safeNumber(fullTime.away) : safeNumber(fullTime.home);
  const marketOdds = isHome ? safeNumber(match.odds?.homeWin, 2) : safeNumber(match.odds?.awayWin, 2);

  return {
    date: String(match.utcDate || "").slice(0, 10),
    team: isHome ? match.homeTeam?.name || `Team ${teamId}` : match.awayTeam?.name || `Team ${teamId}`,
    opponent: isHome ? match.awayTeam?.name || "Opponent" : match.homeTeam?.name || "Opponent",
    location: isHome ? "home" : "away",
    team_score: teamScore,
    opponent_score: opponentScore,
    shots_for: 0,
    shots_against: 0,
    xg_for: 0,
    xg_against: 0,
    injuries: estimateInjuries(match),
    market_odds: marketOdds
  };
}

function estimateInjuries(match) {
  const substitutions = Array.isArray(match.substitutions) ? match.substitutions.length : 0;
  return substitutions >= 5 ? 1 : 0;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function fetchJson(url, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers }, (response) => {
      let raw = "";

      response.on("data", (chunk) => {
        raw += chunk;
      });

      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(createProviderError(`football-data.org respondio ${response.statusCode}.`, response.statusCode));
          return;
        }

        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(createProviderError("No fue posible interpretar la respuesta JSON del proveedor.", 502));
        }
      });
    });

    request.on("error", () => {
      reject(createProviderError("Fallo la conexion con football-data.org.", 502));
    });
  });
}
