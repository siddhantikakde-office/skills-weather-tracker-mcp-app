const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const weatherConditions = new Map([
  [0, "clear"],
  [1, "mainly clear"],
  [2, "partly cloudy"],
  [3, "cloudy"],
  [45, "fog"],
  [48, "freezing fog"],
  [51, "light drizzle"],
  [53, "drizzle"],
  [55, "heavy drizzle"],
  [56, "freezing drizzle"],
  [57, "heavy freezing drizzle"],
  [61, "light rain"],
  [63, "rain"],
  [65, "heavy rain"],
  [66, "freezing rain"],
  [67, "heavy freezing rain"],
  [71, "light snow"],
  [73, "snow"],
  [75, "heavy snow"],
  [77, "snow grains"],
  [80, "light rain showers"],
  [81, "rain showers"],
  [82, "heavy rain showers"],
  [85, "snow showers"],
  [86, "heavy snow showers"],
  [95, "thunderstorm"],
  [96, "thunderstorm with hail"],
  [99, "heavy thunderstorm with hail"]
]);

// Fetch JSON and convert HTTP/network failures into concise user-facing errors.
async function fetchJson(url, endpointName) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Network error while contacting the Open-Meteo ${endpointName} endpoint.`);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo ${endpointName} request failed (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Open-Meteo returned invalid JSON from the ${endpointName} endpoint.`);
  }
}

// Convert an Open-Meteo WMO weather code into a readable condition.
export function mapWeatherCodeToCondition(code) {
  return weatherConditions.get(code) ?? "unknown";
}

// Geocode a city, retrieve current conditions, and return a database-ready record.
export async function getCurrentWeather(city) {
  const geocodingUrl = new URL(GEOCODING_URL);
  geocodingUrl.search = new URLSearchParams({ name: city, count: "1" });
  const geocoding = await fetchJson(geocodingUrl, "geocoding");
  const location = geocoding.results?.[0];

  if (!location) {
    throw new Error(`Unknown city: "${city}". Check the spelling and try again.`);
  }

  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error(`Open-Meteo did not return valid coordinates for "${city}".`);
  }

  const forecastUrl = new URL(FORECAST_URL);
  forecastUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
  });
  const forecast = await fetchJson(forecastUrl, "current weather");
  const current = forecast.current;
  const values = [
    current?.temperature_2m,
    current?.relative_humidity_2m,
    current?.wind_speed_10m,
    current?.weather_code
  ];

  if (!values.every(Number.isFinite)) {
    throw new Error("Open-Meteo did not return complete current weather data.");
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: mapWeatherCodeToCondition(current.weather_code),
    weather_code: current.weather_code
  };
}
