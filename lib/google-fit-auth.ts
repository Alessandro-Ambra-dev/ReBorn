/**
 * OAuth Google per Fitness API: connetti account e salva access token.
 * Usa un client OAuth "Android" (senza client secret).
 * Il redirect URI è nel formato "reverse client ID" standard per Android:
 *   com.googleusercontent.apps.<CLIENT_ID_PREFIX>:/oauth2redirect/google
 * Non serve configurare redirect URI nella Google Cloud Console per i client Android.
 * Vedi docs/GOOGLE_FIT.md.
 */

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = "@reborn/google_fit_token";
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

const SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.body.read",
];

export type GoogleFitToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

function getGoogleClientId(): string {
  const id = process.env.EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID;
  if (!id) {
    throw new Error(
      "Imposta EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID in .env (Client ID OAuth Android). Vedi docs/GOOGLE_FIT.md."
    );
  }
  return id;
}

/**
 * Ricava lo scheme "reverse client ID" dal client ID completo.
 * Es: "12345-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.12345-abc"
 */
function getReverseScheme(clientId: string): string {
  return `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;
}

/** Restituisce il token salvato (se presente). */
export async function getStoredGoogleFitToken(): Promise<GoogleFitToken | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GoogleFitToken;
    if (!data.accessToken) return null;
    return data;
  } catch {
    return null;
  }
}

/** Salva il token in AsyncStorage. */
export async function setStoredGoogleFitToken(token: GoogleFitToken | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

/** Rimuovi il token (disconnetti Google Fit). */
export async function clearGoogleFitToken(): Promise<void> {
  await setStoredGoogleFitToken(null);
}

/**
 * Avvia il flusso OAuth: apre il browser, l'utente autorizza, si scambia il code con l'access token.
 * Richiede EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID (client Android consigliato per scambio senza secret).
 */
export async function promptGoogleFitAuth(): Promise<GoogleFitToken | null> {
  const clientId = getGoogleClientId();
  // Redirect URI standard per client Android Google OAuth (nessuna configurazione manuale richiesta).
  // Google accetta automaticamente questo formato per i client di tipo Android.
  const reverseScheme = getReverseScheme(clientId);
  const redirectUri = AuthSession.makeRedirectUri({
    native: `${reverseScheme}:/oauth2redirect/google`,
  });

  const discovery = {
    authorizationEndpoint: GOOGLE_DISCOVERY.authorizationEndpoint,
    tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint,
  };

  const request = await AuthSession.loadAsync(
    {
      clientId,
      scopes: SCOPES,
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  const result = await request.promptAsync(discovery);
  if (result.type !== "success" || !result.params.code) {
    return null;
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? "",
      },
    },
    { tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint }
  );

  const token: GoogleFitToken = {
    accessToken: tokenResult.accessToken ?? "",
    refreshToken: tokenResult.refreshToken ?? undefined,
    expiresAt:
      tokenResult.expiresIn != null
        ? Date.now() + tokenResult.expiresIn * 1000
        : undefined,
  };

  await setStoredGoogleFitToken(token);
  return token;
}
