/**
 * BMR: Mifflin-St Jeor (1990), raccomandato da ADA e usato in ambito clinico.
 * Uomini: BMR = 10 * peso(kg) + 6.25 * altezza(cm) - 5 * età + 5
 * Donne:  BMR = 10 * peso(kg) + 6.25 * altezza(cm) - 5 * età - 161
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: "male" | "female";
}): number {
  const { weightKg, heightCm, age, gender } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.205;
}

export function kgToLbs(kg: number): number {
  return kg * 2.205;
}

/** feet + inches to cm (e.g. 5 feet 10 inches = 5*12+10 = 70 inches * 2.54) */
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function getAgeFromBirthDate(birthDateIso: string): number {
  const birth = new Date(birthDateIso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Converte gg-mm-yyyy o yyyy-mm-dd in yyyy-mm-dd per DB e calcolo età. */
export function parseDisplayBirthDateToISO(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = parseInt(d!, 10);
    const month = parseInt(m!, 10) - 1;
    const year = parseInt(y!, 10);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day)
      return null;
    const yy = String(year);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
    if (isNaN(date.getTime())) return null;
    return trimmed;
  }
  return null;
}

/** Da valore DB yyyy-mm-dd a stringa per input gg-mm-yyyy. */
export function formatISOToDisplay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}
