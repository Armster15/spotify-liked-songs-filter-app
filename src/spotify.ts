import { cache } from './cache';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const SCOPES = 'user-library-read playlist-modify-public playlist-modify-private';

// PKCE helper functions
const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer): string => {
  const bytes = new Uint8Array(input);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const getAuthUrl = async (): Promise<string> => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Store code verifier for later use
  localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const getAccessToken = async (code: string): Promise<string> => {
  const codeVerifier = localStorage.getItem('code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  // Clear the code verifier after use
  localStorage.removeItem('code_verifier');

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cachedFetch = async (url: string, options: RequestInit): Promise<Response> => {
  // Create cache key from URL and relevant options
  const cacheKey = url + JSON.stringify({
    method: options.method || 'GET',
    headers: options.headers
  });

  try {
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for: ${url}`);
      // Return a mock Response object with cached data
      return new Response(JSON.stringify(cached.response), {
        status: 200,
        statusText: 'OK',
        headers: new Headers(cached.headers)
      });
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // Not in cache, make actual request
  console.log(`Cache miss, fetching: ${url}`);
  const response = await fetch(url, options);

  // Only cache successful responses
  if (response.ok) {
    try {
      const responseData = await response.clone().json();
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      await cache.set(cacheKey, responseData, headersObj);
      console.log(`Cached response for: ${url}`);
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  return response;
};

export const getLikedSongs = async (accessToken: string, offset = 0, limit = 50) => {
  const response = await cachedFetch(
    `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
    throw new Error(`RATE_LIMITED:${retryAfter}`);
  }

  if (!response.ok) {
    throw new Error('Failed to fetch liked songs');
  }

  return response.json();
};

export const getArtistGenres = async (accessToken: string, artistId: string): Promise<string[]> => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      await sleep(retryAfter * 1000);
      return getArtistGenres(accessToken, artistId);
    }

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error('Error fetching artist genres:', error);
    return [];
  }
};

export const getMultipleArtists = async (
  accessToken: string,
  artistIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ [id: string]: string[] }> => {
  if (artistIds.length === 0) return {};

  try {
    // Spotify API allows up to 50 artists per request
    const chunks = [];
    for (let i = 0; i < artistIds.length; i += 50) {
      chunks.push(artistIds.slice(i, i + 50));
    }

    const genreMap: { [id: string]: string[] } = {};
    const totalChunks = chunks.length;
    let completedChunks = 0;

    for (const chunk of chunks) {
      const response = await cachedFetch(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
        await sleep(retryAfter * 1000);
        // Retry this chunk
        const retryData = await getMultipleArtists(accessToken, chunk);
        Object.assign(genreMap, retryData);
        completedChunks += 1;
        onProgress?.(completedChunks, totalChunks);
        continue;
      }

      if (!response.ok) {
        console.error(`Failed to fetch artists: ${response.status}`);
        completedChunks += 1;
        onProgress?.(completedChunks, totalChunks);
        continue;
      }

      const data = await response.json();
      data.artists.forEach((artist: any) => {
        genreMap[artist.id] = artist.genres || [];
      });
      completedChunks += 1;
      onProgress?.(completedChunks, totalChunks);

      // Small delay between chunks
      if (chunks.length > 1) {
        await sleep(100);
      }
    }

    return genreMap;
  } catch (error) {
    console.error('Error fetching multiple artists:', error);
    return {};
  }
};

export const getUserProfile = async (accessToken: string) => {
  const response = await cachedFetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
};

export const createPlaylist = async (
  accessToken: string,
  userId: string,
  name: string,
  description?: string,
  isPublic = true
) => {
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: description || '',
      public: isPublic,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create playlist');
  }

  return response.json();
};

export const addTracksToPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackUris: string[]
) => {
  // Spotify API allows up to 100 tracks per request
  const chunks = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: chunk,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add tracks to playlist');
    }

    // Small delay between chunks to avoid rate limiting
    if (chunks.length > 1) {
      await sleep(100);
    }
  }
};