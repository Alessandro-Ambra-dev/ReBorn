import React, { useEffect, useLayoutEffect, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";
import { fonts, fontWeights } from "@/lib/theme";
import {
  calculateBMR,
  lbsToKg,
  feetInchesToCm,
  getAgeFromBirthDate,
  parseDisplayBirthDateToISO,
  formatISOToDisplay,
} from "@/lib/bmr";
import {
  getBmiZone,
  getStepsZone,
  getAerobicZone,
  getAnaerobicZone,
  getWaterZone,
  getZoneColor,
  getBodyDescription,
} from "@/lib/guidelines";

type WeightUnit = "kg" | "lbs";
type HeightUnit = "cm" | "ft";
type DistanceUnit = "km" | "mi";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [heightValue, setHeightValue] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [dailySteps, setDailySteps] = useState("");
  const [aerobicSessions, setAerobicSessions] = useState("");
  const [aerobicDurationMin, setAerobicDurationMin] = useState("");
  const [anaerobicSessions, setAnaerobicSessions] = useState("");
  const [anaerobicDurationMin, setAnaerobicDurationMin] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dailyWater, setDailyWater] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [showForm, setShowForm] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }
      if (data) {
        setProfile(data);
        setUsername(data.username ?? "");
        setWeightValue(data.weight_value != null ? String(data.weight_value) : "");
        setWeightUnit((data.weight_unit as WeightUnit) ?? "kg");
        setHeightValue(data.height_value != null ? String(data.height_value) : "");
        setHeightUnit((data.height_unit as HeightUnit) ?? "cm");
        setDailySteps(data.daily_steps_avg != null ? String(data.daily_steps_avg) : "");
        setAerobicSessions(
          data.target_aerobic_sessions != null
            ? String(data.target_aerobic_sessions)
            : data.weekly_aerobic_min != null && data.weekly_aerobic_min > 0
              ? "1"
              : ""
        );
        setAerobicDurationMin(
          data.weekly_aerobic_min != null ? String(data.weekly_aerobic_min) : ""
        );
        setAnaerobicSessions(
          data.target_anaerobic_sessions != null
            ? String(data.target_anaerobic_sessions)
            : data.weekly_anaerobic_min != null && data.weekly_anaerobic_min > 0
              ? "1"
              : ""
        );
        setAnaerobicDurationMin(
          data.weekly_anaerobic_min != null ? String(data.weekly_anaerobic_min) : ""
        );
        setBirthDate(data.birth_date ? formatISOToDisplay(data.birth_date) : "");
        setGender((data.gender as "male" | "female") ?? "");
        setDailyWater(
          data.daily_water_liters != null ? String(data.daily_water_liters) : ""
        );
        setDistanceUnit(
          (data.distance_unit as DistanceUnit) === "mi" ? "mi" : "km"
        );
        const hasBiometric =
          data.weight_value != null &&
          data.height_value != null &&
          data.birth_date != null &&
          data.gender != null;
        setShowForm(!hasBiometric);
      } else {
        setShowForm(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const saveProfile = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    const payload = {
      username: username.trim() || null,
      weight_value: weightValue ? parseFloat(weightValue) : null,
      weight_unit: weightValue ? weightUnit : null,
      height_value: heightValue ? parseFloat(heightValue) : null,
      height_unit: heightValue ? heightUnit : null,
      daily_steps_avg: dailySteps ? parseInt(dailySteps, 10) : null,
      weekly_aerobic_min:
        aerobicSessions && aerobicDurationMin
          ? parseInt(aerobicSessions, 10) * parseInt(aerobicDurationMin, 10)
          : null,
      weekly_anaerobic_min:
        anaerobicSessions && anaerobicDurationMin
          ? parseInt(anaerobicSessions, 10) * parseInt(anaerobicDurationMin, 10)
          : null,
      birth_date: parseDisplayBirthDateToISO(birthDate) || null,
      gender: gender || null,
      daily_water_liters: dailyWater ? parseFloat(dailyWater) : null,
      distance_unit: distanceUnit,
      target_aerobic_sessions: aerobicSessions ? parseInt(aerobicSessions, 10) : null,
      target_anaerobic_sessions: anaerobicSessions ? parseInt(anaerobicSessions, 10) : null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert("Errore", error.message);
    } else {
      setProfile((p) => (p ? { ...p, ...payload } : null));
      Alert.alert("Successo", "Profilo biometrico salvato con successo.");
      setShowForm(false);
    }
  };

  const weightKg =
    weightValue && weightUnit === "kg"
      ? parseFloat(weightValue)
      : weightValue && weightUnit === "lbs"
        ? lbsToKg(parseFloat(weightValue))
        : null;
  const heightCm =
    heightValue && heightUnit === "cm"
      ? parseFloat(heightValue)
      : heightValue && heightUnit === "ft"
        ? (() => {
            const parts = heightValue.split(".");
            const feet = parseInt(parts[0] ?? "0", 10);
            const inches = parts[1] ? parseInt(parts[1], 10) : 0;
            return feetInchesToCm(feet, inches);
          })()
        : null;
  const birthDateIso = parseDisplayBirthDateToISO(birthDate);
  const age = birthDateIso ? getAgeFromBirthDate(birthDateIso) : null;
  const bmr =
    weightKg != null && heightCm != null && age != null && gender
      ? Math.round(calculateBMR({ weightKg, heightCm, age, gender }))
      : null;
  const bmi =
    weightKg != null && heightCm != null && heightCm > 0
      ? weightKg / Math.pow(heightCm / 100, 2)
      : null;
  const aerobicTotal =
    aerobicSessions && aerobicDurationMin
      ? parseInt(aerobicSessions, 10) * parseInt(aerobicDurationMin, 10)
      : null;
  const anaerobicTotal =
    anaerobicSessions && anaerobicDurationMin
      ? parseInt(anaerobicSessions, 10) * parseInt(anaerobicDurationMin, 10)
      : null;
  const waterLiters = dailyWater ? parseFloat(dailyWater) : null;

  useLayoutEffect(() => {
    if (showForm) {
      navigation.setOptions({ headerRight: undefined });
    } else {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: "#22c55e", fontSize: 16, fontWeight: "600" }}>
              Modifica
            </Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [showForm, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  const summaryDescription = getBodyDescription({
    bmi: bmi ?? null,
    steps: dailySteps ? parseInt(dailySteps, 10) : null,
    aerobicMin: aerobicTotal,
    anaerobicMin: anaerobicTotal,
    waterLiters,
    gender: gender === "male" || gender === "female" ? gender : "male",
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {showForm ? (
        <>
          <Text style={styles.sectionTitle}>Profilo</Text>
          <TextInput
        style={styles.input}
        placeholder="Nome utente"
        placeholderTextColor="#94a3b8"
        value={username}
        onChangeText={setUsername}
        editable={!saving}
      />

      <Text style={styles.sectionTitle}>Peso</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder={weightUnit === "kg" ? "kg" : "lbs"}
          placeholderTextColor="#94a3b8"
          value={weightValue}
          onChangeText={setWeightValue}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segButton, weightUnit === "kg" && styles.segButtonActive]}
            onPress={() => setWeightUnit("kg")}
          >
            <Text style={[styles.segText, weightUnit === "kg" && styles.segTextActive]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segButton, weightUnit === "lbs" && styles.segButtonActive]}
            onPress={() => setWeightUnit("lbs")}
          >
            <Text style={[styles.segText, weightUnit === "lbs" && styles.segTextActive]}>lbs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Altezza</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder={heightUnit === "cm" ? "cm" : "ft (es. 5.10)"}
          placeholderTextColor="#94a3b8"
          value={heightValue}
          onChangeText={setHeightValue}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segButton, heightUnit === "cm" && styles.segButtonActive]}
            onPress={() => setHeightUnit("cm")}
          >
            <Text style={[styles.segText, heightUnit === "cm" && styles.segTextActive]}>cm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segButton, heightUnit === "ft" && styles.segButtonActive]}
            onPress={() => setHeightUnit("ft")}
          >
            <Text style={[styles.segText, heightUnit === "ft" && styles.segTextActive]}>ft</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Passi giornalieri (media)</Text>
      <TextInput
        style={styles.input}
        placeholder="Es. 8000"
        placeholderTextColor="#94a3b8"
        value={dailySteps}
        onChangeText={setDailySteps}
        keyboardType="number-pad"
        editable={!saving}
      />

      <Text style={styles.sectionTitle}>Unità distanza (corsa/cardio)</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.segButton, distanceUnit === "km" && styles.segButtonActive]}
          onPress={() => setDistanceUnit("km")}
        >
          <Text style={[styles.segText, distanceUnit === "km" && styles.segTextActive]}>km</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segButton, distanceUnit === "mi" && styles.segButtonActive]}
          onPress={() => setDistanceUnit("mi")}
        >
          <Text style={[styles.segText, distanceUnit === "mi" && styles.segTextActive]}>miglia</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Attività settimanale (obiettivi)</Text>
      <Text style={styles.hint}>
        Le sessioni che indici qui sono i tuoi obiettivi settimanali: nella Home potrai tracciarli e superarli.
      </Text>
      <Text style={styles.hint}>Aerobica (corsa, nuoto, cardio...)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder="Sessioni"
          placeholderTextColor="#94a3b8"
          value={aerobicSessions}
          onChangeText={setAerobicSessions}
          keyboardType="number-pad"
          editable={!saving}
        />
        <Text style={styles.unitLabel}>sessioni da</Text>
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="min"
          placeholderTextColor="#94a3b8"
          value={aerobicDurationMin}
          onChangeText={setAerobicDurationMin}
          keyboardType="number-pad"
          editable={!saving}
        />
        <Text style={styles.unitLabel}>min</Text>
      </View>
      {aerobicSessions && aerobicDurationMin && (
        <Text style={styles.hint}>
          Totale: {parseInt(aerobicSessions, 10) * parseInt(aerobicDurationMin, 10)} min/settimana
        </Text>
      )}
      <Text style={styles.hint}>Anaerobica (pesi, forza...)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder="Sessioni"
          placeholderTextColor="#94a3b8"
          value={anaerobicSessions}
          onChangeText={setAnaerobicSessions}
          keyboardType="number-pad"
          editable={!saving}
        />
        <Text style={styles.unitLabel}>sessioni da</Text>
        <TextInput
          style={[styles.input, styles.durationInput]}
          placeholder="min"
          placeholderTextColor="#94a3b8"
          value={anaerobicDurationMin}
          onChangeText={setAnaerobicDurationMin}
          keyboardType="number-pad"
          editable={!saving}
        />
        <Text style={styles.unitLabel}>min</Text>
      </View>
      {anaerobicSessions && anaerobicDurationMin && (
        <Text style={styles.hint}>
          Totale: {parseInt(anaerobicSessions, 10) * parseInt(anaerobicDurationMin, 10)} min/settimana
        </Text>
      )}

      <Text style={styles.sectionTitle}>Età e sesso (per BMR)</Text>
      <TextInput
        style={styles.input}
        placeholder="Data di nascita (gg-mm-aaaa)"
        placeholderTextColor="#94a3b8"
        value={birthDate}
        onChangeText={setBirthDate}
        editable={!saving}
      />
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.segButton, gender === "male" && styles.segButtonActive]}
          onPress={() => setGender("male")}
        >
          <Text style={[styles.segText, gender === "male" && styles.segTextActive]}>Uomo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segButton, gender === "female" && styles.segButtonActive]}
          onPress={() => setGender("female")}
        >
          <Text style={[styles.segText, gender === "female" && styles.segTextActive]}>Donna</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Acqua giornaliera (litri)</Text>
      <Text style={styles.hint}>Linee guida EFSA: ~2 L donne, ~2.5 L uomini</Text>
      <TextInput
        style={styles.input}
        placeholder="Es. 2.0"
        placeholderTextColor="#94a3b8"
        value={dailyWater}
        onChangeText={setDailyWater}
        keyboardType="decimal-pad"
        editable={!saving}
      />

      {bmr != null && (
        <View style={styles.bmrBox}>
          <Text style={styles.bmrLabel}>Metabolismo basale (BMR)</Text>
          <Text style={styles.bmrValue}>{bmr} kcal/giorno</Text>
          <Text style={styles.bmrHint}>Formula Mifflin-St Jeor</Text>
        </View>
      )}

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salva profilo</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.summaryIconBox}>
            <Text style={styles.summaryIcon}>
              {gender === "female" ? "🏋️‍♀️" : "🏋️‍♂️"}
            </Text>
            {username ? (
              <Text style={styles.summaryName}>{username}</Text>
            ) : null}
          </View>
          <View style={styles.summaryCard}>
            {summaryDescription.split("\n\n").map((line, i) => (
              <Text key={i} style={styles.summaryDesc}>{line}</Text>
            ))}
          </View>
          {bmr != null && (
            <View style={styles.bmrBox}>
              <Text style={styles.bmrLabel}>Metabolismo basale (BMR)</Text>
              <Text style={styles.bmrValue}>{bmr} kcal/giorno</Text>
            </View>
          )}
          <Text style={styles.indicatorsTitle}>Indicatori (linee guida OMS/EFSA)</Text>
          <View style={styles.indicatorsList}>
            {bmi != null && (
              <View style={styles.indicatorRow}>
                <View style={[styles.zoneDot, { backgroundColor: getZoneColor(getBmiZone(bmi).zone) }]} />
                <Text style={styles.indicatorText}>
                  <Text style={styles.indicatorKey}>BMI  </Text>
                  {bmi.toFixed(1)} — {getBmiZone(bmi).label}
                </Text>
              </View>
            )}
            {dailySteps ? (
              (() => {
                const steps = parseInt(dailySteps, 10);
                const { zone, label } = getStepsZone(steps);
                return (
                  <View style={styles.indicatorRow}>
                    <View style={[styles.zoneDot, { backgroundColor: getZoneColor(zone) }]} />
                    <Text style={styles.indicatorText}>
                      <Text style={styles.indicatorKey}>Passi/giorno  </Text>
                      {steps.toLocaleString()} — {label}
                    </Text>
                  </View>
                );
              })()
            ) : null}
            {aerobicTotal != null ? (
              (() => {
                const { zone, label } = getAerobicZone(aerobicTotal);
                return (
                  <View style={styles.indicatorRow}>
                    <View style={[styles.zoneDot, { backgroundColor: getZoneColor(zone) }]} />
                    <Text style={styles.indicatorText}>
                      <Text style={styles.indicatorKey}>Aerobica/sett  </Text>
                      {aerobicTotal} min — {label}
                    </Text>
                  </View>
                );
              })()
            ) : null}
            {anaerobicTotal != null ? (
              (() => {
                const { zone, label } = getAnaerobicZone(anaerobicTotal);
                return (
                  <View style={styles.indicatorRow}>
                    <View style={[styles.zoneDot, { backgroundColor: getZoneColor(zone) }]} />
                    <Text style={styles.indicatorText}>
                      <Text style={styles.indicatorKey}>Anaerobica/sett  </Text>
                      {anaerobicTotal} min — {label}
                    </Text>
                  </View>
                );
              })()
            ) : null}
            {waterLiters != null && gender ? (
              (() => {
                const { zone, label } = getWaterZone(waterLiters, gender as "male" | "female");
                return (
                  <View style={styles.indicatorRow}>
                    <View style={[styles.zoneDot, { backgroundColor: getZoneColor(zone) }]} />
                    <Text style={styles.indicatorText}>
                      <Text style={styles.indicatorKey}>Acqua/giorno  </Text>
                      {waterLiters} L — {label}
                    </Text>
                  </View>
                );
              })()
            ) : null}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()} disabled={saving}>
        <Text style={styles.signOutText}>Esci</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 16,
    color: "#f8fafc",
    marginTop: 16,
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
    padding: 16,
    fontSize: 16,
    color: "#f8fafc",
    marginBottom: 12,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  flex: { flex: 1 },
  unitLabel: { fontFamily: fonts.regular, fontSize: 14, color: "#94a3b8", minWidth: 70 },
  durationInput: { width: 72, marginBottom: 0 },
  segmented: { flexDirection: "row" },
  segButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginLeft: 6,
  },
  segButtonActive: { backgroundColor: "#22c55e" },
  segText: { fontFamily: fonts.regular, fontSize: 14, color: "#94a3b8" },
  segTextActive: { color: "#fff" },
  bmrBox: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    alignItems: "center",
  },
  bmrLabel: { fontFamily: fonts.medium, fontWeight: fontWeights.medium, fontSize: 14, color: "#94a3b8" },
  bmrValue: { fontFamily: fonts.bold, fontWeight: fontWeights.bold, fontSize: 28, color: "#22c55e", marginTop: 4 },
  bmrHint: { fontFamily: fonts.regular, fontSize: 12, color: "#64748b", marginTop: 4 },
  saveButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: { fontFamily: fonts.bold, fontWeight: fontWeights.bold, fontSize: 18, color: "#fff" },
  signOutButton: { marginTop: 16, alignItems: "center" },
  signOutText: { fontFamily: fonts.regular, fontSize: 15, color: "#ef4444" },
  summaryIconBox: { alignItems: "center", paddingVertical: 24 },
  summaryIcon: { fontSize: 80, marginBottom: 8 },
  summaryName: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 20,
    color: "#f8fafc",
  },
  summaryCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  summaryDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#e2e8f0",
  },
  indicatorsTitle: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  indicatorsList: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    flexShrink: 0,
  },
  indicatorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#e2e8f0",
    flex: 1,
  },
  indicatorKey: {
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    color: "#94a3b8",
  },
});
