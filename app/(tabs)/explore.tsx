import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { fonts, fontWeights } from "@/lib/theme";
import { toISODate, getWeekStart } from "@/lib/workout";
import type { Profile, Workout } from "@/lib/database.types";

type FoodLog = {
  id: string;
  user_id: string;
  food_id: string | null;
  name: string;
  brand: string | null;
  grams: number;
  kcal: number;
  carbs_g: number;
  fat_g: number;
  protein_g: number;
  logged_at: string;
};

type FoodLibraryItem = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  code: string | null;
  base_amount_grams: number;
  kcal_per_base: number;
  carbs_g_per_base: number;
  fat_g_per_base: number;
  protein_g_per_base: number;
};

export default function ExploreScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingFood, setSavingFood] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [dayWorkouts, setDayWorkouts] = useState<Pick<Workout, "kcal_burned" | "workout_at">[]>([]);
  const [foodLibrary, setFoodLibrary] = useState<FoodLibraryItem[]>([]);

  // Settings form state
  const [goalKcal, setGoalKcal] = useState("");
  const [includeActiveKcal, setIncludeActiveKcal] = useState(true);
  const [carbPct, setCarbPct] = useState("50");
  const [fatPct, setFatPct] = useState("25");
  const [proteinPct, setProteinPct] = useState("25");

  // Food form state
  const [foodName, setFoodName] = useState("");
  const [foodBrand, setFoodBrand] = useState("");
  const [foodCode, setFoodCode] = useState("");
  const [kcalPer100, setKcalPer100] = useState("");
  const [carbPer100, setCarbPer100] = useState("");
  const [fatPer100, setFatPer100] = useState("");
  const [proteinPer100, setProteinPer100] = useState("");
  const [gramsConsumed, setGramsConsumed] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<FoodLibraryItem | null>(null);

  // Camera / scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);

  const dayKey = useMemo(() => toISODate(selectedDate), [selectedDate]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const selectedDayStart = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);
  const canGoNextDay = selectedDayStart.getTime() < today.getTime();
  const selectedWeekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const isCurrentWeek =
    selectedWeekStart.getFullYear() === currentWeekStart.getFullYear() &&
    selectedWeekStart.getMonth() === currentWeekStart.getMonth() &&
    selectedWeekStart.getDate() === currentWeekStart.getDate();

  const loadProfileSettings = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "*, daily_kcal_goal, include_active_kcal, macro_carb_pct, macro_fat_pct, macro_protein_pct"
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) return;
    if (data) {
      setProfile(data as Profile);
      setGoalKcal(data.daily_kcal_goal != null ? String(data.daily_kcal_goal) : "");
      setIncludeActiveKcal(data.include_active_kcal ?? true);
      setCarbPct(data.macro_carb_pct != null ? String(data.macro_carb_pct) : "50");
      setFatPct(data.macro_fat_pct != null ? String(data.macro_fat_pct) : "25");
      setProteinPct(data.macro_protein_pct != null ? String(data.macro_protein_pct) : "25");
    }
  }, [userId]);

  const loadFoodLibrary = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("food_library")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setFoodLibrary((data as FoodLibraryItem[]) ?? []);
  }, [userId]);

  const loadDayData = useCallback(async () => {
    if (!userId) return;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const startIso = toISODate(start) + "T00:00:00Z";
    const endIso = toISODate(end) + "T00:00:00Z";

    const [{ data: logs }, { data: workouts }] = await Promise.all([
      supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", startIso)
        .lt("logged_at", endIso)
        .order("logged_at", { ascending: true }),
      supabase
        .from("workouts")
        .select("kcal_burned, workout_at")
        .eq("user_id", userId)
        .gte("workout_at", startIso)
        .lt("workout_at", endIso),
    ]);

    setFoodLogs((logs as FoodLog[]) ?? []);
    setDayWorkouts((workouts as any) ?? []);
  }, [selectedDate, userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      await loadProfileSettings();
      await loadFoodLibrary();
      await loadDayData();
      setLoading(false);
    })();
  }, [userId, loadProfileSettings, loadFoodLibrary, loadDayData]);

  useEffect(() => {
    if (!userId) return;
    loadDayData();
  }, [dayKey, userId, loadDayData]);

  const totalFoodKcal = useMemo(
    () => foodLogs.reduce((s, f) => s + Number(f.kcal || 0), 0),
    [foodLogs]
  );
  const totalCarb = useMemo(
    () => foodLogs.reduce((s, f) => s + Number(f.carbs_g || 0), 0),
    [foodLogs]
  );
  const totalFat = useMemo(
    () => foodLogs.reduce((s, f) => s + Number(f.fat_g || 0), 0),
    [foodLogs]
  );
  const totalProtein = useMemo(
    () => foodLogs.reduce((s, f) => s + Number(f.protein_g || 0), 0),
    [foodLogs]
  );
  const activeKcal = useMemo(
    () => dayWorkouts.reduce((s, w) => s + Number(w.kcal_burned || 0), 0),
    [dayWorkouts]
  );

  const baseGoal = Number(goalKcal || 0);
  const effectiveGoal = includeActiveKcal ? baseGoal + activeKcal : baseGoal;

  const carbPctNum = Number(carbPct || 0);
  const fatPctNum = Number(fatPct || 0);
  const proteinPctNum = Number(proteinPct || 0);
  const pctSum = carbPctNum + fatPctNum + proteinPctNum;

  const targetCarbG = baseGoal > 0 ? (baseGoal * (carbPctNum / 100)) / 4 : 0;
  const targetProteinG = baseGoal > 0 ? (baseGoal * (proteinPctNum / 100)) / 4 : 0;
  const targetFatG = baseGoal > 0 ? (baseGoal * (fatPctNum / 100)) / 9 : 0;

  const handleSaveSettings = async () => {
    if (!userId) return;
    const sum = carbPctNum + fatPctNum + proteinPctNum;
    if (Math.abs(sum - 100) > 0.01) {
      Alert.alert(
        "Attenzione",
        "La somma delle percentuali di carboidrati, grassi e proteine deve essere esattamente 100%."
      );
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        daily_kcal_goal: baseGoal || null,
        include_active_kcal: includeActiveKcal,
        macro_carb_pct: carbPctNum,
        macro_fat_pct: fatPctNum,
        macro_protein_pct: proteinPctNum,
      })
      .eq("id", userId);
    setSavingSettings(false);
    if (error) {
      Alert.alert("Errore", error.message);
    } else {
      Alert.alert("Ok", "Impostazioni salvate.");
    }
  };

  const resetFoodForm = () => {
    setFoodName("");
    setFoodBrand("");
    setFoodCode("");
    setKcalPer100("");
    setCarbPer100("");
    setFatPer100("");
    setProteinPer100("");
    setGramsConsumed("");
    setSaveToLibrary(false);
    setEditingLibraryItem(null);
  };

  const handleSaveFood = async () => {
    if (!userId) return;
    const grams = parseFloat(gramsConsumed.replace(",", "."));
    const k100 = parseFloat(kcalPer100.replace(",", "."));
    const c100 = parseFloat(carbPer100.replace(",", "."));
    const f100 = parseFloat(fatPer100.replace(",", "."));
    const p100 = parseFloat(proteinPer100.replace(",", "."));
    if (!foodName.trim() || !grams || !k100) {
      Alert.alert(
        "Attenzione",
        "Inserisci almeno nome alimento, kcal per 100g e grammi consumati."
      );
      return;
    }
    const factor = grams / 100;
    const kcal = k100 * factor;
    const carbs = c100 * factor || 0;
    const fat = f100 * factor || 0;
    const protein = p100 * factor || 0;

    setSavingFood(true);

    let foodId: string | null = editingLibraryItem?.id ?? null;

    if (saveToLibrary) {
      if (foodId) {
        const { error } = await supabase
          .from("food_library")
          .update({
            name: foodName.trim(),
            brand: foodBrand.trim() || null,
            code: foodCode.trim() || null,
            base_amount_grams: 100,
            kcal_per_base: k100,
            carbs_g_per_base: c100 || 0,
            fat_g_per_base: f100 || 0,
            protein_g_per_base: p100 || 0,
          })
          .eq("id", foodId);
        if (error) {
          setSavingFood(false);
          Alert.alert("Errore", error.message);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("food_library")
          .insert({
            user_id: userId,
            name: foodName.trim(),
            brand: foodBrand.trim() || null,
            code: foodCode.trim() || null,
            base_amount_grams: 100,
            kcal_per_base: k100,
            carbs_g_per_base: c100 || 0,
            fat_g_per_base: f100 || 0,
            protein_g_per_base: p100 || 0,
          })
          .select("id")
          .maybeSingle();
        if (error) {
          setSavingFood(false);
          Alert.alert("Errore", error.message);
          return;
        }
        foodId = data?.id ?? null;
      }
    }

    const loggedAt = new Date(dayKey + "T12:00:00Z").toISOString();
    const { error: logError } = await supabase.from("food_logs").insert({
      user_id: userId,
      food_id: foodId,
      name: foodName.trim(),
      brand: foodBrand.trim() || null,
      grams,
      kcal,
      carbs_g: carbs,
      fat_g: fat,
      protein_g: protein,
      logged_at: loggedAt,
    });
    setSavingFood(false);
    if (logError) {
      Alert.alert("Errore", logError.message);
      return;
    }
    await Promise.all([loadDayData(), loadFoodLibrary()]);
    resetFoodForm();
    Alert.alert("Ok", "Alimento registrato.");
  };

  const startScan = async () => {
    if (!permission || !permission.granted) {
      await requestPermission();
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = async (result: any) => {
    if (!userId) return;
    setShowScanner(false);
    const raw = String(result?.data ?? "").trim();
    if (!raw) return;
    const code = raw;
    setFoodCode(code);

    // 1) Prova prima nella libreria locale
    const { data } = await supabase
      .from("food_library")
      .select("*")
      .eq("user_id", userId)
      .eq("code", code)
      .maybeSingle();
    if (data) {
      const item = data as FoodLibraryItem;
      setEditingLibraryItem(item);
      setFoodName(item.name);
      setFoodBrand(item.brand ?? "");
      setKcalPer100(String(item.kcal_per_base));
      setCarbPer100(String(item.carbs_g_per_base));
      setFatPer100(String(item.fat_g_per_base));
      setProteinPer100(String(item.protein_g_per_base));
      setSaveToLibrary(true);
      Alert.alert(
        "Alimento trovato",
        "Valori nutrizionali caricati dalla tua libreria. Inserisci i grammi consumati."
      );
      return;
    }

    // 2) Se non esiste in libreria, il codice deve essere numerico per le API esterne
    if (!/^\d{8,14}$/.test(code)) {
      Alert.alert(
        "Codice non supportato",
        "Questo QR code non contiene un codice a barre numerico standard. Inserisci manualmente i valori nutrizionali."
      );
      return;
    }

    // 2a) Provider SnapCalorie (se configurato)
    const snapKey = process.env.EXPO_PUBLIC_SNAPCALORIE_API_KEY;
    if (snapKey) {
      try {
        const urlSnap = `https://us-central1-snapcalorieb2bapi.cloudfunctions.net/upc?key=${encodeURIComponent(
          snapKey
        )}&upc=${encodeURIComponent(code)}`;
        const resSnap = await fetch(urlSnap);
        if (resSnap.ok) {
          const js = (await resSnap.json()) as any;
          if (js.success && js.data && js.data.nutrition_per_100g) {
            const n100 = js.data.nutrition_per_100g;
            const kcal100 = n100.calories_kcal;
            const carbs100 = n100.carb_g;
            const fat100 = n100.fat_g;
            const protein100 = n100.protein_g;
            if (kcal100 != null) {
              setFoodName(js.data.name || "");
              setFoodBrand("");
              setKcalPer100(String(kcal100));
              if (carbs100 != null && !Number.isNaN(carbs100))
                setCarbPer100(String(carbs100));
              if (fat100 != null && !Number.isNaN(fat100)) setFatPer100(String(fat100));
              if (protein100 != null && !Number.isNaN(protein100))
                setProteinPer100(String(protein100));
              setSaveToLibrary(true);
              Alert.alert(
                "Valori trovati online",
                "Abbiamo precompilato i valori nutrizionali per 100 g da SnapCalorie. Controllali, inserisci i grammi consumati e salva l'alimento (rimarrà nella tua libreria)."
              );
              return;
            }
          }
        }
      } catch {
        // in caso di errore SnapCalorie, prosegui con gli altri provider / fallback
      }
    }

    // 2b) Provider Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        code
      )}?fields=product_name,brands,nutriments`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as any;
      if (json.status !== 1 || !json.product || !json.product.nutriments) {
        Alert.alert(
          "Valori non trovati",
          "Non abbiamo trovato valori nutrizionali per questo codice. Inseriscili manualmente e salvali in libreria."
        );
        return;
      }
      const n = json.product.nutriments;
      const kcal100 =
        n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy_100g"] ?? n["energy"];
      const carbs100 = n["carbohydrates_100g"] ?? n["carbohydrates"];
      const fat100 = n["fat_100g"] ?? n["fat"];
      const protein100 = n["proteins_100g"] ?? n["proteins"];

      if (kcal100 == null) {
        Alert.alert(
          "Valori incompleti",
          "L'API non restituisce le kcal per 100 g per questo prodotto. Inserisci i valori manualmente."
        );
        return;
      }

      setFoodName(json.product.product_name || "");
      setFoodBrand(json.product.brands || "");
      setKcalPer100(String(kcal100));
      setCarbPer100(
        carbs100 != null && !Number.isNaN(carbs100) ? String(carbs100) : carbPer100
      );
      setFatPer100(fat100 != null && !Number.isNaN(fat100) ? String(fat100) : fatPer100);
      setProteinPer100(
        protein100 != null && !Number.isNaN(protein100) ? String(protein100) : proteinPer100
      );
      setSaveToLibrary(true);
      Alert.alert(
        "Valori trovati online",
        "Abbiamo precompilato i valori nutrizionali per 100 g da Open Food Facts. Controllali, inserisci i grammi consumati e salva l'alimento (rimarrà nella tua libreria)."
      );
    } catch (e) {
      Alert.alert(
        "Errore API",
        "Impossibile recuperare i dati nutrizionali online. Inserisci i valori manualmente."
      );
    }
  };

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Accedi per usare il tracker calorie.</Text>
      </View>
    );
  }

  if (showScanner) {
    if (!permission || !permission.granted) {
      return (
        <View style={styles.centered}>
          <Text style={styles.centeredText}>
            Per scannerizzare le etichette servono i permessi fotocamera.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Concedi permesso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowScanner(false)}>
            <Text style={styles.secondaryButtonText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.scannerCamera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Inquadra il QR code o il codice a barre dell'etichetta</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowScanner(false)}>
            <Text style={styles.secondaryButtonText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Tracker giornaliero kcal</Text>

      {/* Impostazioni obiettivo e macro */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impostazioni giornaliere</Text>
        <Text style={styles.label}>Obiettivo base kcal</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Es. 2200"
          placeholderTextColor="#94a3b8"
          value={goalKcal}
          onChangeText={setGoalKcal}
        />
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Aggiungi kcal bruciate dagli allenamenti</Text>
          <Switch value={includeActiveKcal} onValueChange={setIncludeActiveKcal} />
        </View>
        <Text style={styles.hint}>
          Kcal attive oggi dagli allenamenti: {Math.round(activeKcal)} kcal
        </Text>
        <Text style={styles.hint}>
          Obiettivo effettivo di oggi: {Math.round(effectiveGoal)} kcal
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Ripartizione macronutrienti (%)</Text>
        <View style={styles.row}>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Carboidrati</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={carbPct}
              onChangeText={setCarbPct}
            />
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Grassi</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={fatPct}
              onChangeText={setFatPct}
            />
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Proteine</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={proteinPct}
              onChangeText={setProteinPct}
            />
          </View>
        </View>
        <Text
          style={[
            styles.hint,
            { color: Math.abs(pctSum - 100) > 0.01 ? "#f97316" : "#22c55e", marginTop: 4 },
          ]}
        >
          Somma: {pctSum.toFixed(2)}%
        </Text>
        {baseGoal > 0 && (
          <Text style={styles.hint}>
            Target: {Math.round(targetCarbG)} g carb • {Math.round(targetFatG)} g grassi •{" "}
            {Math.round(targetProteinG)} g proteine
          </Text>
        )}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSaveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Salva impostazioni</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Riepilogo giorno */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Riepilogo {dayKey}</Text>
            <Text
              style={[
                styles.weekHint,
                isCurrentWeek && { color: "#22c55e" },
              ]}
            >
              {isCurrentWeek ? "Settimana corrente" : "Settimana passata"}
            </Text>
          </View>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
            >
              <Text style={styles.navTextSmall}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!canGoNextDay}
              onPress={() => {
                if (!canGoNextDay) return;
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
            >
              <Text
                style={[
                  styles.navTextSmall,
                  !canGoNextDay && styles.navTextSmallDisabled,
                ]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.summaryText}>
          Cibo: {Math.round(totalFoodKcal)} kcal / Obiettivo effettivo:{" "}
          {Math.round(effectiveGoal) || "—"} kcal
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  effectiveGoal > 0
                    ? `${Math.min(100, (totalFoodKcal / effectiveGoal) * 100)}%`
                    : "0%",
              },
            ]}
          />
        </View>
        <Text style={styles.summaryText}>
          Macro oggi: {Math.round(totalCarb)} g carb • {Math.round(totalFat)} g grassi •{" "}
          {Math.round(totalProtein)} g proteine
        </Text>
      </View>

      {/* Form alimento */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editingLibraryItem ? "Modifica alimento libreria / aggiungi porzione" : "Aggiungi cibo"}
        </Text>
        <Text style={styles.label}>Nome alimento</Text>
        <TextInput
          style={styles.input}
          value={foodName}
          onChangeText={setFoodName}
          placeholder="Es. Petto di pollo"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Marca (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={foodBrand}
          onChangeText={setFoodBrand}
          placeholder="Marca"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Codice QR / a barre (opzionale)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={foodCode}
            onChangeText={setFoodCode}
            placeholder="Codice"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={startScan}>
            <Text style={styles.secondaryButtonText}>Scannerizza</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Valori nutrizionali per 100 g</Text>
        <View style={styles.row}>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Kcal</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={kcalPer100}
              onChangeText={setKcalPer100}
            />
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Carb (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={carbPer100}
              onChangeText={setCarbPer100}
            />
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Grassi (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={fatPer100}
              onChangeText={setFatPer100}
            />
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel}>Prot (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={proteinPer100}
              onChangeText={setProteinPer100}
            />
          </View>
        </View>
        <Text style={styles.label}>Grammi consumati</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={gramsConsumed}
          onChangeText={setGramsConsumed}
          placeholder="Es. 150"
          placeholderTextColor="#94a3b8"
        />
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Salva/aggiorna nella libreria cibi</Text>
          <Switch value={saveToLibrary} onValueChange={setSaveToLibrary} />
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSaveFood}
          disabled={savingFood}
        >
          {savingFood ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Registra alimento</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Libreria rapida */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Libreria cibi (ultimi salvati)</Text>
        {foodLibrary.length === 0 && (
          <Text style={styles.hint}>Ancora nessun alimento salvato.</Text>
        )}
        {foodLibrary.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.libraryItem}
            onPress={() => {
              setEditingLibraryItem(f);
              setFoodName(f.name);
              setFoodBrand(f.brand ?? "");
              setFoodCode(f.code ?? "");
              setKcalPer100(String(f.kcal_per_base));
              setCarbPer100(String(f.carbs_g_per_base));
              setFatPer100(String(f.fat_g_per_base));
              setProteinPer100(String(f.protein_g_per_base));
              setSaveToLibrary(true);
            }}
          >
            <Text style={styles.libraryName}>{f.name}</Text>
            {f.brand && <Text style={styles.libraryBrand}>{f.brand}</Text>}
            {f.code && <Text style={styles.libraryCode}>Codice: {f.code}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista alimenti del giorno */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alimenti di oggi</Text>
        {foodLogs.length === 0 && (
          <Text style={styles.hint}>Nessun alimento registrato per questo giorno.</Text>
        )}
        {foodLogs.map((f) => (
          <View key={f.id} style={styles.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.logName}>{f.name}</Text>
              {f.brand && <Text style={styles.logBrand}>{f.brand}</Text>}
              <Text style={styles.logMeta}>
                {f.grams} g • {Math.round(f.kcal)} kcal •{" "}
                {`${Math.round(f.carbs_g)}C / ${Math.round(f.fat_g)}F / ${Math.round(
                  f.protein_g
                )}P`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    padding: 20,
  },
  centeredText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#e2e8f0",
    textAlign: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 22,
    color: "#f8fafc",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 15,
    color: "#f8fafc",
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#e2e8f0",
    marginBottom: 4,
  },
  input: {
    fontFamily: fonts.regular,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#f8fafc",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  macroCol: { flex: 1 },
  macroLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 2,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  summaryText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#e2e8f0",
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#334155",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
  },
  primaryButton: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 15,
    color: "#fff",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#64748b",
    marginLeft: 8,
  },
  secondaryButtonText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#e2e8f0",
  },
  libraryItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  libraryName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#f8fafc",
  },
  libraryBrand: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
  },
  libraryCode: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#64748b",
  },
  logItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  logName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#f8fafc",
  },
  logBrand: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
  },
  logMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#cbd5f5",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerCamera: {
    flex: 1,
  },
  scannerOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  scannerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 12,
  },
  navTextSmall: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#22c55e",
    marginHorizontal: 4,
  },
  navTextSmallDisabled: {
    color: "#475569",
  },
  weekHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,

    // Se corrente metti come colore #22c55e
    
  },
});
