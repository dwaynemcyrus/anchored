/**
 * Format seconds into a human-readable duration string
 * @param seconds - Total seconds
 * @returns Formatted string like "1h 23m" or "45m" or "30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/**
 * Format seconds into HH:MM:SS format for timer display
 * @param seconds - Total seconds
 * @returns Formatted string like "01:23:45"
 */
export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
}
