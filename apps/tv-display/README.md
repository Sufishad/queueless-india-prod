# QueueLess TV Display — Waiting Hall Kiosk 📺

Full-screen, Android TV / tablet friendly **"NOW SERVING"** board for public waiting halls.
Real-time synced with the FastAPI backend over WebSocket `/ws/queue/{businessId}`.

## Features
- **20-ft visibility**: Huge `#TOKEN` display with glowing cyan accent.
- **Upcoming ticker**: Next 4 tokens shown prominently (`#15 • #16 • #17 • #18`).
- **Audio Auto-play Guard**: Browser autoplay policies block sound until user gesture.
  Kiosk shows a prominent green **"Start Kiosk Audio"** button on boot.
- **Chime + TTS Announcements**: Web Audio API two-tone chime (C6→G6) followed by
  speechSynthesis voice call ("Token 14, please proceed to Counter 1").
- **Live stats footer**: Served / Waiting / Skipped today counters.
- **Trilingual**: English / हिंदी / Hinglish toggle for the announcement text.
- **Wake Lock**: Keeps screen awake on kiosk devices (requestWakeLock on mount).
- **Auto-reconnect**: WebSocket auto-reconnect; 30s HTTP polling fallback.

## Run

```bash
cd apps/tv-display
npm install
npm run dev
```

Then open:
- Launcher: `http://localhost:3000/`
- Kiosk for a business: `http://localhost:3000/display/<businessId>`

## Env Vars
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)

## Kiosk Hardening Tips
1. Run in Chrome/Edge kiosk mode: `chrome --kiosk http://localhost:3000/display/<id>`
2. For Android TV: install a "Kiosk Browser" app and lock to this URL.
3. Tap once on "Start Kiosk Audio" after every fresh boot (browser autoplay policy).
