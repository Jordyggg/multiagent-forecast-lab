import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./server/loadEnv.js";
import { listConnectors, loadDatasetFromConnector } from "./server/connectors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const port = process.env.PORT || 3000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/api/providers" && request.method === "GET") {
      sendJson(response, 200, { providers: listConnectors() });
      return;
    }

    if (request.url === "/api/providers/load" && request.method === "POST") {
      const body = await readJsonBody(request);
      const dataset = await loadDatasetFromConnector(body.sourceId, body.params || {});
      sendJson(response, 200, dataset);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Metodo no permitido" });
      return;
    }

    const requestPath = request.url === "/" ? "/index.html" : request.url;
    const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(root, safePath);
    const extension = path.extname(filePath).toLowerCase();
    const data = await readFile(filePath);

    response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 404);
    const message = error.statusCode ? error.message : error instanceof SyntaxError ? "JSON invalido en la peticion." : "Archivo no encontrado";

    if (String(request.url || "").startsWith("/api/")) {
      sendJson(response, statusCode, { error: message });
      return;
    }

    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
  }
});

server.listen(port, () => {
  console.log(`Multiagent Forecast Lab disponible en http://localhost:${port}`);
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}
