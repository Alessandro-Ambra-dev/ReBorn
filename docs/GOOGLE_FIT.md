# Integrazione Google Fit con ReBorn

ReBorn può importare gli allenamenti da **Google Fit** (ultimi 7 giorni): tipo attività, durata, kcal bruciate. Le zone di frequenza cardiaca non sono disponibili per sessione dall’API (solo medie/min/max), quindi in import restano a 0.

## Nota importante

L’**API REST di Google Fit è in deprecation** (prevista dismissione nel 2026). Dal 1º maggio 2024 non è più possibile iscriversi per usarla. Per nuovi progetti Google consiglia **Health Connect** su Android. Questa integrazione resta utile se hai già accesso alle Fitness API.

---

## 1. Progetto Google Cloud e Fitness API

1. Vai su [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un progetto (o selezionane uno esistente).
3. Abilita le **Fitness API**:
   - Menu **API e servizi** → **Libreria** → cerca “Fitness API” → **Abilita**.

---

## 2. Credenziali OAuth 2.0

Per l’app Expo/React Native serve un client OAuth che consenta l’accesso alle Fitness API **senza** inserire un client secret nell’app (scambio code con PKCE).

### Opzione A – Client Android (consigliato per app native / development build)

1. **API e servizi** → **Credenziali** → **Crea credenziali** → **ID client OAuth**.
2. Tipo applicazione: **Android**.
3. Nome: es. `ReBorn Android`.
4. **Nome pacchetto**:
   - Con **Expo Go**: `host.exp.Exponent`
   - Con **development build / standalone**: il pacchetto del tuo app (es. `com.tuaazienda.reborn`).
5. **Impronta SHA-1**:  
   Per debug:  
   - **Windows PowerShell:**  
     `keytool -keystore $env:USERPROFILE\.android\debug.keystore -list -v -storepass android -alias androiddebugkey`  
   - **macOS/Linux:**  
     `keytool -keystore ~/.android/debug.keystore -list -v` (password: `android`).  
   La debug keystore si crea al primo build Android (es. `npx expo run:android`).  
   In produzione usa la keystore con cui firmi l’app.
6. Crea. Copia il **Client ID** (es. `xxxxx.apps.googleusercontent.com`).

Con un client **Android**, Google permette lo scambio **authorization code → token** senza client secret, quindi l’app può completare il flusso OAuth da sola.

### Opzione B – Client Web (per test in browser / redirect custom)

1. Crea un **ID client OAuth** tipo **Applicazione Web**.
2. Aggiungi alle **URI di reindirizzamento autorizzati** l’URL di redirect che usa Expo (es. `https://auth.expo.io/@tuo-username/reborn`, o l’URL che ottieni da `AuthSession.makeRedirectUri()` in fase di sviluppo).
3. Con un client Web lo scambio del code richiede il **client secret**. Non mettere il secret nell’app. In quel caso serve un backend che:
   - riceve il `code` dall’app,
   - scambia `code` + `client_secret` con Google e restituisce all’app `access_token` (e opzionalmente `refresh_token`).

Per ReBorn, senza backend, è più semplice usare un **client Android** come sopra.

---

## 3. Configurazione nell’app ReBorn

1. Crea o modifica il file **`.env`** nella root del progetto:

```env
EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID=IL_TUO_CLIENT_ID.apps.googleusercontent.com
```

2. Sostituisci `IL_TUO_CLIENT_ID` con il Client ID ottenuto al passo 2 (opzione A o B).

3. Riavvia il bundler (es. `npx expo start`) dopo aver cambiato `.env`.

---

## 4. Redirect e deep link (Development Build / standalone)

- **Expo Go**: il redirect può usare lo schema Expo; per OAuth alcuni provider richiedono uno **scheme** personalizzato, quindi spesso serve un **development build**.
- **Development build / app standalone**: in **app.json** imposta uno **scheme** (es. `reborn`) e, in Google Cloud, aggiungi alle URI di reindirizzamento l’URL che ottieni da `AuthSession.makeRedirectUri()` (es. `reborn://redirect` se usi scheme `reborn`).  
  Poi ricostruisci l’app.

---

## 5. Utilizzo in app

1. **Connetti Google Fit**  
   Nella Home, sezione **Google Fit**, premi **Connetti Google Fit**. Si apre il browser per accedere con il tuo account Google e autorizzare l’accesso alle attività e ai dati corpo (scope Fitness API). Al termine il token viene salvato in locale.

2. **Sincronizza**  
   Premi **Sincronizza da Google Fit**. L’app:
   - legge le sessioni degli ultimi 7 giorni da Google Fit;
   - per ogni sessione ricava tipo, durata e kcal (e le mappa in aerobic/anaerobic e nome esercizio);
   - inserisce in ReBorn solo gli allenamenti non già presenti (stesso utente e stesso minuto di `workout_at`), così da evitare duplicati.

3. **Disconnetti**  
   **Disconnetti Google Fit** rimuove il token salvato; potrai riconnetterti in seguito.

---

## 6. Dati importati

- **Tipo**: aerobic / anaerobic (in base al tipo attività Google, es. corsa → aerobic, pesi → anaerobic).
- **Nome esercizio**: mappato dai tipi attività Google (es. Corsa, Nuoto, Pesi).
- **Durata**: da tempo attivo o da inizio/fine sessione.
- **Kcal**: da aggregato calorie per sessione.
- **Zone HR**: non esposte per sessione dall’API (solo summary), quindi restano a 0 in import.

---

## 7. Riferimenti

- [Fitness API – Sessioni](https://developers.google.com/fit/datasets/sessions)
- [Fitness API – Dataset aggregate](https://developers.google.com/fit/datasets/aggregate)
- [Expo – Authentication](https://docs.expo.dev/guides/authentication/)
- [Health Connect (alternativa consigliata da Google)](https://developer.android.com/health-and-fitness/guides/health-connect)
