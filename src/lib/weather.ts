import { WeatherDay } from "@/types/trip";

// WMO weather codes -> short human-readable condition. https://open-meteo.com/en/docs
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Daily forecast for a lat/lng over `days` days starting at `startDate` (YYYY-MM-DD).
 * Open-Meteo only forecasts ~16 days out - returns null if the range isn't available yet
 * (e.g. the trip is further in the future), so callers should treat this as optional.
 */
export async function getWeatherForecast(
  lat: number,
  lng: number,
  startDate: string,
  days: number
): Promise<WeatherDay[] | null> {
  const endDate = addDays(startDate, Math.max(0, days - 1));

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  if (!data.daily?.time?.length) return null;

  return data.daily.time.map((date: string, i: number) => ({
    date,
    highC: Math.round(data.daily.temperature_2m_max[i]),
    lowC: Math.round(data.daily.temperature_2m_min[i]),
    condition: WEATHER_CODES[data.daily.weathercode[i]] || "Unknown",
    precipitationChance: data.daily.precipitation_probability_max?.[i],
  }));
}
