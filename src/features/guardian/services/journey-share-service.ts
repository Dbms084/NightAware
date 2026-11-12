import { Linking, Platform, Share } from 'react-native';
import type { WatchOverMeJourneyDetails } from '../types';
import { formatDuration } from '@/utils/format-time';

/**
 * Format a human-friendly arrival time (e.g. "11:42 PM").
 */
export function formatTimeAmPm(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Clean phone number for WhatsApp / SMS URL schemas.
 * Keeps leading '+' if present, strips whitespace, hyphens, and parenthesis.
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Generates the standardized "Watch Over Me" journey start message.
 */
export function createJourneyShareMessage(details: WatchOverMeJourneyDetails): string {
  const arrivalFormatted = formatTimeAmPm(details.estimatedArrivalTime);
  const distanceKm = (details.distanceMeters / 1000).toFixed(1);
  const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${details.originCoord.latitude.toFixed(
    5,
  )},${details.originCoord.longitude.toFixed(5)}&destination=${details.destinationCoord.latitude.toFixed(
    5,
  )},${details.destinationCoord.longitude.toFixed(5)}`;

  return (
    `🛡️ NightAware Live Trip: Watch Over Me\n` +
    `--------------------------------------\n` +
    `📍 Heading to: ${details.destinationName}\n` +
    `🛣️ Route chosen: ${details.routeLabel} (${distanceKm} km, ~${formatDuration(details.durationMinutes)})\n` +
    `⏰ Expected Arrival: ~${arrivalFormatted}\n` +
    `⭐ Night Activity Score: ${details.nightActivityScore}/100\n` +
    `🏪 Corridor Open Places: ${details.openPlacesCount} open POIs\n` +
    (details.longestQuietStretchMeters && details.longestQuietStretchMeters > 300
      ? `⚠️ Quiet Stretch: ${details.longestQuietStretchMeters}m corridor gap\n`
      : '') +
    `🗺️ View Route: ${mapsLink}\n\n` +
    `I have activated Watch Over Me on NightAware. I will notify you when I reach safely.`
  );
}

/**
 * Generates the safe arrival confirmation message.
 */
export function createSafeArrivalMessage(destinationName: string): string {
  const now = formatTimeAmPm(new Date());
  return (
    `🏡 Safe Arrival Update!\n` +
    `-----------------------\n` +
    `I have reached ${destinationName} safely at ${now}.\n` +
    `Thank you for watching over me! 💖\n` +
    `Sent via NightAware Companion`
  );
}

/**
 * Generates emergency SOS alert message with real-time location.
 */
export function createEmergencyAlertMessage(
  destinationName: string,
  currentCoord?: { latitude: number; longitude: number },
): string {
  const locLink = currentCoord
    ? `https://maps.google.com/?q=${currentCoord.latitude.toFixed(5)},${currentCoord.longitude.toFixed(5)}`
    : 'Location unavailable';

  return (
    `🚨 EMERGENCY SOS: I NEED HELP!\n` +
    `--------------------------------\n` +
    `I was traveling to ${destinationName}.\n` +
    `My live location: ${locLink}\n` +
    `Please call me or check on me immediately.\n` +
    `Sent via NightAware Emergency SOS`
  );
}

/**
 * Send pre-formatted text directly to WhatsApp contact.
 */
export async function shareViaWhatsApp(phone: string, message: string): Promise<boolean> {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  const deepLink = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const webLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  try {
    const supported = await Linking.canOpenURL(deepLink);
    if (supported) {
      await Linking.openURL(deepLink);
      return true;
    } else {
      await Linking.openURL(webLink);
      return true;
    }
  } catch (error) {
    console.warn('[JourneyShareService] WhatsApp share failed, trying web fallback:', error);
    try {
      await Linking.openURL(webLink);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Open native SMS composer pre-filled with recipient & text.
 */
export async function shareViaSms(phone: string, message: string): Promise<boolean> {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedBody = encodeURIComponent(message);
  // iOS uses &body= while Android uses ?body=
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const smsUrl = `sms:${cleanPhone}${separator}body=${encodedBody}`;

  try {
    await Linking.openURL(smsUrl);
    return true;
  } catch (error) {
    console.warn('[JourneyShareService] SMS link failed:', error);
    return false;
  }
}

/**
 * Open native OS share sheet (WhatsApp, Messages, Telegram, Signal, etc.)
 */
export async function shareViaSystem(message: string, title: string = 'NightAware Trip Update'): Promise<boolean> {
  try {
    const result = await Share.share({
      message,
      title,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.warn('[JourneyShareService] System share failed:', error);
    return false;
  }
}

/**
 * Quick dial emergency contact or emergency helpline.
 */
export async function callContact(phone: string): Promise<boolean> {
  const cleanPhone = sanitizePhoneNumber(phone);
  try {
    await Linking.openURL(`tel:${cleanPhone}`);
    return true;
  } catch (error) {
    console.warn('[JourneyShareService] Call failed:', error);
    return false;
  }
}
