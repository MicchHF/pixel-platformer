/**
 * Time formatting utilities with hundredths of a second precision (00:00.00).
 */

export function formatHundredths(sec?: number | null): string {
  if (sec === undefined || sec === null || isNaN(sec) || sec < 0) {
    return '--:--.--';
  }
  const mins = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const hundredths = Math.floor(Math.round((sec % 1) * 100)) % 100;
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

export function formatSecondsOnly(sec?: number | null): string {
  if (sec === undefined || sec === null || isNaN(sec)) return '--.--с';
  return `${sec.toFixed(2)}с`;
}

export function roundToHundredths(sec: number): number {
  return Math.round(sec * 100) / 100;
}
