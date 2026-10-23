import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { addWeatherLog, getCitySummaries, getRecentLogs } from "./db.js";
import { getCurrentWeather } from "./weather.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const indexPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/index.html");

// Send a JSON response with an explicit status and content type.
function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

// Serve the dashboard page for the root URL.
async function serveDashboard(response) {
  const html = await readFile(indexPath);
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

// Handle dashboard routes and return a JSON 404 for unknown paths.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html")) {
    await serveDashboard(response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/logs") {
    sendJson(response, 200, getRecentLogs(50));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/summary") {
    sendJson(response, 200, getCitySummaries());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
    const city = requestUrl.searchParams.get("city")?.trim();
    if (!city) {
      sendJson(response, 400, { error: "Provide a city query parameter." });
      return;
    }

    try {
      const weather = await getCurrentWeather(city);
      const id = addWeatherLog(weather);
      sendJson(response, 201, { id, ...weather });
    } catch (error) {
      const statusCode = error.message.startsWith("Unknown city:") ? 404 : 502;
      sendJson(response, statusCode, { error: error.message });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

// Start the built-in HTTP server and report startup failures explicitly.
const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(`Request failed: ${error.message}`);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "Internal server error." });
    } else {
      response.destroy();
    }
  });
});

server.on("error", (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Weather dashboard available at http://localhost:${port}`);
});
