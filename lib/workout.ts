/** Tipi di esercizio per allenamento aerobico e anaerobico */
export const AEROBIC_EXERCISES = [
  "Corsa",
  "Nuoto",
  "Ciclismo",
  "Camminata",
  "Cardio",
  "Remo",
  "Salto della corda",
  "Ellittica",
  "Sci di fondo",
] as const;

export const ANAEROBIC_EXERCISES = [
  "Pesi liberi",
  "Macchine",
  "Bodybuilding",
  "CrossFit",
  "Bodyweight",
  "Functional",
  "Kettlebell",
] as const;

export type AerobicExercise = (typeof AEROBIC_EXERCISES)[number];
export type AnaerobicExercise = (typeof ANAEROBIC_EXERCISES)[number];

/** Restituisce il lunedì (inizio settimana) per una data. Settimana lun-dom. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formato YYYY-MM-DD per week_start in DB */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date da lunedì a domenica per una data qualsiasi (nella sua settimana) */
export function getWeekDates(ref: Date): Date[] {
  const start = getWeekStart(ref);
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

/** Nomi giorni corti per la UI */
export const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** Confronta solo data (ignora ora) */
export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** Ultime N settimane (lunedì) a partire da una data di riferimento */
export function getLastWeekStarts(ref: Date, count: number): Date[] {
  const start = getWeekStart(ref);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() - 7 * i);
    out.push(d);
  }
  return out;
}
