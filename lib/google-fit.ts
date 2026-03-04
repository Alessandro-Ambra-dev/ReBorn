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

/** Activity type → aerobic (running, cycling, etc.) o anaerobic (strength, etc.).
 * Basato sulla tabella ufficiale Google Fit (activity-types).
 * Qui elenchiamo solo i tipi chiaramente di forza / resistenza muscolare.
 */
const ANAEROBIC_ACTIVITY_TYPES = new Set<number>([
  21, // Calisthenics
  22, // Circuit training
  33, // Gymnastics
  41, // Kettlebell training
  47, // P90X
  80, // Strength training
  97, // Weightlifting
  100, // Yoga (lo consideriamo più forza/mobilità)
  113, // Crossfit
]);
const ACTIVITY_TYPE_NAMES: Record<number, string> = {
  1: "Bici",
  2: "Corsa",
  3: "Escursionismo",
  4: "Nuoto",
  5: "Altro sport",
  7: "Camminata",
  8: "Corsa",
  9: "Aerobica",
  13: "Ellittica",
  21: "Calisthenics",
  22: "Circuit training",
  24: "Danza",
  25: "Ellittica",
  26: "Core",
  27: "Stretching",
  33: "Ginnastica",
  35: "Hiking",
  39: "Salto corda",
  40: "Kayak",
  41: "Kettlebell",
  45: "Meditazione",
  47: "P90X",
  49: "Pilates",
  52: "Arrampicata",
  53: "Voga",
  54: "Vogatore",
  65: "Sci",
  67: "Sci di fondo",
  71: "Slitta",
  73: "Snowboard",
  75: "Ciaspole",
  80: "Strength training",
  82: "Nuoto",
  86: "Sport di squadra",
  93: "Camminata fitness",
  95: "Camminata tapis roulant",
  97: "Weightlifting",
  100: "Yoga",
  101: "Zumba",
  113: "CrossFit",
};

function isAerobic(activityType: number): boolean {
  if (ANAEROBIC_ACTIVITY_TYPES.has(activityType)) return false;
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
  // L'endpoint users.sessions.list richiede startTime/endTime in formato RFC3339,
  // non in millisecondi epoch. Convertiamo i ms in ISO 8601 (UTC).
  const startTime = new Date(startTimeMillis).toISOString();
  const endTime = new Date(endTimeMillis).toISOString();
  const url = `${FITNESS_API}/sessions?startTime=${encodeURIComponent(
    startTime
  )}&endTime=${encodeURIComponent(endTime)}`;
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

/** Aggregato calorie per sessione (bucketBySession).
 * Nota: com.google.heart_rate.summary non ha sempre un "default datasource" per tutti gli
 * utenti / dispositivi e può causare errori 400. Per ora chiediamo solo le calorie. */
export async function aggregateSessionData(
  accessToken: string,
  startTimeMillis: number,
  endTimeMillis: number
): Promise<{ buckets: AggregateBucket[] }> {
  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.calories.expended" },
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
