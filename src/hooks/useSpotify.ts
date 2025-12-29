import { useState, useCallback } from "react";
import { SpotifyApiResponse, LikedSong } from "../types";
import {
  getLikedSongs,
  getMultipleArtists,
  getUserProfile,
  createPlaylist,
  addTracksToPlaylist,
} from "../spotify";
import { cache } from "../cache";
import { getLastfmTrackTags, mapWithConcurrency } from "../lastfm";
import { filterGenreLabels } from "../utils/genreSearch";

interface TrackWithGenres extends LikedSong {
  genres: string[];
  spotifyGenres: string[];
  lastfmGenres: string[];
}

interface LoadingState {
  phase:
    | "idle"
    | "fetching_songs"
    | "fetching_genres"
    | "processing"
    | "complete";
  message: string;
  progressKey?: "songs" | "spotify_artists" | "lastfm";
  progress?: {
    current: number;
    total: number;
  };
}

interface GenreStats {
  totalSongs: number;
  songsWithSpotifyGenres: number;
  songsWithLastfmGenres: number;
  songsWithNoGenres: number;
  lastfmEnabled: boolean;
}

export const useSpotify = (
  accessToken: string | null,
  options?: { enableLastfm?: boolean }
) => {
  const enableLastfm = options?.enableLastfm ?? true;
  const [songs, setSongs] = useState<TrackWithGenres[]>([]);
  const [genreStats, setGenreStats] = useState<GenreStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: "idle",
    message: "Ready to start",
  });
  const [error, setError] = useState<string | null>(null);

  const fetchAllLikedSongs = useCallback(
    async (forceRefresh = false) => {
      if (!accessToken) return;

      if (forceRefresh) {
        // Clear cached Spotify + Last.fm responses and fully refetch.
        await cache.clear();
      }

      setLoading(true);
      setError(null);
      setLoadingState({
        phase: "fetching_songs",
        message: "Fetching your liked songs...",
        progressKey: "songs",
      });

      try {
        const allSongs: LikedSong[] = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;
        let estimatedTotal = 0;

        // Fetch all liked songs with rate limit handling
        while (hasMore) {
          try {
            setLoadingState({
              phase: "fetching_songs",
              message: `Fetching liked songs... (${allSongs.length} songs found)`,
              progressKey: "songs",
              progress:
                estimatedTotal > 0
                  ? {
                      current: allSongs.length,
                      total: estimatedTotal,
                    }
                  : undefined,
            });

            const response: SpotifyApiResponse = await getLikedSongs(
              accessToken,
              offset,
              limit
            );
            allSongs.push(...response.items);

            // Set estimated total from first response
            if (estimatedTotal === 0) {
              estimatedTotal = response.total;
            }

            hasMore = response.next !== null;
            offset += limit;

            // Add a small delay between requests to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            if (
              err instanceof Error &&
              err.message.startsWith("RATE_LIMITED:")
            ) {
              const retryAfter = parseInt(err.message.split(":")[1]);
              setLoadingState({
                phase: "fetching_songs",
                message: `Rate limited - waiting ${retryAfter} seconds...`,
                progressKey: "songs",
              });
              await new Promise((resolve) =>
                setTimeout(resolve, retryAfter * 1000)
              );
              // Don't increment offset, retry the same request
              continue;
            } else {
              throw err;
            }
          }
        }

        console.log(`Fetched ${allSongs.length} liked songs`);

        // Collect all unique artist IDs
        const allArtistIds = Array.from(
          new Set(
            allSongs.flatMap((song) =>
              song.track.artists.map((artist) => artist.id).filter(Boolean)
            )
          )
        );

        const totalArtistChunks = Math.ceil(allArtistIds.length / 50);
        setLoadingState({
          phase: "fetching_genres",
          message: `Fetching genres for ${allArtistIds.length} unique artists...`,
          progressKey: "spotify_artists",
          progress:
            totalArtistChunks > 0
              ? { current: 0, total: totalArtistChunks }
              : undefined,
        });

        // Fetch all artist genres efficiently using batch requests (with progress)
        const artistGenreMap = await getMultipleArtists(
          accessToken,
          allArtistIds,
          (current, total) => {
            setLoadingState({
              phase: "fetching_genres",
              message: `Fetching genres for ${allArtistIds.length} unique artists...`,
              progressKey: "spotify_artists",
              progress: { current, total },
            });
          }
        );

        setLoadingState({
          phase: "processing",
          message: "Processing songs and genres...",
        });

        // Map songs to include genres from all artists (Spotify artist genres)
        const songsWithGenresBase: TrackWithGenres[] = allSongs.map((song) => {
          const artistGenres: string[] = [];

          // Get genres from all artists for this song
          song.track.artists.forEach((artist) => {
            const genres = artistGenreMap[artist.id] || [];
            artistGenres.push(...genres);
          });

          // Remove duplicates and create final genre list
          const uniqueGenres = Array.from(
            new Set(filterGenreLabels(artistGenres))
          );

          return {
            ...song,
            // Keep separate sources so UI can toggle between them.
            spotifyGenres: uniqueGenres,
            lastfmGenres: [],
            genres: uniqueGenres, // default display = Spotify until Last.fm merges in
          };
        });

        // Last.fm enrichment (fetch tags for all tracks)
        const lastfmKeyPresent = Boolean(import.meta.env.VITE_LASTFM_API_KEY);
        const lastfmEnabled = lastfmKeyPresent && enableLastfm;
        let songsWithGenresFinal = songsWithGenresBase;

        if (lastfmEnabled) {
          const uniqueQueries = new Map<
            string,
            { artist: string; track: string }
          >();

          for (const s of songsWithGenresBase) {
            const artist = s.track.artists?.[0]?.name || "";
            const track = s.track.name || "";
            const key = `${artist}|||${track}`.toLowerCase();
            if (artist && track && !uniqueQueries.has(key)) {
              uniqueQueries.set(key, { artist, track });
            }
          }

          const queryList = Array.from(uniqueQueries.values());
          if (queryList.length > 0) {
            setLoadingState({
              phase: "fetching_genres",
              message: `Fetching genres from Last.fm...`,
              progressKey: "lastfm",
              progress: { current: 0, total: queryList.length },
            });

            let completed = 0;
            const results = await mapWithConcurrency(
              queryList,
              8,
              async (q) => {
                const tags = await getLastfmTrackTags(q.artist, q.track, {
                  limit: 5,
                });
                completed += 1;
                setLoadingState({
                  phase: "fetching_genres",
                  message: `Fetching genres from Last.fm...`,
                  progressKey: "lastfm",
                  progress: { current: completed, total: queryList.length },
                });
                // Small delay to be gentle even with caching.
                await new Promise((resolve) => setTimeout(resolve, 50));
                return { ...q, tags };
              }
            );

            const tagMap = new Map<string, string[]>();
            results.forEach((r) => {
              tagMap.set(`${r.artist}|||${r.track}`.toLowerCase(), r.tags);
            });

            songsWithGenresFinal = songsWithGenresBase.map((s) => {
              const artist = s.track.artists?.[0]?.name || "";
              const track = s.track.name || "";
              const tags =
                tagMap.get(`${artist}|||${track}`.toLowerCase()) || [];
              const lastfmGenres = filterGenreLabels(tags);
              const merged = Array.from(
                new Set([...(s.spotifyGenres || []), ...lastfmGenres])
              );
              return { ...s, lastfmGenres, genres: merged };
            });
          }
        }

        setSongs(songsWithGenresFinal);
        const songsWithSpotifyGenres = songsWithGenresFinal.filter(
          (s) => (s.spotifyGenres || []).length > 0
        ).length;
        const songsWithLastfmGenres = songsWithGenresFinal.filter(
          (s) => (s.lastfmGenres || []).length > 0
        ).length;
        const songsWithNoGenres = songsWithGenresFinal.filter(
          (s) =>
            (s.spotifyGenres || []).length === 0 &&
            (s.lastfmGenres || []).length === 0
        ).length;
        setGenreStats({
          totalSongs: songsWithGenresFinal.length,
          songsWithSpotifyGenres,
          songsWithLastfmGenres,
          songsWithNoGenres,
          lastfmEnabled,
        });

        setLoadingState({
          phase: "complete",
          message: `Analysis complete! Found ${songsWithGenresFinal.length} songs`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoadingState({
          phase: "idle",
          message: "Error occurred",
        });
      } finally {
        setLoading(false);
      }
    },
    [accessToken, enableLastfm]
  );

  // Remove automatic fetching - songs will be fetched manually when user clicks "Start"

  const clearCache = useCallback(async () => {
    await cache.clear();
    console.log("Cache cleared");
  }, []);

  const refreshData = useCallback(async () => {
    fetchAllLikedSongs(true);
  }, [fetchAllLikedSongs]);

  const getCacheStats = useCallback(async () => {
    return await cache.getStats();
  }, []);

  const exportToPlaylist = useCallback(
    async (
      filteredSongs: TrackWithGenres[],
      playlistName: string,
      description: string
    ) => {
      if (!accessToken) throw new Error("No access token");

      try {
        // Get user profile to get user ID
        const userProfile = await getUserProfile(accessToken);

        // Create the playlist
        const playlist = await createPlaylist(
          accessToken,
          userProfile.id,
          playlistName,
          description,
          true // public playlist
        );

        // Get track URIs from filtered songs
        const trackUris = filteredSongs
          .map((song) => song.track.id)
          .filter(Boolean)
          .map((id) => `spotify:track:${id}`);

        // Add tracks to playlist
        await addTracksToPlaylist(accessToken, playlist.id, trackUris);

        console.log(
          `Created playlist "${playlistName}" with ${trackUris.length} tracks`
        );

        return {
          playlistId: playlist.id,
          playlistUrl: playlist.external_urls.spotify,
          trackCount: trackUris.length,
        };
      } catch (error) {
        console.error("Error creating playlist:", error);
        throw error;
      }
    },
    [accessToken]
  );

  return {
    songs,
    genreStats,
    loading,
    loadingState,
    error,
    refetch: fetchAllLikedSongs,
    refreshData,
    clearCache,
    getCacheStats,
    exportToPlaylist,
  };
};
