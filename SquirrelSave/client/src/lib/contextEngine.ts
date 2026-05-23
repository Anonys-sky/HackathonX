import {
  DEMO_CAMPUS,
  applyContextToSafeSpend,
  getExamContext,
  type ExamContext,
} from "@shared/contextRules";

export type WeatherContext = {
  isRaining: boolean;
  precipitationMm: number;
  weatherCode: number;
};

export type SpendingContext = {
  exam: ExamContext | null;
  weather: WeatherContext | null;
  baseSafeDaily: number;
  adjustedSafeDaily: number;
  deliverySurgeRm: number;
};

async function fetchWeather(): Promise<WeatherContext | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(DEMO_CAMPUS.latitude));
    url.searchParams.set("longitude", String(DEMO_CAMPUS.longitude));
    url.searchParams.set("current", "precipitation,rain,weather_code");
    url.searchParams.set("timezone", "Asia/Kuala_Lumpur");

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { precipitation?: number; rain?: number; weather_code?: number };
    };
    const current = data.current;
    if (!current) return null;

    const precipitationMm = Number(current.precipitation ?? 0);
    const rain = Number(current.rain ?? 0);
    const weatherCode = Number(current.weather_code ?? 0);
    const isRaining = rain > 0 || precipitationMm > 0.3 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);

    return { isRaining, precipitationMm, weatherCode };
  } catch {
    return null;
  }
}

export async function loadSpendingContext(baseSafeDaily: number): Promise<SpendingContext> {
  const exam = getExamContext();
  const weather = await fetchWeather();

  let adjusted = applyContextToSafeSpend(baseSafeDaily, exam);

  if (weather?.isRaining && baseSafeDaily > 0) {
    adjusted = Math.max(0, adjusted * 0.92);
  }

  const deliverySurgeRm = weather?.isRaining ? Math.min(12, Math.max(5, baseSafeDaily * 0.35)) : 0;

  return {
    exam,
    weather,
    baseSafeDaily,
    adjustedSafeDaily: adjusted,
    deliverySurgeRm,
  };
}

export function contextMessageKeys(ctx: SpendingContext): {
  messageKey: string;
  params: Record<string, string | number>;
} | null {
  if (ctx.weather?.isRaining && ctx.baseSafeDaily > 0) {
    const runwayDays = Math.max(1, Math.round(ctx.baseSafeDaily / Math.max(ctx.deliverySurgeRm, 6)));
    return {
      messageKey: "context.rain_delivery",
      params: {
        campus: DEMO_CAMPUS.name,
        surge: Math.round(ctx.deliverySurgeRm),
        runway: runwayDays,
      },
    };
  }

  if (ctx.exam && ctx.exam.daysUntilStart > 0 && ctx.exam.daysUntilStart <= 14) {
    return {
      messageKey: "context.exam_buffer",
      params: {
        days: ctx.exam.daysUntilStart,
        label: ctx.exam.label,
        percent: Math.round((1 - ctx.exam.bufferFactor) * 100),
      },
    };
  }

  if (ctx.exam?.active) {
    return {
      messageKey: "context.exam_active",
      params: { label: ctx.exam.label },
    };
  }

  return null;
}
