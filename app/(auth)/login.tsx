import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, fontWeights } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Errore", "Inserisci email e password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert("Errore login", error.message);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>ReBorn</Text>
      <Text style={styles.subtitle}>Accedi al tuo account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Accedi</Text>
        )}
      </TouchableOpacity>
      <Link href="/(auth)/signup" asChild>
        <TouchableOpacity style={styles.linkButton} disabled={loading}>
          <Text style={styles.linkText}>Non hai un account? Registrati</Text>
        </TouchableOpacity>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0f172a",
  },
  title: {
    fontFamily: fonts.regular,
    fontSize: 32,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 24,
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
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 18,
    color: "#fff",
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#22c55e",
  },
});
