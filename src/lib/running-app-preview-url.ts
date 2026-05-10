/**
 * Canonical URL for "running app" preview / browser open (matches typical dev bind address).
 */
export function buildRunningAppPreviewUrl(port: number): string {
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new RangeError("port must be between 1 and 65535");
  }
  return `http://127.0.0.1:${port}/`;
}
