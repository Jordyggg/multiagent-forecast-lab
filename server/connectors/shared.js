export const csvHeaders = [
  "date",
  "team",
  "opponent",
  "location",
  "team_score",
  "opponent_score",
  "shots_for",
  "shots_against",
  "xg_for",
  "xg_against",
  "injuries",
  "market_odds"
];

export function buildCsv(rows) {
  const lines = [csvHeaders.join(",")];

  rows.forEach((row) => {
    const line = csvHeaders.map((header) => escapeCsvValue(row[header] ?? defaultValueForHeader(header))).join(",");
    lines.push(line);
  });

  return lines.join("\n");
}

export function createProviderError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function parseTeamIds(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export function escapeCsvValue(value) {
  const text = String(value);
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function defaultValueForHeader(header) {
  if (["team_score", "opponent_score", "shots_for", "shots_against", "xg_for", "xg_against", "injuries"].includes(header)) {
    return 0;
  }

  if (header === "market_odds") {
    return 2;
  }

  if (header === "location") {
    return "home";
  }

  return "";
}
