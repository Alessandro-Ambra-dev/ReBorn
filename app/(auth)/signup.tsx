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
  Image,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, fontWeights } from "@/lib/theme";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Errore", "Inserisci email e password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Errore", "La password deve essere di almeno 6 caratteri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() || undefined } },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Errore registrazione", error.message);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoBox}>
        <Image
          source={require("@/assets/images/ReBorn_icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Crea account</Text>
      <Text style={styles.subtitle}>Inizia il tuo percorso con ReBorn</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome utente (opzionale)"
        placeholderTextColor="#94a3b8"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        editable={!loading}
      />
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
        placeholder="Password (min. 6 caratteri)"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Registrati</Text>
        )}
      </TouchableOpacity>
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.linkButton} disabled={loading}>
          <Text style={styles.linkText}>Hai già un account? Accedi</Text>
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
  logoBox: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    fontSize: 28,
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
