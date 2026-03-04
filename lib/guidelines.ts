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

/** Descrizione dettagliata e personalizzata del livello corporeo/atletico. */
export function getBodyDescription(params: {
  bmi: number | null;
  steps: number | null;
  aerobicMin: number | null;
  anaerobicMin: number | null;
  waterLiters: number | null;
  gender: "male" | "female";
}): string {
  const { bmi, steps, aerobicMin, anaerobicMin, waterLiters, gender } = params;
  const lines: string[] = [];

  if (bmi != null) {
    const { zone, label } = getBmiZone(bmi);
    const advice =
      zone === "green"
        ? "Mantieni peso e abitudini alimentari attuali."
        : zone === "yellow"
          ? "Considera un leggero deficit calorico e aumenta l'attività fisica."
          : bmi < 18.5
            ? "Valuta un apporto calorico maggiore e consulta un nutrizionista."
            : "Consulta un medico per un piano di rientro graduale.";
    lines.push(`Peso corporeo: BMI ${bmi.toFixed(1)} (${label}). ${advice}`);
  }

  if (steps != null) {
    const { zone, label } = getStepsZone(steps);
    const s = steps.toLocaleString("it-IT");
    const advice =
      zone === "green"
        ? "Ottimo: mantieni questo livello di movimento quotidiano."
        : zone === "yellow"
          ? `Sei a ${s} passi/giorno. Punta a superare i 10.000 passi per benefici cardiovascolari ottimali.`
          : `Solo ${s} passi/giorno. Prova a integrare brevi camminate durante la giornata.`;
    lines.push(`Movimento quotidiano: ${label.toLowerCase()} (${s} passi). ${advice}`);
  }

  if (aerobicMin != null || anaerobicMin != null) {
    const aero = aerobicMin ?? 0;
    const ana = anaerobicMin ?? 0;
    const aeroOk = aero >= 150;
    const anaOk = ana >= 60;
    if (aeroOk && anaOk) {
      lines.push(
        `Allenamento: ${aero} min cardio + ${ana} min forza/settimana — rispetti pienamente le linee guida OMS. Continua così.`
      );
    } else {
      const missing: string[] = [];
      if (!aeroOk)
        missing.push(
          `aumenta il cardio (hai ${aero} min, obiettivo ≥150 min/sett)`
        );
      if (!anaOk)
        missing.push(
          `aumenta la forza (hai ${ana} min, obiettivo ≥60 min/sett)`
        );
      lines.push(
        `Allenamento: ${missing.join(" e ")}. Punta a combinare cardio e allenamento con i pesi ogni settimana.`
      );
    }
  }

  if (waterLiters != null) {
    const target = gender === "female" ? 2 : 2.5;
    const { zone } = getWaterZone(waterLiters, gender);
    const advice =
      zone === "green"
        ? `Sei a ${waterLiters} L/giorno — idratazione nella norma.`
        : zone === "yellow"
          ? `Sei a ${waterLiters} L/giorno, ma il target è ${target} L. Tieni sempre una bottiglia con te.`
          : `Solo ${waterLiters} L/giorno su ${target} L raccomandati. Aumenta gradualmente l'apporto idrico.`;
    lines.push(advice);
  }

  if (lines.length === 0) return "Inserisci peso, altezza e altri dati per ricevere una valutazione personalizzata.";
  return lines.join("\n\n");
}
