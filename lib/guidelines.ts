/**
 * Linee guida internazionali (WHO, EFSA, CDC) per indicatori
 * zona rossa (critico) / gialla (attenzione) / verde (buono).
 */
export type Zone = "red" | "yellow" | "green";

/** WHO: BMI <18.5 sottopeso, 18.5-24.9 normale, 25-29.9 sovrappeso, ≥30 obesità */
export function getBmiZone(bmi: number): { zone: Zone; label: string } {
  if (bmi < 18.5) return { zone: "red", label: "Sottopeso" };
  if (bmi <= 24.9) return { zone: "green", label: "Normale" };
  if (bmi <= 29.9) return { zone: "yellow", label: "Sovrappeso" };
  return { zone: "red", label: "Obesità" };
}

/** CDC/OMS: <5000 sedentario, 5000-9999 moderato, ≥10000 attivo */
export function getStepsZone(steps: number): { zone: Zone; label: string } {
  if (steps < 5000) return { zone: "red", label: "Sedentario" };
  if (steps < 10000) return { zone: "yellow", label: "Moderato" };
  return { zone: "green", label: "Attivo" };
}

/** WHO: ≥150 min/settimana attività aerobica moderata (o 75 min vigorosa) */
export function getAerobicZone(minPerWeek: number): { zone: Zone; label: string } {
  if (minPerWeek < 75) return { zone: "red", label: "Sotto soglia" };
  if (minPerWeek < 150) return { zone: "yellow", label: "Parziale" };
  return { zone: "green", label: "Adeguato" };
}

/** WHO: potenziamento muscolare ≥2 volte/settimana; qui usiamo minuti (≥60 ≈ 2 sessioni) */
export function getAnaerobicZone(minPerWeek: number): { zone: Zone; label: string } {
  if (minPerWeek < 30) return { zone: "red", label: "Insufficiente" };
  if (minPerWeek < 60) return { zone: "yellow", label: "Parziale" };
  return { zone: "green", label: "Adeguato" };
}

/** EFSA: donne ~2 L/giorno, uomini ~2.5 L/giorno (assunzione totale da liquidi) */
export function getWaterZone(
  liters: number,
  gender: "male" | "female"
): { zone: Zone; label: string } {
  const target = gender === "female" ? 2 : 2.5;
  if (liters < target * 0.6) return { zone: "red", label: "Scarso" };
  if (liters < target) return { zone: "yellow", label: "Sotto target" };
  return { zone: "green", label: "Adeguato" };
}

export function getZoneColor(zone: Zone): string {
  switch (zone) {
    case "red":
      return "#ef4444";
    case "yellow":
      return "#eab308";
    case "green":
      return "#22c55e";
  }
}

/** Descrizione sintetica livello corporeo/atletico (media valori sportivi internazionali). */
export function getBodyDescription(params: {
  bmi: number | null;
  steps: number | null;
  aerobicMin: number | null;
  anaerobicMin: number | null;
  waterLiters: number | null;
  gender: "male" | "female";
}): string {
  const { bmi, steps, aerobicMin, anaerobicMin, waterLiters, gender } = params;
  const parts: string[] = [];

  if (bmi != null) {
    const { zone, label } = getBmiZone(bmi);
    const corporeo =
      zone === "green"
        ? "Costituzione nella norma"
        : zone === "yellow"
          ? "Costituzione da monitorare (sovrappeso)"
          : "Costituzione da supportare (sottopeso o obesità)";
    parts.push(corporeo);
  }

  if (steps != null) {
    const { label } = getStepsZone(steps);
    parts.push(`attività quotidiana ${label.toLowerCase()}`);
  }

  if (aerobicMin != null || anaerobicMin != null) {
    const aero = aerobicMin ?? 0;
    const ana = anaerobicMin ?? 0;
    if (aero >= 150 && ana >= 60)
      parts.push("livello atletico in linea con le raccomandazioni OMS (cardio + forza)");
    else if (aero >= 75 || ana >= 30)
      parts.push("livello atletico parzialmente in linea con le raccomandazioni OMS");
    else parts.push("livello atletico sotto le raccomandazioni OMS");
  }

  if (waterLiters != null) {
    const { zone } = getWaterZone(waterLiters, gender);
    if (zone === "green") parts.push("idratazione adeguata");
    else if (zone === "yellow") parts.push("idratazione da aumentare");
    else parts.push("idratazione insufficiente");
  }

  if (parts.length === 0) return "Inserisci peso, altezza e altri dati per una valutazione.";
  return parts.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
}
