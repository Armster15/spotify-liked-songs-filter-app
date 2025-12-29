import { cache } from "./cache";

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY as
  | string
  | undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cachedJsonFetch(url: string): Promise<any> {
  // Keep cache key stable and scoped to the full URL (includes query params).
  const cacheKey = `lastfm:${url}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Last.fm cache hit for: ${url}`);
      return cached.response;
    }
  } catch (e) {
    console.warn("Last.fm cache read error:", e);
  }

  console.log(`Last.fm cache miss, fetching: ${url}`);
  const res = await fetch(url);

  // Last.fm may 429; retry after a short delay (Retry-After is not always present).
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "1");
    await sleep(Math.min(10, Math.max(1, retryAfter)) * 1000);
    return cachedJsonFetch(url);
  }

  const data = await res.json().catch(() => null);

  if (res.ok) {
    try {
      const headersObj: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      await cache.set(cacheKey, data, headersObj);
    } catch (e) {
      console.warn("Last.fm cache write error:", e);
    }
  }

  return data;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function isJunkTag(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  if (!t) return true;
  // Very common non-genre tags that add noise.
  if (
    t === "seen live" ||
    t === "favorites" ||
    t === "favourites" ||
    t === "favorite" ||
    t === "favourite"
  )
    return true;
  if (t === "spotify") return true;
  // Years/decades often appear as tags (e.g. "2010s", "1998"); not useful as genres.
  if (/^\d{4}$/.test(t)) return true;
  if (/^\d{2,4}s$/.test(t)) return true;
  // Discard number-ish spam tags like: "100", "-100", "3s", "3-5"
  if (/^-?\d+$/.test(t)) return true;
  if (/^-?\d+s$/.test(t)) return true;
  if (/^\d+\s*-\s*\d+$/.test(t)) return true;
  if (/^-?\d+(?:-\d+)+$/.test(t)) return true;
  return false;
}

function cleanTrackTitle(trackName: string): string {
  let t = trackName.trim();
  if (!t) return t;

  // Remove trailing " - Something" if it looks like a version marker.
  // e.g. "Song - Remastered 2011", "Song - Live", "Song - Radio Edit"
  const dashParts = t.split(" - ");
  if (dashParts.length > 1) {
    const head = dashParts[0].trim();
    const tail = dashParts.slice(1).join(" - ").toLowerCase();
    if (
      /(remaster|live|radio edit|edit|version|mono|stereo|deluxe|explicit)/i.test(
        tail
      )
    ) {
      t = head;
    }
  }

  // Drop parenthetical/bracketed "feat" / version markers.
  t = t.replace(
    /\s*[\(\[][^)\]]*(feat\.?|ft\.?|featuring|remaster|live|radio edit|edit|version|mono|stereo|deluxe)[^)\]]*[\)\]]\s*/gi,
    " "
  );

  // Drop inline feat markers.
  t = t.replace(/\s+(feat\.?|ft\.?|featuring)\s+.+$/i, " ");

  // Normalize whitespace
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

async function fetchLastfmTrackTopTags(
  artistName: string,
  trackName: string
): Promise<string[]> {
  const params = new URLSearchParams({
    method: "track.gettoptags",
    artist: artistName,
    track: trackName,
    api_key: LASTFM_API_KEY || "",
    format: "json",
    autocorrect: "1",
  });

  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
  const data = await cachedJsonFetch(url);

  if (!data || data.error) return [];

  const tags = data?.toptags?.tag;
  if (!tags) return [];

  const arr = Array.isArray(tags) ? tags : [tags];
  return arr
    .map((t: any) => (typeof t?.name === "string" ? t.name : ""))
    .map(normalizeTag)
    .filter((t) => t && !isJunkTag(t));
}

async function fetchLastfmArtistTopTags(artistName: string): Promise<string[]> {
  const params = new URLSearchParams({
    method: "artist.gettoptags",
    artist: artistName,
    api_key: LASTFM_API_KEY || "",
    format: "json",
    autocorrect: "1",
  });

  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
  const data = await cachedJsonFetch(url);

  if (!data || data.error) return [];

  const tags = data?.toptags?.tag;
  if (!tags) return [];

  const arr = Array.isArray(tags) ? tags : [tags];
  return arr
    .map((t: any) => (typeof t?.name === "string" ? t.name : ""))
    .map(normalizeTag)
    .filter((t) => t && !isJunkTag(t));
}

/**
 * Fetch "top tags" for a track from Last.fm.
 * Note: Last.fm tags are community-driven "tags" (often genre-ish), not a canonical taxonomy.
 */
export async function getLastfmTrackTags(
  artistName: string,
  trackName: string,
  options?: { limit?: number }
): Promise<string[]> {
  const limit = options?.limit ?? 5;
  if (!LASTFM_API_KEY) return [];
  if (!artistName?.trim() || !trackName?.trim()) return [];

  const cleanedTrack = cleanTrackTitle(trackName);

  // Try exact track name first, then cleaned title.
  const candidates: Array<{
    artist: string;
    track?: string;
    type: "track" | "artist";
  }> = [{ artist: artistName, track: trackName, type: "track" }];
  if (
    cleanedTrack &&
    cleanedTrack.toLowerCase() !== trackName.trim().toLowerCase()
  ) {
    candidates.push({ artist: artistName, track: cleanedTrack, type: "track" });
  }
  // If track tags are empty, fall back to artist tags (often more available).
  candidates.push({ artist: artistName, type: "artist" });

  let gathered: string[] = [];
  for (const c of candidates) {
    const tags =
      c.type === "track"
        ? await fetchLastfmTrackTopTags(c.artist, c.track || "")
        : await fetchLastfmArtistTopTags(c.artist);
    if (tags.length > 0) {
      gathered = tags;
      break;
    }
  }

  // Dedupe while preserving order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const n of gathered) {
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}
