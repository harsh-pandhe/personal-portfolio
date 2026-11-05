// Live conditions for Navi Mumbai from Open-Meteo (free, no API key).
export type WeatherNow = {
  temp: number;
  code: number;
  label: string;
  icon: string;
  isDay: boolean;
  cloud: number; // 0..100
  precip: number; // mm
  wind: number; // km/h
};

export const NAVI_MUMBAI = { lat: 19.033, lon: 73.0297 };

const CODES: [number[], string, string][] = [
  [[0], "Clear", "☀️"],
  [[1, 2], "Partly cloudy", "⛅"],
  [[3], "Overcast", "☁️"],
  [[45, 48], "Haze", "🌫️"],
  [[51, 53, 55, 56, 57], "Drizzle", "🌦️"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "🌧️"],
  [[95, 96, 99], "Thunderstorm", "⛈️"],
];

export function describe(code: number) {
  const hit = CODES.find(([c]) => c.includes(code));
  return hit ? { label: hit[1], icon: hit[2] } : { label: "Fair", icon: "🌤️" };
}

export function isRainy(code: number) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

export async function fetchNaviMumbai(signal?: AbortSignal): Promise<WeatherNow | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${NAVI_MUMBAI.lat}&longitude=${NAVI_MUMBAI.lon}` +
    "&current=temperature_2m,weather_code,cloud_cover,precipitation,is_day,wind_speed_10m&timezone=Asia%2FKolkata";
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const j = await r.json();
    const c = j.current;
    const d = describe(c.weather_code);
    return {
      temp: Math.round(c.temperature_2m),
      code: c.weather_code,
      label: d.label,
      icon: d.icon,
      isDay: c.is_day === 1,
      cloud: c.cloud_cover,
      precip: c.precipitation,
      wind: Math.round(c.wind_speed_10m),
    };
  } catch {
    return null;
  }
}

/** Night in Navi Mumbai by the clock: roughly 18:45 to 06:15 IST. */
export function istIsNight(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).formatToParts(now);
  const h = +parts.find((p) => p.type === "hour")!.value + +parts.find((p) => p.type === "minute")!.value / 60;
  return h < 6.25 || h > 18.75;
}
