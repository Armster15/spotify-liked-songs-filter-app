import { useState, useCallback, useEffect } from 'react';
import { SpotifyApiResponse, LikedSong } from '../types';
import { getLikedSongs, getMultipleArtists, getUserProfile, createPlaylist, addTracksToPlaylist } from '../spotify';
import { cache } from '../cache';

interface TrackWithGenres extends LikedSong {
  genres: string[];
}

interface LoadingState {
  phase: 'idle' | 'fetching_songs' | 'fetching_genres' | 'processing' | 'complete';
  message: string;
  progress?: {
    current: number;
    total: number;
  };
}

export const useSpotify = (accessToken: string | null) => {
  const [songs, setSongs] = useState<TrackWithGenres[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'idle',
    message: 'Ready to start'
  });
  const [error, setError] = useState<string | null>(null);

  const fetchAllLikedSongs = useCallback(async (forceRefresh = false) => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    setLoadingState({
      phase: 'fetching_songs',
      message: 'Fetching your liked songs...'
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
            phase: 'fetching_songs',
            message: `Fetching liked songs... (${allSongs.length} songs found)`,
            progress: estimatedTotal > 0 ? {
              current: allSongs.length,
              total: estimatedTotal
            } : undefined
          });

          const response: SpotifyApiResponse = await getLikedSongs(accessToken, offset, limit);
          allSongs.push(...response.items);

          // Set estimated total from first response
          if (estimatedTotal === 0) {
            estimatedTotal = response.total;
          }

          hasMore = response.next !== null;
          offset += limit;

          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('RATE_LIMITED:')) {
            const retryAfter = parseInt(err.message.split(':')[1]);
            setLoadingState({
              phase: 'fetching_songs',
              message: `Rate limited - waiting ${retryAfter} seconds...`
            });
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            // Don't increment offset, retry the same request
            continue;
          } else {
            throw err;
          }
        }
      }

      console.log(`Fetched ${allSongs.length} liked songs`);

      // Collect all unique artist IDs
      const allArtistIds = Array.from(new Set(
        allSongs.flatMap(song => song.track.artists.map(artist => artist.id))
      ));

      setLoadingState({
        phase: 'fetching_genres',
        message: `Fetching genres for ${allArtistIds.length} unique artists...`
      });

      // Fetch all artist genres efficiently using batch requests
      const artistGenreMap = await getMultipleArtists(accessToken, allArtistIds);

      setLoadingState({
        phase: 'processing',
        message: 'Processing songs and genres...'
      });

      // Map songs to include genres from all artists
      const songsWithGenres: TrackWithGenres[] = allSongs.map((song) => {
        const artistGenres: string[] = [];

        // Get genres from all artists for this song
        song.track.artists.forEach(artist => {
          const genres = artistGenreMap[artist.id] || [];
          artistGenres.push(...genres);
        });

        // Remove duplicates and create final genre list
        const uniqueGenres = Array.from(new Set(artistGenres));

        return {
          ...song,
          genres: uniqueGenres,
        };
      });

      setSongs(songsWithGenres);

      setLoadingState({
        phase: 'complete',
        message: `Analysis complete! Found ${songsWithGenres.length} songs`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoadingState({
        phase: 'idle',
        message: 'Error occurred'
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Remove automatic fetching - songs will be fetched manually when user clicks "Start"

  const clearCache = useCallback(async () => {
    await cache.clear();
    console.log('Cache cleared');
  }, []);

  const refreshData = useCallback(async () => {
    await clearCache();
    fetchAllLikedSongs(true);
  }, [fetchAllLikedSongs, clearCache]);

  const getCacheStats = useCallback(async () => {
    return await cache.getStats();
  }, []);

  const exportToPlaylist = useCallback(async (
    filteredSongs: TrackWithGenres[],
    playlistName: string,
    description: string
  ) => {
    if (!accessToken) throw new Error('No access token');

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
      const trackUris = filteredSongs.map(song => song.track.uri);

      // Add tracks to playlist
      await addTracksToPlaylist(accessToken, playlist.id, trackUris);

      console.log(`Created playlist "${playlistName}" with ${trackUris.length} tracks`);

      return {
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify,
        trackCount: trackUris.length
      };
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }, [accessToken]);

  return {
    songs,
    loading,
    loadingState,
    error,
    refetch: fetchAllLikedSongs,
    refreshData,
    clearCache,
    getCacheStats,
    exportToPlaylist
  };
};