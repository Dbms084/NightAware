/**
 * Formats a duration in minutes for human display:
 * - If less than 60 minutes: displays in minutes (e.g. "45 min")
 * - If 60 minutes or more: converts to hours and remaining minutes (e.g. "1 hr", "1 hr 15 min", "2 hr 30 min")
 */
export function formatDuration(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Formats estimated arrival time given journey duration in minutes and departure time.
 */
export function formatArrival(mins: number, departureTime?: Date): string {
  const base = departureTime ?? new Date();
  const d = new Date(base.getTime() + mins * 60 * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

