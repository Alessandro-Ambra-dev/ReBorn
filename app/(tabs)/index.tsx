import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Workout, WorkoutWeekly } from "@/lib/database.types";
import { fonts, fontWeights } from "@/lib/theme";
import {
  AEROBIC_EXERCISES,
  ANAEROBIC_EXERCISES,
  getWeekStart,
  getWeekDates,
  toISODate,
  DAY_LABELS,
  getLastWeekStarts,
} from "@/lib/workout";
import { fetchGoogleFitWorkouts } from "@/lib/google-fit";
import {
  getStoredGoogleFitToken,
  promptGoogleFitAuth,
  clearGoogleFitToken,
} from "@/lib/google-fit-auth";

type WorkoutType = "aerobic" | "anaerobic";

const AEROBIC_ICON = "🏃";
const ANAEROBIC_ICON = "💪";

function getDefaultDate(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
}

function getDefaultTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Converte gg-mm-aaaa in YYYY-MM-DD per DB */
function parseDisplayDate(display: string): string | null {
  const m = display.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

function getGoalMessage(
  aerobicDone: number,
  anaerobicDone: number,
  targetAerobic: number,
  targetAnaerobic: number
): string {
  const totalDone = aerobicDone + anaerobicDone;
  if (totalDone === 0) {
    if (targetAerobic > 0 || targetAnaerobic > 0)
      return "Questa settimana non hai ancora registrato allenamenti. Inizia ora: il primo conta!";
    return "Imposta nel Profilo quante sessioni di cardio e forza fai a settimana: diventeranno i tuoi obiettivi da raggiungere e superare.";
  }
  const aeroOk = targetAerobic <= 0 || aerobicDone >= targetAerobic;
  const anaOk = targetAnaerobic <= 0 || anaerobicDone >= targetAnaerobic;
  if (aeroOk && anaOk && (targetAerobic > 0 || targetAnaerobic > 0)) {
    const exceeded = aerobicDone > targetAerobic || anaerobicDone > targetAnaerobic;
    return exceeded
      ? "Hai superato l'obiettivo settimanale! Ottimo lavoro."
      : "Obiettivo settimanale raggiunto! Sei in forma.";
  }
  if (aeroOk && !anaOk)
    return "Aerobica completata! Manca ancora la forza: continua così.";
  if (!aeroOk && anaOk)
    return "Forza a posto! Aggiungi un po' di cardio per chiudere in bellezza.";
  const missing = (targetAerobic > 0 ? Math.max(0, targetAerobic - aerobicDone) : 0) +
    (targetAnaerobic > 0 ? Math.max(0, targetAnaerobic - anaerobicDone) : 0);
  if (missing > 0)
    return `Ancora ${missing} allenament${missing === 1 ? "o" : "i"} per arrivare all'obiettivo. Ce la puoi fare!`;
  return "Imposta nel Profilo le sessioni di cardio e forza: sono gli stessi dati che usiamo per il metabolismo e diventeranno i tuoi obiettivi.";
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [profileGoals, setProfileGoals] = useState<{
    target_aerobic_sessions: number | null;
    target_anaerobic_sessions: number | null;
    distance_unit: "km" | "mi" | null;
  } | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WorkoutWeekly[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekRef, setWeekRef] = useState(new Date());

  const [workoutType, setWorkoutType] = useState<WorkoutType>("aerobic");
  const [exerciseType, setExerciseType] = useState("");
  const [duration, setDuration] = useState("");
  const [kcal, setKcal] = useState("");
  const [hrZ1, setHrZ1] = useState("");
  const [hrZ2, setHrZ2] = useState("");
  const [hrZ3, setHrZ3] = useState("");
  const [hrZ4, setHrZ4] = useState("");
  const [hrZ5, setHrZ5] = useState("");
  const [workoutDate, setWorkoutDate] = useState(getDefaultDate());
  const [workoutTime, setWorkoutTime] = useState(getDefaultTime());
  const [distanceValue, setDistanceValue] = useState("");
  const [paceMinPerUnit, setPaceMinPerUnit] = useState("");
  const [hasGoogleFitToken, setHasGoogleFitToken] = useState<boolean | null>(null);
  const [googleFitSyncing, setGoogleFitSyncing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    if (!session?.user?.id) return;
    const start = getWeekStart(weekRef);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const startStr = toISODate(start);
    const endStr = toISODate(end);
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("workout_at", startStr + "T00:00:00Z")
      .lt("workout_at", endStr + "T00:00:00Z")
      .order("workout_at", { ascending: true });
    if (!error) setWorkouts(data ?? []);
  }, [session?.user?.id, weekRef]);

  const loadWeeklySummaries = useCallback(async () => {
    if (!session?.user?.id) return;
    const starts = getLastWeekStarts(new Date(), 6);
    const startStr = toISODate(starts[starts.length - 1]!);
    const { data, error } = await supabase
      .from("workout_weekly")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("week_start", startStr)
      .order("week_start", { ascending: false });
    if (!error) setWeeklySummaries(data ?? []);
  }, [session?.user?.id]);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("target_aerobic_sessions, target_anaerobic_sessions, distance_unit")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data)
      setProfileGoals({
        ...data,
        distance_unit:
          data.distance_unit === "mi" || data.distance_unit === "km"
            ? data.distance_unit
            : null,
      });
  }, [session?.user?.id]);

  const upsertWeeklyForWeek = useCallback(
    async (weekStart: Date) => {
      if (!session?.user?.id) return;
      const startStr = toISODate(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      const endStr = toISODate(end);
      const { data: list } = await supabase
        .from("workouts")
        .select("id, kcal_burned")
        .eq("user_id", session.user.id)
        .gte("workout_at", startStr + "T00:00:00Z")
        .lt("workout_at", endStr + "T00:00:00Z");
      const total = list?.length ?? 0;
      const totalKcal = (list ?? []).reduce((s, w) => s + Number(w.kcal_burned), 0);
      await supabase.from("workout_weekly").upsert(
        {
          user_id: session.user.id,
          week_start: startStr,
          total_workouts: total,
          total_kcal: totalKcal,
        },
        { onConflict: "user_id,week_start" }
      );
    },
    [session?.user?.id]
  );

  const refreshWeek = useCallback(() => {
    loadWorkouts();
    loadWeeklySummaries();
  }, [loadWorkouts, loadWeeklySummaries]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const starts = getLastWeekStarts(new Date(), 5);
      for (const w of starts) {
        if (cancelled) return;
        await upsertWeeklyForWeek(w);
      }
      await loadProfile();
      await loadWorkouts();
      await loadWeeklySummaries();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, loadProfile, loadWorkouts, loadWeeklySummaries, upsertWeeklyForWeek]);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadWorkouts();
  }, [weekRef, session?.user?.id, loadWorkouts]);

  useEffect(() => {
    let cancelled = false;
    getStoredGoogleFitToken().then((t) => {
      if (!cancelled) setHasGoogleFitToken(!!t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveWorkout = async () => {
    if (!session?.user?.id) return;
    const isoDate = parseDisplayDate(workoutDate);
    if (!isoDate) {
      Alert.alert("Attenzione", "Data non valida. Usa gg-mm-aaaa.");
      return;
    }
    const [h, m] = workoutTime.split(":").map(Number);
    const workoutAt = new Date(isoDate);
    workoutAt.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    const dist = distanceValue ? parseFloat(distanceValue) : 0;
    const pace = paceMinPerUnit ? parseFloat(paceMinPerUnit) : 0;
    let dur = parseInt(duration, 10);
    if (workoutType === "aerobic" && dist > 0 && pace > 0) {
      dur = Math.round(dist * pace);
    }
    const k = parseFloat(kcal);
    if (!dur || dur <= 0 || k < 0) {
      Alert.alert(
        "Attenzione",
        workoutType === "aerobic"
          ? "Inserisci durata (min) oppure distanza + pace, e kcal."
          : "Inserisci durata (min) e kcal."
      );
      return;
    }
    const ex = workoutType === "aerobic" ? AEROBIC_EXERCISES[0]! : ANAEROBIC_EXERCISES[0]!;
    const exercise = exerciseType.trim() || ex;
    const distUnit = profileGoals?.distance_unit ?? "km";
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      type: workoutType,
      exercise_type: exercise,
      duration_minutes: dur,
      kcal_burned: k,
      hr_zone_1_min: parseInt(hrZ1, 10) || 0,
      hr_zone_2_min: parseInt(hrZ2, 10) || 0,
      hr_zone_3_min: parseInt(hrZ3, 10) || 0,
      hr_zone_4_min: parseInt(hrZ4, 10) || 0,
      hr_zone_5_min: parseInt(hrZ5, 10) || 0,
      workout_at: workoutAt.toISOString(),
      ...(workoutType === "aerobic" && dist > 0 && pace > 0
        ? {
            distance_value: dist,
            distance_unit: distUnit,
            pace_min_per_unit: pace,
          }
        : {}),
    };
    const { error } = await supabase.from("workouts").insert(payload);
    setSaving(false);
    if (error) {
      Alert.alert("Errore", error.message);
      return;
    }
    await upsertWeeklyForWeek(getWeekStart(workoutAt));
    await refreshWeek();
    setDuration("");
    setKcal("");
    setDistanceValue("");
    setPaceMinPerUnit("");
    setHrZ1("");
    setHrZ2("");
    setHrZ3("");
    setHrZ4("");
    setHrZ5("");
    setWorkoutDate(getDefaultDate());
    setWorkoutTime(getDefaultTime());
    setShowAddForm(false);
    Alert.alert("Ok", "Allenamento registrato.");
  };

  const weekDates = getWeekDates(weekRef);
  const thisWeekStart = getWeekStart(weekRef);
  const thisWeekKey = toISODate(thisWeekStart);
  const lastWeekStart = getLastWeekStarts(weekRef, 2)[1];
  const lastWeekKey = lastWeekStart ? toISODate(lastWeekStart) : null;
  const thisWeekSummary = weeklySummaries.find((w) => w.week_start === thisWeekKey);
  const lastWeekSummary = lastWeekKey
    ? weeklySummaries.find((w) => w.week_start === lastWeekKey)
    : null;
  const percentVsLastWeek =
    lastWeekSummary && lastWeekSummary.total_kcal > 0 && thisWeekSummary
      ? Math.round(
          ((Number(thisWeekSummary.total_kcal) - Number(lastWeekSummary.total_kcal)) /
            Number(lastWeekSummary.total_kcal)) *
            100
        )
      : null;

  const targetAerobic = profileGoals?.target_aerobic_sessions ?? 0;
  const targetAnaerobic = profileGoals?.target_anaerobic_sessions ?? 0;
  const thisWeekAerobic = workouts.filter((w) => w.type === "aerobic").length;
  const thisWeekAnaerobic = workouts.filter((w) => w.type === "anaerobic").length;
  const goalMessage = getGoalMessage(
    thisWeekAerobic,
    thisWeekAnaerobic,
    targetAerobic,
    targetAnaerobic
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (selectedDate) {
    const dayWorkouts = workouts.filter((w) => {
      const d = new Date(w.workout_at);
      return toISODate(d) === selectedDate;
    });
    const dayLabel = (() => {
      const d = new Date(selectedDate + "T12:00:00");
      const idx = d.getDay();
      const name = idx === 0 ? "Dom" : DAY_LABELS[idx - 1];
      return `${name} ${selectedDate}`;
    })();
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => setSelectedDate(null)}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Riepilogo {dayLabel}</Text>
          {dayWorkouts.length === 0 ? (
            <Text style={styles.hint}>Nessun allenamento in questa data.</Text>
          ) : (
            dayWorkouts.map((w) => (
              // @ts-expect-error key is valid for React list items
              <View style={styles.workoutCard} key={w.id}>
                <Text style={styles.workoutIcon}>
                  {w.type === "aerobic" ? AEROBIC_ICON : ANAEROBIC_ICON}
                </Text>
                <View style={styles.workoutCardBody}>
                  <Text style={styles.workoutType}>
                    {w.type === "aerobic" ? "Aerobico" : "Anaerobico"} – {w.exercise_type}
                  </Text>
                  <Text style={styles.workoutMeta}>
                    {w.duration_minutes} min • {Number(w.kcal_burned)} kcal
                    {w.type === "aerobic" &&
                      w.distance_value != null &&
                      w.pace_min_per_unit != null &&
                      ` • ${Number(w.distance_value)} ${w.distance_unit ?? "km"} • pace ${Number(w.pace_min_per_unit)} min/${w.distance_unit ?? "km"}`}
                  </Text>
                  <Text style={styles.workoutTime}>
                    {new Date(w.workout_at).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  const displayName =
    session?.user?.user_metadata?.username ?? session?.user?.email ?? "Utente";

  const exerciseOptions = workoutType === "aerobic" ? AEROBIC_EXERCISES : ANAEROBIC_EXERCISES;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Ciao, {displayName}</Text>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>Obiettivo settimanale</Text>
        <Text style={styles.goalSubtitle}>
          Dal profilo (sessioni cardio e forza che hai indicato)
        </Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🏃 Cardio / aerobica</Text>
          <Text style={styles.goalValue}>
            {thisWeekAerobic}/{targetAerobic > 0 ? targetAerobic : "—"} sessioni
          </Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>💪 Forza</Text>
          <Text style={styles.goalValue}>
            {thisWeekAnaerobic}/{targetAnaerobic > 0 ? targetAnaerobic : "—"} sessioni
          </Text>
        </View>
        <View style={[styles.goalBar, styles.goalBarAero]}>
          <View
            style={[
              styles.goalBarFill,
              {
                width: `${targetAerobic > 0 ? Math.min(100, (thisWeekAerobic / targetAerobic) * 100) : 0}%`,
              },
            ]}
          />
        </View>
        <View style={[styles.goalBar, styles.goalBarAnaero]}>
          <View
            style={[
              styles.goalBarFill,
              {
                width: `${targetAnaerobic > 0 ? Math.min(100, (thisWeekAnaerobic / targetAnaerobic) * 100) : 0}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.goalMessage}>{goalMessage}</Text>
      </View>

      {/* <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>Google Fit</Text>
        <Text style={styles.goalSubtitle}>
          Importa allenamenti dagli ultimi 7 giorni (durata, kcal, tipo)
        </Text>
        {hasGoogleFitToken === false && (
          <TouchableOpacity
            style={styles.googleFitButton}
            onPress={async () => {
              try {
                const token = await promptGoogleFitAuth();
                setHasGoogleFitToken(!!token);
                if (token) Alert.alert("Ok", "Account Google Fit connesso.");
              } catch (e) {
                Alert.alert(
                  "Configurazione",
                  (e instanceof Error ? e.message : String(e)) +
                    "\n\nVedi docs/GOOGLE_FIT.md per i passaggi."
                );
              }
            }}
          >
            <Text style={styles.googleFitButtonText}>Connetti Google Fit</Text>
          </TouchableOpacity>
        )}
        {hasGoogleFitToken === true && (
          <>
            <TouchableOpacity
              style={[styles.googleFitButton, styles.googleFitSync]}
              onPress={async () => {
                if (!session?.user?.id) return;
                const token = await getStoredGoogleFitToken();
                if (!token?.accessToken) {
                  setHasGoogleFitToken(false);
                  return;
                }
                setGoogleFitSyncing(true);
                try {
                  const list = await fetchGoogleFitWorkouts(token.accessToken, 7);
                  const start = new Date();
                  start.setDate(start.getDate() - 7);
                  const startStr = toISODate(start) + "T00:00:00Z";
                  const { data: existing } = await supabase
                    .from("workouts")
                    .select("workout_at")
                    .eq("user_id", session.user.id)
                    .gte("workout_at", startStr);
                  const existingMinutes = new Set(
                    (existing ?? []).map((w) => w.workout_at.slice(0, 16))
                  );
                  let inserted = 0;
                  for (const w of list) {
                    const key = w.workout_at.slice(0, 16);
                    if (existingMinutes.has(key)) continue;
                    const { error } = await supabase.from("workouts").insert({
                      user_id: session.user.id,
                      type: w.type,
                      exercise_type: w.exercise_type,
                      duration_minutes: w.duration_minutes,
                      kcal_burned: w.kcal_burned,
                      hr_zone_1_min: w.hr_zone_1_min,
                      hr_zone_2_min: w.hr_zone_2_min,
                      hr_zone_3_min: w.hr_zone_3_min,
                      hr_zone_4_min: w.hr_zone_4_min,
                      hr_zone_5_min: w.hr_zone_5_min,
                      workout_at: w.workout_at,
                    });
                    if (!error) {
                      inserted++;
                      existingMinutes.add(key);
                    }
                  }
                  await refreshWeek();
                  Alert.alert(
                    "Sincronizzazione",
                    inserted === 0
                      ? "Nessun nuovo allenamento da importare (già presenti o nessuna sessione negli ultimi 7 giorni)."
                      : `Importati ${inserted} allenament${inserted === 1 ? "o" : "i"} da Google Fit.`
                  );
                } catch (e) {
                  Alert.alert(
                    "Errore",
                    e instanceof Error ? e.message : String(e)
                  );
                } finally {
                  setGoogleFitSyncing(false);
                }
              }}
              disabled={googleFitSyncing}
            >
              {googleFitSyncing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.googleFitButtonText}>Sincronizza da Google Fit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.googleFitDisconnect}
              onPress={async () => {
                await clearGoogleFitToken();
                setHasGoogleFitToken(false);
              }}
            >
              <Text style={styles.googleFitDisconnectText}>Disconnetti Google Fit</Text>
            </TouchableOpacity>
          </>
        )}
      </View> */}

      {showAddForm ? (
        <>
          <Text style={styles.sectionTitle}>Nuovo allenamento</Text>
          <TouchableOpacity
            style={styles.closeFormButton}
            onPress={() => setShowAddForm(false)}
          >
            <Text style={styles.closeFormText}>Chiudi form</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.segButton, workoutType === "aerobic" && styles.segButtonActive]}
              onPress={() => setWorkoutType("aerobic")}
            >
              <Text style={[styles.segText, workoutType === "aerobic" && styles.segTextActive]}>
                Aerobico
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segButton, workoutType === "anaerobic" && styles.segButtonActive]}
              onPress={() => setWorkoutType("anaerobic")}
            >
              <Text style={[styles.segText, workoutType === "anaerobic" && styles.segTextActive]}>
                Anaerobico
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tipo di esercizio</Text>
          <View style={styles.chipRow}>
            {exerciseOptions.map((ex) => (
              <TouchableOpacity
                key={ex}
                style={[styles.chip, exerciseType === ex && styles.chipActive]}
                onPress={() => setExerciseType(ex)}
              >
                <Text style={[styles.chipText, exerciseType === ex && styles.chipTextActive]}>
                  {ex}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {workoutType === "aerobic" && (
            <>
              <Text style={styles.hint}>
                Distanza e pace (opzionale: il tempo si calcola da questi)
              </Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={`Distanza (${profileGoals?.distance_unit ?? "km"})`}
                  placeholderTextColor="#94a3b8"
                  value={distanceValue}
                  onChangeText={(t) => {
                    setDistanceValue(t);
                    const d = parseFloat(t);
                    const p = parseFloat(paceMinPerUnit);
                    if (d > 0 && p > 0) setDuration(String(Math.round(d * p)));
                  }}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitLabel}>{profileGoals?.distance_unit ?? "km"}</Text>
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={`Pace (min/${profileGoals?.distance_unit ?? "km"})`}
                  placeholderTextColor="#94a3b8"
                  value={paceMinPerUnit}
                  onChangeText={(t) => {
                    setPaceMinPerUnit(t);
                    const d = parseFloat(distanceValue);
                    const p = parseFloat(t);
                    if (d > 0 && p > 0) setDuration(String(Math.round(d * p)));
                  }}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitLabel}>
                  min/{profileGoals?.distance_unit ?? "km"}
                </Text>
              </View>
              {distanceValue && paceMinPerUnit && parseFloat(distanceValue) > 0 && parseFloat(paceMinPerUnit) > 0 && (
                <Text style={styles.hint}>
                  Tempo calcolato: {Math.round(parseFloat(distanceValue) * parseFloat(paceMinPerUnit))} min
                </Text>
              )}
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder="Durata (min)"
            placeholderTextColor="#94a3b8"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Kcal bruciate"
            placeholderTextColor="#94a3b8"
            value={kcal}
            onChangeText={setKcal}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Fasce heart rate (minuti per zona)</Text>
          {[
            { label: "Z1", value: hrZ1, set: setHrZ1, bg: "#14532d" },
            { label: "Z2", value: hrZ2, set: setHrZ2, bg: "#166534" },
            { label: "Z3", value: hrZ3, set: setHrZ3, bg: "#854d0e" },
            { label: "Z4", value: hrZ4, set: setHrZ4, bg: "#9a3412" },
            { label: "Z5", value: hrZ5, set: setHrZ5, bg: "#7f1d1d" },
          ].map(({ label, value, set, bg }) => (
            // @ts-expect-error key is valid for React list items
            <View style={[styles.hrZoneRow, { backgroundColor: bg }]} key={label}>
              <TouchableOpacity
                style={styles.hrZoneBtn}
                onPress={() => set(String(Math.max(0, (parseInt(value, 10) || 0) - 1)))}
              >
                <Text style={styles.hrZoneBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.hrZoneLabel}>{label}</Text>
              <TextInput
                style={styles.hrZoneInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={value}
                onChangeText={set}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.hrZoneBtn}
                onPress={() => set(String((parseInt(value, 10) || 0) + 1))}
              >
                <Text style={styles.hrZoneBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Data (gg-mm-aaaa)"
              placeholderTextColor="#94a3b8"
              value={workoutDate}
              onChangeText={setWorkoutDate}
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="Ora (hh:mm)"
              placeholderTextColor="#94a3b8"
              value={workoutTime}
              onChangeText={setWorkoutTime}
            />
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={saveWorkout} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salva allenamento</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.addWorkoutButton}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.addWorkoutButtonText}>+ Aggiungi allenamento</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Settimana</Text>
      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(weekRef);
            d.setDate(d.getDate() - 7);
            setWeekRef(d);
          }}
        >
          <Text style={styles.navText}>← Prec</Text>
        </TouchableOpacity>
        <Text style={styles.weekTitle}>
          {thisWeekStart.getDate()}/{thisWeekStart.getMonth() + 1} –{" "}
          {(() => {
            const end = new Date(thisWeekStart);
            end.setDate(end.getDate() + 6);
            return `${end.getDate()}/${end.getMonth() + 1}`;
          })()}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(weekRef);
            d.setDate(d.getDate() + 7);
            setWeekRef(d);
          }}
        >
          <Text style={styles.navText}>Succ →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekChart}>
        {weekDates.map((d) => {
          const dayKey = toISODate(d);
          const dayWorkouts = workouts.filter((w) => toISODate(new Date(w.workout_at)) === dayKey);
          const count = dayWorkouts.length;
          const lastType = dayWorkouts.length > 0
            ? dayWorkouts[dayWorkouts.length - 1]!.type
            : null;
          const icon = lastType === "aerobic" ? AEROBIC_ICON : lastType === "anaerobic" ? ANAEROBIC_ICON : null;
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          return (
            <TouchableOpacity
              style={styles.dayColumn}
              onPress={() => setSelectedDate(dayKey)}
              key={dayKey}
            >
              <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
              <View style={[styles.dayIconBox, count > 0 && styles.dayIconBoxActive]}>
                <Text style={styles.dayIcon}>{icon ?? "—"}</Text>
                {count > 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Trend e confronto</Text>
      <View style={styles.trendCard}>
        <Text style={styles.trendLabel}>Questa settimana</Text>
        <Text style={styles.trendValue}>
          {(thisWeekSummary?.total_workouts ?? 0)} allenamenti •{" "}
          {Math.round(Number(thisWeekSummary?.total_kcal ?? 0))} kcal
        </Text>
        {percentVsLastWeek != null && (
          <Text
            style={[
              styles.trendPercent,
              percentVsLastWeek >= 0 ? styles.trendPercentGood : styles.trendPercentBad,
            ]}
          >
            {percentVsLastWeek >= 0 ? "+" : ""}
            {percentVsLastWeek}% rispetto alla settimana scorsa
          </Text>
        )}
      </View>
      <View style={styles.trendCard}>
        <Text style={styles.trendLabel}>Ultime settimane (attività)</Text>
        {weeklySummaries.slice(0, 4).map((w) => (
          // @ts-expect-error key is valid for React list items
          <View style={styles.trendRow} key={w.week_start}>
            <Text style={styles.trendWeek}>
              {w.week_start} → {w.total_workouts} all. • {Math.round(Number(w.total_kcal))} kcal
            </Text>
          </View>
        ))}
        {weeklySummaries.length === 0 && (
          <Text style={styles.hint}>Nessun dato ancora.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  title: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 22,
    color: "#f8fafc",
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  goalTitle: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 15,
    color: "#f8fafc",
    marginBottom: 4,
  },
  goalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 10,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  goalLabel: { fontFamily: fonts.regular, fontSize: 14, color: "#e2e8f0" },
  goalValue: { fontFamily: fonts.medium, fontSize: 14, color: "#22c55e" },
  goalBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#334155",
    marginTop: 6,
    overflow: "hidden",
  },
  goalBarAero: { marginTop: 4 },
  goalBarAnaero: { marginBottom: 4 },
  goalBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  goalMessage: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 10,
    fontStyle: "italic",
  },
  addWorkoutButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  addWorkoutButtonText: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 16,
    color: "#fff",
  },
  googleFitButton: {
    backgroundColor: "#4285f4",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  googleFitSync: { backgroundColor: "#0f766e" },
  googleFitButtonText: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 15,
    color: "#fff",
  },
  googleFitDisconnect: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 4,
  },
  googleFitDisconnectText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#94a3b8",
  },
  closeFormButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  closeFormText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#22c55e",
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 16,
    color: "#f8fafc",
    marginTop: 20,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  input: {
    fontFamily: fonts.regular,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#f8fafc",
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 10 },
  flex: { flex: 1 },
  unitLabel: { fontFamily: fonts.regular, fontSize: 14, color: "#94a3b8", minWidth: 36 },
  timeInput: { width: 100 },
  segButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    flex: 1,
  },
  segButtonActive: { backgroundColor: "#22c55e" },
  segText: { fontFamily: fonts.regular, fontSize: 14, color: "#94a3b8" },
  segTextActive: { color: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1e293b",
    borderRadius: 20,
  },
  chipActive: { backgroundColor: "#22c55e" },
  chipText: { fontFamily: fonts.regular, fontSize: 13, color: "#94a3b8" },
  chipTextActive: { color: "#fff" },
  hrZoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  hrZoneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  hrZoneBtnText: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: "#fff",
    width: 20,
    textAlign: "center",
  },
  hrZoneLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "rgba(255,255,255,0.95)",
    width: 28,
    textAlign: "center",
  },
  hrZoneInput: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#fff",
    width: 48,
    textAlign: "center",
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { fontFamily: fonts.bold, fontWeight: fontWeights.bold, fontSize: 16, color: "#fff" },
  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navText: { fontFamily: fonts.regular, fontSize: 14, color: "#22c55e" },
  weekTitle: { fontFamily: fonts.medium, fontSize: 14, color: "#e2e8f0" },
  weekChart: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  dayColumn: { alignItems: "center", flex: 1 },
  dayLabel: { fontFamily: fonts.regular, fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  dayIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  dayIconBoxActive: { backgroundColor: "#1e3a2f" },
  dayIcon: { fontSize: 20 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: "#fff" },
  trendCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  trendLabel: { fontFamily: fonts.medium, fontSize: 14, color: "#94a3b8", marginBottom: 6 },
  trendValue: { fontFamily: fonts.regular, fontSize: 15, color: "#f8fafc" },
  trendPercent: { fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  trendPercentGood: { color: "#22c55e" },
  trendPercentBad: { color: "#eab308" },
  trendRow: { marginTop: 4 },
  trendWeek: { fontFamily: fonts.regular, fontSize: 13, color: "#e2e8f0" },
  backRow: { padding: 16, paddingTop: 8 },
  backText: { fontFamily: fonts.medium, fontSize: 16, color: "#22c55e" },
  workoutCard: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  workoutIcon: { fontSize: 28, marginRight: 12 },
  workoutCardBody: { flex: 1 },
  workoutType: { fontFamily: fonts.bold, fontSize: 15, color: "#f8fafc" },
  workoutMeta: { fontFamily: fonts.regular, fontSize: 13, color: "#94a3b8", marginTop: 2 },
  workoutTime: { fontFamily: fonts.regular, fontSize: 12, color: "#64748b", marginTop: 2 },
});
