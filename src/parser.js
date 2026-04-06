const numericColumns = new Set([
  "team_score",
  "opponent_score",
  "shots_for",
  "shots_against",
  "xg_for",
  "xg_against",
  "injuries",
  "market_odds"
]);

const defaultRow = {
  date: "",
  team: "",
  opponent: "",
  location: "home",
  team_score: 0,
  opponent_score: 0,
  shots_for: 0,
  shots_against: 0,
  xg_for: 0,
  xg_against: 0,
  injuries: 0,
  market_odds: 2
};

export function parseCsv(csvText) {
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((value) => value.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const entry = { ...defaultRow };

    headers.forEach((header, index) => {
      const rawValue = (values[index] ?? "").trim();
      if (!header) {
        return;
      }
      entry[header] = numericColumns.has(header) ? safeNumber(rawValue, defaultRow[header] ?? 0) : rawValue || defaultRow[header] || "";
    });

    entry.result = getResult(entry.team_score, entry.opponent_score);
    entry.goal_diff = entry.team_score - entry.opponent_score;
    entry.form_points = entry.result === "W" ? 3 : entry.result === "D" ? 1 : 0;
    return entry;
  });
}

export function listTeams(rows) {
  return [...new Set(rows.map((row) => row.team).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function getResult(teamScore, opponentScore) {
  if (teamScore > opponentScore) {
    return "W";
  }

  if (teamScore < opponentScore) {
    return "L";
  }

  return "D";
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
