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

// Return each city's latest temperature, average temperature, and log count.
export function getCitySummaries() {
  return database.prepare(`
    SELECT
      latest.city,
      latest.country,
      latest.temperature_c AS latest_temperature,
      summary.average_temperature,
      summary.log_count
    FROM weather_logs AS latest
    JOIN (
      SELECT
        city COLLATE NOCASE AS city_key,
        AVG(temperature_c) AS average_temperature,
        COUNT(*) AS log_count
      FROM weather_logs
      GROUP BY city COLLATE NOCASE
    ) AS summary ON latest.city COLLATE NOCASE = summary.city_key
    WHERE NOT EXISTS (
      SELECT 1
      FROM weather_logs AS newer
      WHERE newer.city = latest.city COLLATE NOCASE
        AND (newer.created_at > latest.created_at
          OR (newer.created_at = latest.created_at AND newer.id > latest.id))
    )
    ORDER BY latest.city COLLATE NOCASE
  `).all();
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
