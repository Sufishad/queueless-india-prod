// Kiosk Audio Engine: Browser Web AudioContext chime + speechSynthesis TTS
// Guarded by explicit user gesture ("Start Kiosk Audio") to unlock autoplay policy.

let audioCtx: AudioContext | null = null;

export function unlockAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext || W.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, startAt: number, dur: number, gainVal: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainVal, startAt + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.05);
}

/** Two-tone pleasant ding-dong chime (C6 -> G6) */
export async function playCallChime(): Promise<void> {
  const ctx = unlockAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + 0.02;
    playTone(ctx, 1046.5, now, 0.35, 0.28);        // C6
    playTone(ctx, 1568.0, now + 0.22, 0.55, 0.32); // G6 (slightly longer)
  } catch {
    // silently ignore
  }
}

/** Lower single "attention" tone for skipped/reset events */
export async function playNoticeTone(): Promise<void> {
  const ctx = unlockAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + 0.02;
    playTone(ctx, 493.88, now, 0.4, 0.2); // B4
  } catch {
    // ignore
  }
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function pickVoice(lang: 'en-IN' | 'hi-IN'): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0 && typeof speechSynthesis !== 'undefined') {
    cachedVoices = speechSynthesis.getVoices();
  }
  const exact = cachedVoices.find(v => v.lang === lang);
  if (exact) return exact;
  const partial = cachedVoices.find(v => v.lang?.startsWith(lang.split('-')[0]));
  return partial || null;
}

/** Text-to-speech announcement with Indian-English / Hindi voice preference. */
export async function speakAnnouncement(text: string, lang: 'en-IN' | 'hi-IN' = 'en-IN'): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Fire-and-forget; resolves immediately so the chime doesn't overlap.
    speechSynthesis.speak(utter);
    await new Promise((resolve) => setTimeout(resolve, 250));
  } catch {
    // ignore TTS failures
  }
}
