## ReBorn

App Expo con **Expo Router** (tab) e TypeScript, basata su **Expo SDK 54** (React 19.1, React Native 0.81).

### Setup

```bash
npm install
npx expo install @react-native-async-storage/async-storage @supabase/supabase-js react-native-url-polyfill expo-font @expo-google-fonts/roboto
```

Opzionale: crea `.env` con `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (altrimenti usa i valori di default nel codice).

### Avvio

```bash
npm start
```

Poi: `a` per Android, `i` per iOS, `w` per web, oppure scansiona il QR con Expo Go.

### Aggiornare le dipendenze

Dopo l’upgrade a SDK 54, allinea le versioni con:

```bash
npx expo install --fix
```

---