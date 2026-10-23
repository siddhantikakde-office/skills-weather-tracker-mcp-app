import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const databasePath = resolve(dirname(fileURLToPath(import.meta.url)), "../weather.db");
const database = new Database(databasePath);

// Insert one current weather observation and return its generated id.
export function addWeatherLog(weather) {
  const insert = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c, humidity,
      wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperature_c, @humidity,
      @wind_kmh, @condition, @weather_code
    )
  `);

  return insert.run(weather).lastInsertRowid;
}

// Return the most recent weather observations.
export function getRecentLogs(limit) {
  return database.prepare(`
    SELECT id, city, country, temperature_c, humidity, wind_kmh, condition, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Aggregate temperature statistics for a city, ignoring city-name case.
export function getCityStats(city) {
  return database.prepare(`
    SELECT
      MIN(temperature_c) AS min_temperature,
      MAX(temperature_c) AS max_temperature,
      AVG(temperature_c) AS average_temperature,
      COUNT(*) AS log_count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
