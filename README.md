# Mira — Private Cycle Companion 🌙

A privacy-first period tracker that requires **no account, no login, and no backend**.
All data stays on the user's device in `localStorage`. Open it and start tracking.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Features

- **Dashboard** — cycle day ring, phase, estimated next period & fertile window (labelled estimates with honest confidence)
- **Body Weather** — energy, mood, pain, sleep, hydration & stress translated from real logs
- **Smart Check-in** — a full daily log in ~15 seconds
- **Calendar** — periods, predicted windows, fertile estimates, symptoms & notes; tap any day to edit
- **Cycle Timeline** — Period → Recovery → Mid-cycle → Ovulation → Late → Next, with logs along the way
- **Pattern Lab** — local-only pattern detection in careful, non-diagnostic language
- **What changed?** — current cycle vs previous vs average, with charts
- **Trends** — cycle length, period duration, symptom frequency, sleep
- **Cycle Passport** — one-tap doctor-visit summary (copy / save / print)
- **Gentle forecast** — 14-day outlook with confidence levels, never false certainty
- **Journal** — private notes on any day
- **Settings** — assumptions, tracking categories, theme, accent color, week start, reminders
- **Privacy** — export/import JSON backups, delete everything, on-device badge, corruption recovery

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · Lucide icons. No backend, no analytics, no network calls for data.

## Medical safety

Mira is a wellness journal, not a medical device. Predictions are estimates; cycles vary naturally.
Never use it for contraception or diagnosis — talk to a qualified clinician about anything concerning.
