import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { fonts, fontWeights } from "@/lib/theme";

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

export default function FoodsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FoodLibraryItem[]>([]);
  const [editing, setEditing] = useState<FoodLibraryItem | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [code, setCode] = useState("");
  const [kcal, setKcal] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [protein, setProtein] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("food_library")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      Alert.alert("Errore", error.message);
      return;
    }
    setItems((data as FoodLibraryItem[]) ?? []);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      await loadItems();
      setLoading(false);
    })();
  }, [userId, loadItems]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setBrand("");
    setCode("");
    setKcal("");
    setCarb("");
    setFat("");
    setProtein("");
  };

  const startEdit = (item: FoodLibraryItem) => {
    setEditing(item);
    setName(item.name);
    setBrand(item.brand ?? "");
    setCode(item.code ?? "");
    setKcal(String(item.kcal_per_base));
    setCarb(String(item.carbs_g_per_base));
    setFat(String(item.fat_g_per_base));
    setProtein(String(item.protein_g_per_base));
  };

  const handleSave = async () => {
    if (!userId) return;
    const k = parseFloat(kcal.replace(",", "."));
    const c = parseFloat(carb.replace(",", "."));
    const f = parseFloat(fat.replace(",", "."));
    const p = parseFloat(protein.replace(",", "."));
    if (!name.trim() || !k) {
      Alert.alert("Attenzione", "Inserisci almeno nome e kcal per 100 g.");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("food_library")
        .update({
          name: name.trim(),
          brand: brand.trim() || null,
          code: code.trim() || null,
          base_amount_grams: 100,
          kcal_per_base: k,
          carbs_g_per_base: isNaN(c) ? 0 : c,
          fat_g_per_base: isNaN(f) ? 0 : f,
          protein_g_per_base: isNaN(p) ? 0 : p,
        })
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        Alert.alert("Errore", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("food_library").insert({
        user_id: userId,
        name: name.trim(),
        brand: brand.trim() || null,
        code: code.trim() || null,
        base_amount_grams: 100,
        kcal_per_base: k,
        carbs_g_per_base: isNaN(c) ? 0 : c,
        fat_g_per_base: isNaN(f) ? 0 : f,
        protein_g_per_base: isNaN(p) ? 0 : p,
      });
      setSaving(false);
      if (error) {
        Alert.alert("Errore", error.message);
        return;
      }
    }
    await loadItems();
    resetForm();
    Alert.alert("Ok", "Alimento salvato.");
  };

  const handleDelete = async (item: FoodLibraryItem) => {
    Alert.alert(
      "Conferma",
      `Vuoi eliminare "${item.name}" dalla libreria?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("food_library").delete().eq("id", item.id);
            if (error) {
              Alert.alert("Errore", error.message);
              return;
            }
            await loadItems();
            if (editing?.id === item.id) resetForm();
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Accedi per gestire la libreria dei tuoi cibi.</Text>
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
    <View style={styles.container}>
      <Text style={styles.title}>Libreria cibi</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editing ? "Modifica alimento" : "Nuovo alimento in libreria"}
        </Text>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Es. Riso basmati"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Marca (opzionale)</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="Marca"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Codice (QR / barcode, opzionale)</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Codice"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Valori per 100 g</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Kcal</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={kcal}
              onChangeText={setKcal}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Carb (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={carb}
              onChangeText={setCarb}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Grassi (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={fat}
              onChangeText={setFat}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Prot (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
        </View>
        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Salva</Text>
            )}
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Annulla</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => startEdit(item)}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
              {item.code && <Text style={styles.itemCode}>Codice: {item.code}</Text>}
              <Text style={styles.itemMeta}>
                {Math.round(item.kcal_per_base)} kcal •{" "}
                {`${Math.round(item.carbs_g_per_base)}C / ${Math.round(
                  item.fat_g_per_base
                )}F / ${Math.round(item.protein_g_per_base)}P`} per 100 g
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.deleteText}>Elimina</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
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
    marginBottom: 12,
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
  smallLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 2,
  },
  input: {
    fontFamily: fonts.regular,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#f8fafc",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  rowButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  col: { flex: 1 },
  primaryButton: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
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
  },
  secondaryButtonText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#e2e8f0",
  },
  listContent: {
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  itemName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#f8fafc",
  },
  itemBrand: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
  },
  itemCode: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#64748b",
  },
  itemMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#cbd5f5",
  },
  deleteText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#f97316",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

