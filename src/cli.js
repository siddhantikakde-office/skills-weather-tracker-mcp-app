#!/usr/bin/env node

import {
  addWeatherLog,
  getCityStats,
  getRecentLogs
} from "./db.js";
import { getCurrentWeather } from "./weather.js";

// Print a text table sized to the values being displayed.
function printTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length))
  );
  const formatRow = (row) =>
    `| ${row.map((value, index) => String(value).padEnd(widths[index])).join(" | ")} |`;
  const separator = `+-${widths.map((width) => "-".repeat(width)).join("-+-")}-+`;

  console.log(separator);
  console.log(formatRow(headers));
  console.log(separator);
  rows.forEach((row) => console.log(formatRow(row)));
  console.log(separator);
}

// Parse and validate the optional list limit.
function parseLimit(args) {
  const limitIndex = args.indexOf("--limit");
  if (limitIndex === -1) return 10;

  const rawLimit = args[limitIndex + 1];
  const limit = Number(rawLimit);
  if (!rawLimit || !/^\d+$/.test(rawLimit) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Usage: node src/cli.js list [--limit N], where N is a positive integer.");
  }

  return limit;
}

// Add a city's current Open-Meteo observation to the database.
async function addCity(city) {
  const weather = await getCurrentWeather(city);
  const id = addWeatherLog(weather);
  console.log(
    `Saved ${weather.city}, ${weather.country}: ${weather.temperature_c}°C, ` +
    `${weather.condition} (log #${id}).`
  );
}

// Print recent observations in a compact table.
function listLogs(args) {
  const logs = getRecentLogs(parseLimit(args));
  if (logs.length === 0) {
    console.log("No weather logs yet. Add one with: node src/cli.js add \"<city>\"");
    return;
  }

  printTable(
    ["ID", "City", "Country", "Condition", "Temp °C", "Humidity %", "Wind km/h", "Created at"],
    logs.map((log) => [
      log.id,
      log.city,
      log.country ?? "",
      log.condition,
      log.temperature_c,
      log.humidity,
      log.wind_kmh,
      log.created_at
    ])
  );
}

// Print temperature aggregates for a city's stored observations.
function showStats(city) {
  const stats = getCityStats(city);
  if (stats.log_count === 0) {
    console.log(`No weather logs found for "${city}".`);
    return;
  }

  console.log(`Weather statistics for ${city}:`);
  console.log(`  Logs: ${stats.log_count}`);
  console.log(`  Minimum temperature: ${stats.min_temperature.toFixed(1)}°C`);
  console.log(`  Maximum temperature: ${stats.max_temperature.toFixed(1)}°C`);
  console.log(`  Average temperature: ${stats.average_temperature.toFixed(1)}°C`);
}

// Dispatch a CLI command and surface expected errors without a stack trace.
async function main(args) {
  const [command, ...commandArgs] = args;

  if (command === "add" && commandArgs.length === 1 && commandArgs[0].trim()) {
    await addCity(commandArgs[0]);
  } else if (
    command === "list" &&
    (commandArgs.length === 0 ||
      (commandArgs.length === 2 && commandArgs[0] === "--limit"))
  ) {
    listLogs(commandArgs);
  } else if (command === "stats" && commandArgs.length === 1 && commandArgs[0].trim()) {
    showStats(commandArgs[0]);
  } else {
    throw new Error(
      "Usage:\n" +
      "  node src/cli.js add \"<city>\"\n" +
      "  node src/cli.js list [--limit N]\n" +
      "  node src/cli.js stats \"<city>\""
    );
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
