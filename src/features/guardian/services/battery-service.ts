import { Platform } from 'react-native';

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  }>;
}

/**
 * Reads battery level as a percentage decimal (0.0 to 1.0).
 * Returns null if the platform or hardware does not expose battery status.
 */
export async function getDeviceBatteryLevel(): Promise<number | null> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const nav = navigator as NavigatorWithBattery;
      if (typeof nav.getBattery === 'function') {
        const battery = await nav.getBattery();
        return battery.level;
      }
    }
    // For environments without native battery hooks, return null (unsupported)
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if battery is below critical threshold (default 15%).
 */
export async function isBatteryCritical(threshold: number = 0.15): Promise<boolean> {
  const level = await getDeviceBatteryLevel();
  if (level === null) return false;
  return level <= threshold;
}
