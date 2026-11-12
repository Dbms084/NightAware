import type { AudioPlayer, AudioSource } from 'expo-audio';
import { Image, Platform, Vibration } from 'react-native';

let webAudioCtx: AudioContext | null = null;
let webInterval: ReturnType<typeof setInterval> | null = null;
let isAlarmRunning = false;
let alarmSessionId = 0;
let nativeAudioPlayer: AudioPlayer | null = null;
let nativeStatusSub: { remove?: () => void } | null = null;
let cachedAlarmFileUri: string | null = null;
let lastAudioStatus = '';

type StatusListener = (status: string) => void;
const statusListeners = new Set<StatusListener>();

function updateAlarmStatus(status: string) {
  lastAudioStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {}
  });
}

export function subscribeAlarmStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  if (lastAudioStatus) {
    listener(lastAudioStatus);
  }
  return () => {
    statusListeners.delete(listener);
  };
}

// Dynamically and safely resolve expo-audio and expo-file-system without crashing if absent
let ExpoAudio: typeof import('expo-audio') | null = null;
let expoAudioLoadError: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoAudio = require('expo-audio');
} catch (err) {
  expoAudioLoadError = err instanceof Error ? err.message : String(err);
  console.warn('[AlarmSound] expo-audio native module unavailable in this client:', err);
}

let ExpoFS: typeof import('expo-file-system') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoFS = require('expo-file-system');
} catch (err) {
  console.warn('[AlarmSound] expo-file-system unavailable:', err);
}

/**
 * Generates a loud 1.6-second 880Hz/660Hz dual-tone emergency siren WAV in memory.
 * Used so native playback works locally with zero AssetRegistry or network dependency.
 */
function buildSirenWavBytes(): Uint8Array {
  const sampleRate = 22050;
  const durationSec = 1.6;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const burstSamples = Math.floor(sampleRate * 0.4);
  for (let i = 0; i < numSamples; i++) {
    const burstIndex = Math.floor(i / burstSamples);
    const posInBurst = (i % burstSamples) / sampleRate;
    const freq = burstIndex % 2 === 0 ? 880 : 660;
    // Slight envelope at burst edges to prevent speaker clicks
    let amp = 26000;
    if (posInBurst < 0.01) amp *= posInBurst / 0.01;
    else if (posInBurst > 0.36) amp *= Math.max(0, (0.4 - posInBurst) / 0.04);

    // Rich harmonic mix (fundamental + slight 2nd harmonic) for clear phone speaker audibility
    const t = i / sampleRate;
    const wave =
      0.8 * Math.sin(2 * Math.PI * freq * t) +
      0.2 * Math.sin(2 * Math.PI * freq * 2 * t);
    const sample = Math.max(-32767, Math.min(32767, Math.round(amp * wave)));
    view.setInt16(44 + i * 2, sample, true);
  }

  return new Uint8Array(buffer);
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
    if (!AudioContextClass) {
      updateAlarmStatus('Web Audio API unsupported in this browser');
      return;
    }

    if (!webAudioCtx || webAudioCtx.state === 'closed') {
      webAudioCtx = new AudioContextClass() as AudioContext;
    }
    const ctx = webAudioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
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
    updateAlarmStatus('🔊 Alarm siren active (Web Audio)');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateAlarmStatus(`🔇 Web audio error: ${msg}`);
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
 * Resolves a local file:// URI for the alarm audio without touching expo-asset's AssetRegistry
 * (which can be undefined in some RN/Expo Go builds).
 */
async function resolveAlarmSources(): Promise<{
  primary: AudioSource;
  fallback?: AudioSource;
}> {
  if (cachedAlarmFileUri) {
    return { primary: { uri: cachedAlarmFileUri } };
  }

  // 1. Try writing/reading local WAV in cache via expo-file-system (guaranteed local, no AssetRegistry)
  if (ExpoFS?.File && ExpoFS?.Paths) {
    try {
      const sirenFile = new ExpoFS.File(ExpoFS.Paths.cache, 'nightaware_siren_v1.wav');
      if (!sirenFile.exists) {
        await sirenFile.write(buildSirenWavBytes());
      }
      if (sirenFile.uri) {
        cachedAlarmFileUri = sirenFile.uri;
        return { primary: { uri: sirenFile.uri } };
      }
    } catch (fsErr) {
      console.warn('[AlarmSound] Local siren file write failed:', fsErr);
    }
  }

  // 2. Fallback: Image.resolveAssetSource reads internal AssetRegistry directly
  try {
    const alarmAsset = require('../../../../assets/alarm.wav');
    const resolved = Image.resolveAssetSource(alarmAsset);
    if (resolved?.uri) {
      return { primary: { uri: resolved.uri } };
    }
  } catch (imgErr) {
    console.warn('[AlarmSound] Image.resolveAssetSource failed:', imgErr);
  }

  throw new Error('Could not resolve or synthesize a local alarm audio file');
}

function playWithSource(
  source: AudioSource,
  sessionId: number,
  fallbackSource?: AudioSource,
) {
  if (!ExpoAudio || !isAlarmRunning || sessionId !== alarmSessionId) return;

  stopNativeAlarm();

  const player = ExpoAudio.createAudioPlayer(source);
  nativeAudioPlayer = player;
  player.loop = true;
  player.muted = false;
  player.volume = 1.0;

  let triedFallback = false;

  if (typeof player.addListener === 'function') {
    nativeStatusSub = player.addListener('playbackStatusUpdate', (status) => {
      if (sessionId !== alarmSessionId || !isAlarmRunning) return;
      if (status?.error) {
        console.warn('[AlarmSound] Native playback error:', status.error);
        if (!triedFallback && fallbackSource && fallbackSource !== source) {
          triedFallback = true;
          playWithSource(fallbackSource, sessionId);
        } else {
          updateAlarmStatus(`🔇 Playback error: ${status.error}`);
        }
      } else if (status?.playing) {
        updateAlarmStatus('🔊 Alarm siren active (check Media volume)');
      }
    });
  }

  player.play();
  updateAlarmStatus('🔊 Alarm siren playing (turn up Media volume)');
}

/**
 * Starts the alarm on Mobile (Android / iOS) using expo-audio.
 * Fallback-safe: if native audio fails or is denied, vibration still triggers.
 */
async function startNativeAlarm(sessionId: number) {
  if (!ExpoAudio) {
    const detail = expoAudioLoadError ? `: ${expoAudioLoadError}` : '';
    updateAlarmStatus(`🔇 expo-audio unavailable in this app client${detail}`);
    return;
  }
  try {
    try {
      if (typeof ExpoAudio.setIsAudioActiveAsync === 'function') {
        await ExpoAudio.setIsAudioActiveAsync(true);
      }
      if (typeof ExpoAudio.setAudioModeAsync === 'function') {
        await ExpoAudio.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'mixWithOthers',
          shouldRouteThroughEarpiece: false,
        });
      }
    } catch (modeErr) {
      console.warn('[AlarmSound] Failed to set audio mode:', modeErr);
    }

    if (!isAlarmRunning || sessionId !== alarmSessionId) return;

    const { primary, fallback } = await resolveAlarmSources();
    if (!isAlarmRunning || sessionId !== alarmSessionId) return;

    playWithSource(primary, sessionId, fallback);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateAlarmStatus(`🔇 Native audio error: ${msg}`);
    console.warn('[AlarmSound] Could not start native speaker audio:', err);
  }
}

/**
 * Stops native mobile audio playback and releases the player.
 */
function stopNativeAlarm() {
  if (nativeStatusSub) {
    try {
      nativeStatusSub.remove?.();
    } catch {}
    nativeStatusSub = null;
  }
  if (nativeAudioPlayer) {
    try {
      nativeAudioPlayer.pause();
      if (typeof nativeAudioPlayer.remove === 'function') {
        nativeAudioPlayer.remove();
      }
    } catch {}
    nativeAudioPlayer = null;
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
  const sessionId = ++alarmSessionId;
  updateAlarmStatus('Starting alarm audio...');

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
    await startNativeAlarm(sessionId);
  }
}

/**
 * Immediately cancels vibration and stops the audible alarm.
 */
export async function stopAlarmSound(): Promise<void> {
  isAlarmRunning = false;
  alarmSessionId++;
  updateAlarmStatus('');

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
