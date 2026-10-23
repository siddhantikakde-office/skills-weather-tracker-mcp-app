# Open-Meteo API notes

The tracker uses Open-Meteo's public geocoding and forecast endpoints; neither requires an API key.

## Geocoding

**Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`

**Request:** `?name=Pune&count=1`

The response's `results[0]` supplies the city `name`, `country`, `latitude`, and `longitude`. The coordinates can be passed to the forecast endpoint.

Trimmed example from the geocoding response:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Request parameters:** `latitude`, `longitude`, and `current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`.

The `current` fields map to the log as follows: `temperature_2m` to `temperature_c`, `relative_humidity_2m` to `humidity`, `wind_speed_10m` to `wind_kmh`, and `weather_code` to `weather_code`. Units in the response confirm temperature is °C, humidity is %, and wind speed is km/h. The condition label is derived from the WMO weather code; code `1` is “Mainly clear”.

Trimmed example from the provided current-weather response:

```json
{
  "latitude": 18.523726,
  "longitude": 73.86876,
  "current_units": {
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "wind_speed_10m": "km/h",
    "weather_code": "wmo code"
  },
  "current": {
    "time": "2026-10-23T08:15",
    "temperature_2m": 33.5,
    "relative_humidity_2m": 32,
    "wind_speed_10m": 9.0,
    "weather_code": 1
  }
}
```

The provided weather response coordinates differ slightly from the geocoding result. The logged row uses the provided weather response coordinates, as requested.
