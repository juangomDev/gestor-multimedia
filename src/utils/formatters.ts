export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return '0 B';
  const sizeIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm))} ${sizes[sizeIndex]}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Fecha desconocida';
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Fecha desconocida';
  }
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function cleanBaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

export function buildPublicAssetUrl(baseUrl: string, type: 'i' | 't', shortCode: string): string {
  const clean = cleanBaseUrl(baseUrl);
  return `${clean}/${type}/${shortCode}`;
}

/**
 * Convierte segundos de actividad en un texto compacto (`2d 3h`, `4h 12m`, `2m 5s`, `35s`).
 * @param seconds Segundos de uptime del backend.
 * @returns Texto legible.
 */
export function formatUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
