/**
 * Integrazione Google Fit: legge sessioni, durata, kcal e (se disponibile) heart rate.
 * L'API Google Fit REST è in deprecazione (2026); per nuovi progetti considera Health Connect (Android).
 * Richiede access token OAuth con scope: fitness.activity.read, fitness.body.read.
 */

const FITNESS_API = "https://www.googleapis.com/fitness/v1/users/me";

export type GoogleFitSession = {
  id: string;
  name: string;
  startTimeMillis: string;
  endTimeMillis: string;
  activityType?: number;
  activeTimeMillis?: string;
};

export type GoogleFitWorkout = {
  sessionId: string;
  type: "aerobic" | "anaerobic";
  exercise_type: string;
  duration_minutes: number;
  kcal_burned: number;
  hr_zone_1_min: number;
  hr_zone_2_min: number;
  hr_zone_3_min: number;
  hr_zone_4_min: number;
  hr_zone_5_min: number;
  workout_at: string; // ISO
};

/** Activity type → aerobic (running, cycling, etc.) o anaerobic (strength, etc.) */
const AEROBIC_ACTIVITY_TYPES = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
  75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
  109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
]);
const ACTIVITY_TYPE_NAMES: Record<number, string> = {
  1: "In sella (bici)",
  2: "Corsa",
  3: "Escursionismo",
  4: "Nuoto",
  5: "Multi-sport",
  8: "Camminata",
  9: "Fitness",
  10: "Allenamento",
  11: "Sport",
  13: "Ellittica",
  14: "Sci",
  15: "Pattinaggio",
  16: "Voga",
  17: "Arrampicata",
  18: "Yoga",
  19: "Pilates",
  20: "Cross training",
  21: "HIIT",
  22: "Danza",
  23: "Functional",
  24: "Pesi",
  25: "CrossFit",
  26: "Core",
  27: "Stretching",
  28: "Meditazione",
  29: "Riscaldamento",
  30: "Defaticamento",
};

function isAerobic(activityType: number): boolean {
  if (activityType === 24 || activityType === 25) return false; // Pesi, CrossFit → forza
  return true;
}

function activityTypeToName(activityType: number): string {
  return ACTIVITY_TYPE_NAMES[activityType] ?? "Allenamento";
}

async function fitFetch(
  accessToken: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/** Lista sessioni in un intervallo di tempo (millisecondi epoch). */
export async function listSessions(
  accessToken: string,
  startTimeMillis: number,
  endTimeMillis: number
): Promise<GoogleFitSession[]> {
  const url = `${FITNESS_API}/sessions?startTime=${startTimeMillis}&endTime=${endTimeMillis}`;
  const res = await fitFetch(accessToken, url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Fit sessions: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { session?: GoogleFitSession[] };
  return data.session ?? [];
}

type AggregateBucket = {
  session?: GoogleFitSession;
  dataset?: Array<{
    dataSourceId: string;
    point: Array<{ value: Array<{ fpVal?: number }> }>;
  }>;
};

/** Aggregato calorie e heart rate summary per sessione (bucketBySession). */
export async function aggregateSessionData(
  accessToken: string,
  startTimeMillis: number,
  endTimeMillis: number
): Promise<{ buckets: AggregateBucket[] }> {
  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.calories.expended" },
      { dataTypeName: "com.google.heart_rate.summary" },
    ],
    bucketBySession: { minDurationMillis: 60000 },
    startTimeMillis,
    endTimeMillis,
  };
  const res = await fitFetch(accessToken, `${FITNESS_API}/dataset:aggregate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Fit aggregate: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { bucket?: AggregateBucket[] };
  return { buckets: data.bucket ?? [] };
}

/** Primo dataset = calories.expended, secondo = heart_rate.summary. */
function parseCaloriesFromBucket(bucket: AggregateBucket): number {
  if (!bucket.dataset?.[0]?.point) return 0;
  let total = 0;
  for (const pt of bucket.dataset[0].point) {
    const v = pt.value?.[0]?.fpVal;
    if (v != null) total += v;
  }
  return Math.round(total);
}

/** Converte sessioni Google Fit in formato workout ReBorn (durata, kcal; zone HR non esposte per sessione nell'aggregate, lasciate a 0). */
export function mapSessionsToWorkouts(
  sessions: GoogleFitSession[],
  aggregateBuckets: { buckets: AggregateBucket[] }
): GoogleFitWorkout[] {
  const bySessionId = new Map<string, number>();
  for (const b of aggregateBuckets.buckets ?? []) {
    if (b.session?.id) {
      bySessionId.set(b.session.id, parseCaloriesFromBucket(b));
    }
  }
  const out: GoogleFitWorkout[] = [];
  for (const s of sessions) {
    const startMs = parseInt(s.startTimeMillis, 10);
    const endMs = parseInt(s.endTimeMillis, 10);
    const activeMs = s.activeTimeMillis ? parseInt(s.activeTimeMillis, 10) : endMs - startMs;
    const durationMin = Math.max(1, Math.round(activeMs / 60000));
    const kcal = bySessionId.get(s.id) ?? 0;
    const activityType = s.activityType ?? 9;
    const type: "aerobic" | "anaerobic" = isAerobic(activityType) ? "aerobic" : "anaerobic";
    const exercise_type = activityTypeToName(activityType);
    out.push({
      sessionId: s.id,
      type,
      exercise_type,
      duration_minutes: durationMin,
      kcal_burned: kcal,
      hr_zone_1_min: 0,
      hr_zone_2_min: 0,
      hr_zone_3_min: 0,
      hr_zone_4_min: 0,
      hr_zone_5_min: 0,
      workout_at: new Date(startMs).toISOString(),
    });
  }
  return out;
}

/** Recupera gli allenamenti da Google Fit per gli ultimi N giorni. */
export async function fetchGoogleFitWorkouts(
  accessToken: string,
  lastDays: number = 7
): Promise<GoogleFitWorkout[]> {
  const end = Date.now();
  const start = end - lastDays * 24 * 60 * 60 * 1000;
  const sessions = await listSessions(accessToken, start, end);
  if (sessions.length === 0) return [];
  const firstStart = Math.min(...sessions.map((s) => parseInt(s.startTimeMillis, 10)));
  const lastEnd = Math.max(...sessions.map((s) => parseInt(s.endTimeMillis, 10)));
  const agg = await aggregateSessionData(accessToken, firstStart, lastEnd);
  return mapSessionsToWorkouts(sessions, agg);
}
