/**
 * Call recording URLs from the backend are sometimes sent already
 * percent-encoded. Using that string in query params or navigation breaks
 * playback (browser treats `https%3A...` as a relative path, not https://).
 */
export function normalizeRecordingPlaybackUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  let out = trimmed;
  for (let i = 0; i < 5; i++) {
    if (!/%[0-9A-Fa-f]{2}/i.test(out)) break;
    try {
      const decoded = decodeURIComponent(out);
      if (decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}
