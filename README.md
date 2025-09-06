# WhatsApp Reminder Bot MVP

Ein einfacher WhatsApp-Bot für Erinnerungen und Listen.

## Setup

### 1. Dependencies installieren
```bash
npm install
```

### 2. Environment Variables setzen
Kopiere `env.example` zu `.env` und fülle deine Twilio-Credentials ein:

```bash
cp env.example .env
```

### 3. Lokal testen
```bash
npm run dev
```

### 4. Auf Vercel deployen
```bash
npx vercel
```

## Twilio Webhook URL
Nach dem Deployment auf Vercel:
- Gehe zu deinem Twilio Dashboard
- WhatsApp Sandbox Settings
- Setze Webhook URL auf: `https://deine-app.vercel.app/api/webhook`

## Testen
Sende eine WhatsApp-Nachricht an deine Twilio Sandbox-Nummer. Du solltest eine Echo-Antwort erhalten.
