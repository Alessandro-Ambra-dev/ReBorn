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
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, fontWeights } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Errore", "Inserisci la tua email");
      return;
    }

    setLoading(true);

    // Verifica che esista un account con questa email
    const { data: exists, error: rpcError } = await (supabase.rpc as Function)(
      "check_email_exists",
      { p_email: trimmed }
    );

    if (rpcError) {
      setLoading(false);
      Alert.alert("Errore", "Impossibile verificare l'email. Riprova più tardi.");
      return;
    }

    if (!exists) {
      setLoading(false);
      Alert.alert(
        "Account non trovato",
        "Non esiste nessun account registrato con questa email. Controlla l'indirizzo o crea un nuovo account."
      );
      return;
    }

    // Email trovata → invia il link di recupero
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: "reborn://reset-password",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Errore", error.message);
      return;
    }

    setSent(true);
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

      {sent ? (
        <View style={styles.successBox}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.title}>Email inviata!</Text>
          <Text style={styles.successText}>
            Controlla la tua casella di posta. Riceverai un link per reimpostare la password entro
            pochi minuti.{"\n\n"}Se non la trovi, controlla anche la cartella spam.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.buttonText}>Torna al login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Password dimenticata?</Text>
          <Text style={styles.subtitle}>
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            autoFocus
          />
          <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Invia link di recupero</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.linkText}>← Torna al login</Text>
          </TouchableOpacity>
        </>
      )}
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
    fontSize: 26,
    color: "#f8fafc",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#94a3b8",
    marginBottom: 28,
    lineHeight: 22,
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
  successBox: {
    alignItems: "center",
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  successText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    marginTop: 8,
  },
});
