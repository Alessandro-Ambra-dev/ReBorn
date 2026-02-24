# Conferma email per nuovi utenti (Supabase)

## Cosa è stato fatto

- **Utente attuale** (alessandro1998.aa@gmail.com): email già confermata tramite database (`email_confirmed_at` impostato).

## Per i prossimi utenti: invio email di conferma

Per far sì che ogni nuovo iscritto riceva un'email per confermare indirizzo e profilo:

### 1. Abilita la conferma email

1. Vai alla [Dashboard Supabase](https://supabase.com/dashboard) e apri il progetto **ReBorn**.
2. Menu **Authentication** → **Providers** → **Email**.
3. Attiva **"Confirm email"** (o "Enable email confirmations").
4. Salva.

Da quel momento, a ogni registrazione Supabase invierà automaticamente l'email di conferma (template "Confirm sign up").

### 2. (Opzionale) Personalizza il template email

1. **Authentication** → **Email Templates**.
2. Seleziona **"Confirm signup"**.
3. Puoi modificare:
   - **Subject** (es. `Conferma il tuo account ReBorn`)
   - **Body** HTML: usa il template in **`docs/email-templates/confirm-signup.html`** (messaggio personalizzato, username, logo, pulsante). **Variabili:** `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ index .Data "username" }}`. **Logo:** URL pubblico (es. Storage o `{{ .SiteURL }}/logo.png`).

### 3. Redirect dopo il click sul link

L'utente clicca sul link nell'email e Supabase verifica il token. Per reindirizzarlo alla tua app (es. Expo / deep link):

- In **Authentication** → **URL Configuration** imposta **Site URL** (es. `https://tuodominio.com` o lo schema dell'app).
- Aggiungi in **Redirect URLs** gli URL (o gli scheme) dove vuoi che l'utente venga portato dopo la conferma.

Dopo aver abilitato "Confirm email", i nuovi utenti riceveranno l'email e il profilo risulterà confermato solo dopo il click sul link (oltre alla creazione del profilo in `public.profiles` con il trigger già configurato).
