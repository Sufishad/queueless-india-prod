import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useOwnerStore } from '../store/useOwnerStore';

/**
 * Web Audio Context singleton for synthesised chimes without bundling large MP3s
 */
let audioCtx: any = null;

function getAudioContext() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }
  }
  return null;
}

/**
 * Synthesize a musical frequency chime note
 */
function playTone(freq: number, durationSec: number = 0.2, delaySec: number = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const startTime = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationSec);
  } catch (err) {
    // Audio context may be restricted by autoplay policy until first touch
  }
}

/**
 * Play Dual Chime (D5 -> A5) + Double Vibration Pulse
 * Triggered when a new customer joins the queue
 */
export async function playNewCustomerAlert() {
  const isMuted = useOwnerStore.getState().isMuted;
  if (isMuted) return;

  // 1. Audio: Pleasant ascending dual bell (587Hz -> 880Hz)
  playTone(587.33, 0.25, 0);     // D5
  playTone(880.00, 0.35, 0.15);   // A5

  // 2. Haptics: Double Pulse
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }, 150);
  } catch (err) {
    // Graceful fallback if haptics unsupported
  }
}

/**
 * Play Single Chime (A5) + Medium Vibration Pulse
 * Triggered when next customer is called to counter
 */
export async function playCallNextAlert() {
  const isMuted = useOwnerStore.getState().isMuted;
  if (isMuted) return;

  // 1. Audio: Crisp single service bell (880Hz)
  playTone(880.00, 0.3, 0);

  // 2. Haptics: Medium impact pulse
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * Play Success Chime for completed service
 */
export async function playSuccessAlert() {
  const isMuted = useOwnerStore.getState().isMuted;
  if (isMuted) return;

  playTone(1046.50, 0.25, 0); // C6
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/**
 * Play Skip/Cancel Warning Pulse
 */
export async function playSkipWarningAlert() {
  const isMuted = useOwnerStore.getState().isMuted;
  if (isMuted) return;

  playTone(440.00, 0.2, 0);
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}
