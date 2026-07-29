export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `${Math.max(1, diffSec)} sec ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hr ago`;
  }
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || isNaN(seconds)) return '0s';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function getDurationSeconds(startStr: string | undefined, endStr: string | undefined): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(diff / 1000);
}
