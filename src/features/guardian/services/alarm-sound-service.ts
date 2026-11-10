import { Platform, Vibration } from 'react-native';

let webAudioCtx: any = null;
let webInterval: any = null;
let isAlarmRunning = false;
let nativeAudioPlayer: any = null;

// Dynamically and safely resolve expo-audio without crashing if native module is absent
let ExpoAudio: typeof import('expo-audio') | null = null;
try {
  // Using CommonJS require so missing native module never crashes bundle evaluation
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoAudio = require('expo-audio');
} catch (err) {
  console.warn('[AlarmSound] expo-audio native module unavailable in this client:', err);
}

/**
 * Starts synthesizing alarm on Web Audio API (Desktop / Browser).
 * Plays an alternating 880Hz & 660Hz emergency siren.
 */
function startWebAlarm() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!webAudioCtx || webAudioCtx.state === 'closed') {
      webAudioCtx = new AudioContextClass();
    }
    if (webAudioCtx.state === 'suspended') {
      void webAudioCtx.resume();
    }

    const playToneBurst = () => {
      if (!isAlarmRunning || !webAudioCtx) return;
      try {
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, webAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, webAudioCtx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.35, webAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, webAudioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(webAudioCtx.destination);

        osc.start();
        osc.stop(webAudioCtx.currentTime + 0.36);
      } catch {}
    };

    playToneBurst();
    webInterval = setInterval(playToneBurst, 450);
  } catch (err) {
    console.warn('[AlarmSound] Web Audio error:', err);
  }
}

/**
 * Stops Web Audio synthesis.
 */
function stopWebAlarm() {
  if (webInterval) {
    clearInterval(webInterval);
    webInterval = null;
  }
  if (webAudioCtx) {
    try {
      webAudioCtx.close();
    } catch {}
    webAudioCtx = null;
  }
}

/**
 * Starts the alarm on Mobile (Android / iOS) using expo-audio.
 * Fallback-safe: if native audio fails or is denied, vibration still triggers.
 */
async function startNativeAlarm() {
  if (!ExpoAudio) return;
  try {
    if (!nativeAudioPlayer) {
      const alarmAsset = require('../../../../assets/alarm.wav');
      nativeAudioPlayer = ExpoAudio.createAudioPlayer(alarmAsset);
      if (nativeAudioPlayer) {
        nativeAudioPlayer.loop = true;
        nativeAudioPlayer.volume = 1.0;
      }
    }
    if (nativeAudioPlayer) {
      nativeAudioPlayer.play();
    }
  } catch (err) {
    console.warn('[AlarmSound] Could not start native speaker audio:', err);
  }
}

/**
 * Stops native mobile audio playback.
 */
function stopNativeAlarm() {
  if (nativeAudioPlayer) {
    try {
      nativeAudioPlayer.pause();
      if (typeof nativeAudioPlayer.seekTo === 'function') {
        nativeAudioPlayer.seekTo(0);
      }
    } catch {}
  }
}

/**
 * Starts the prominent alarm effect:
 * - Mobile (Android/iOS): Plays loud speaker alarm audio via expo-audio + urgent tactile vibration.
 * - Desktop/Browser: Plays dual-tone 880Hz/660Hz emergency siren via Web Audio API.
 * - Completely fail-safe: will NEVER crash the screen or navigation if audio is blocked or unsupported.
 */
export async function startAlarmSound(): Promise<void> {
  if (isAlarmRunning) return;
  isAlarmRunning = true;

  // 1. High-urgency device vibration pattern
  try {
    Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
  } catch (err) {
    console.warn('[AlarmSound] Vibration warning:', err);
  }

  // 2. Audible speaker playback
  if (Platform.OS === 'web') {
    startWebAlarm();
  } else {
    await startNativeAlarm();
  }
}

/**
 * Immediately cancels vibration and stops the audible alarm.
 */
export async function stopAlarmSound(): Promise<void> {
  isAlarmRunning = false;

  // Stop vibration immediately
  try {
    Vibration.cancel();
  } catch {}

  // Stop web audio
  if (Platform.OS === 'web') {
    stopWebAlarm();
  } else {
    stopNativeAlarm();
  }
}
