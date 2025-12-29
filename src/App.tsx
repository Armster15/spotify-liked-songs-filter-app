import React, { useState, useEffect } from 'react';
import { useSpotify } from './hooks/useSpotify';
import { useGenreFilter } from './hooks/useGenreFilter';
import { SongCard } from './components/SongCard';
import { GenreFilter } from './components/GenreFilter';
import { ExportPlaylist } from './components/ExportPlaylist';
import { HomePage } from './components/HomePage';
import { LoadingProgress } from './components/LoadingProgress';
import { getAuthUrl, getAccessToken } from './spotify';

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );

  const [enableLastfm, setEnableLastfm] = useState<boolean>(() => {
    const v = localStorage.getItem('enable_lastfm');
    return v === null ? true : v === 'true';
  });

  useEffect(() => {
    localStorage.setItem('enable_lastfm', String(enableLastfm));
  }, [enableLastfm]);

  const lastfmAvailable = Boolean(import.meta.env.VITE_LASTFM_API_KEY);

  const { songs, genreStats, loading, loadingState, error, refreshData, getCacheStats, exportToPlaylist, refetch } = useSpotify(accessToken, { enableLastfm });
  const [cacheStats, setCacheStats] = useState<{ count: number; size: number } | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [genreSource, setGenreSource] = useState<'spotify' | 'lastfm' | 'both'>(
    (localStorage.getItem('genre_source') as any) || 'both'
  );

  const songsForUi = React.useMemo(() => {
    return songs.map((s: any) => {
      const spotifyGenres = s.spotifyGenres || s.genres || [];
      const lastfmGenres = s.lastfmGenres || [];
      const merged = Array.from(new Set([...(spotifyGenres || []), ...(lastfmGenres || [])]));
      const genres =
        genreSource === 'spotify'
          ? spotifyGenres
          : genreSource === 'lastfm'
            ? lastfmGenres
            : merged;
      return { ...s, genres };
    });
  }, [songs, genreSource]);

  useEffect(() => {
    localStorage.setItem('genre_source', genreSource);
  }, [genreSource]);

  const { selectedGenre, setSelectedGenre, availableGenres, filteredSongs } = useGenreFilter(songsForUi);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !accessToken) {
      getAccessToken(code)
        .then((token) => {
          setAccessToken(token);
          localStorage.setItem('spotify_access_token', token);
          window.history.replaceState({}, document.title, '/');
        })
        .catch((error) => {
          console.error('Error getting access token:', error);
        });
    }
  }, [accessToken]);

  useEffect(() => {
    const loadCacheStats = async () => {
      if (getCacheStats) {
        const stats = await getCacheStats();
        setCacheStats(stats);
      }
    };
    loadCacheStats();
  }, [getCacheStats, songs]);

  const handleLogin = async () => {
    const authUrl = await getAuthUrl();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    setAccessToken(null);
    localStorage.removeItem('spotify_access_token');
    setShowAnalysis(false);
  };

  const handleStartAnalysis = () => {
    setShowAnalysis(true);
    refetch();
  };

  const handleExportToPlaylist = async (playlistName: string, description: string) => {
    try {
      setExportStatus('Creating playlist...');
      const result = await exportToPlaylist(filteredSongs, playlistName, description);
      setExportStatus(`✅ Created playlist with ${result.trackCount} songs!`);

      // Clear status after 5 seconds
      setTimeout(() => setExportStatus(null), 5000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus(`❌ Failed to create playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Clear status after 10 seconds
      setTimeout(() => setExportStatus(null), 10000);
    }
  };

  if (!accessToken) {
    return (
      <div className="container">
        <div className="header" style={{ marginBottom: '40px' }}>
          <h1 style={{ marginBottom: '20px' }}>Spotify Liked Songs</h1>
          <p style={{ marginBottom: '30px', fontSize: '18px', lineHeight: '1.5' }}>
            View and filter your liked songs by genre
          </p>
          <button onClick={handleLogin} className="login-btn">
            Login with Spotify
          </button>
        </div>
        {(!import.meta.env.VITE_SPOTIFY_CLIENT_ID || !import.meta.env.VITE_SPOTIFY_REDIRECT_URI) && (
          <div style={{
            textAlign: 'center',
            marginTop: '50px',
            color: '#b3b3b3',
            backgroundColor: '#282828',
            padding: '25px',
            borderRadius: '8px',
            border: '1px solid #404040'
          }}>
            <p style={{ marginBottom: '12px', fontSize: '16px', color: '#e22134' }}>
              ⚠️ Missing environment variables
            </p>
            {!import.meta.env.VITE_SPOTIFY_CLIENT_ID && (
              <p style={{ marginBottom: '8px' }}>
                • VITE_SPOTIFY_CLIENT_ID is not configured
              </p>
            )}
            {!import.meta.env.VITE_SPOTIFY_REDIRECT_URI && (
              <p style={{ marginBottom: '8px' }}>
                • VITE_SPOTIFY_REDIRECT_URI is not configured
              </p>
            )}
            <p style={{ marginTop: '16px', marginBottom: '8px' }}>
              Create a Spotify app at https://developer.spotify.com/dashboard
            </p>
            <p>Set redirect URI to: http://127.0.0.1:3000/callback</p>
          </div>
        )}
      </div>
    );
  }

  // Show home page when logged in but analysis hasn't started
  if (!showAnalysis) {
    return (
      <HomePage
        accessToken={accessToken}
        enableLastfm={enableLastfm}
        lastfmAvailable={lastfmAvailable}
        onEnableLastfmChange={setEnableLastfm}
        onStartAnalysis={handleStartAnalysis}
        onLogout={handleLogout}
      />
    );
  }

  if (loading) {
    return <LoadingProgress loadingState={loadingState} />;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          Error: {error}
          <br />
          <button onClick={handleLogout} style={{ marginTop: '10px' }}>
            Try logging in again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Your Liked Songs</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowAnalysis(false)}
            style={{
              background: 'transparent',
              border: '1px solid #404040',
              color: '#b3b3b3',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Home
          </button>
          <button onClick={handleLogout} className="login-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="stats">
        <p>Total liked songs: {songs.length}</p>
        <p>Available genres: {availableGenres.length}</p>
        <p>Filtered songs: {filteredSongs.length}</p>
        <div style={{ marginTop: '12px', color: '#b3b3b3', fontSize: '12px' }}>
          Genre source (used for filtering + tags):
        </div>
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setGenreSource('spotify')}
            style={{
              backgroundColor: genreSource === 'spotify' ? '#1db954' : 'transparent',
              color: genreSource === 'spotify' ? '#ffffff' : '#b3b3b3',
              border: '1px solid #404040',
              padding: '6px 12px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Spotify genres
          </button>
          <button
            type="button"
            onClick={() => setGenreSource('lastfm')}
            disabled={!genreStats?.lastfmEnabled}
            style={{
              backgroundColor: genreSource === 'lastfm' ? '#1db954' : 'transparent',
              color: genreSource === 'lastfm' ? '#ffffff' : '#b3b3b3',
              border: '1px solid #404040',
              padding: '6px 12px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: !genreStats?.lastfmEnabled ? 0.5 : 1
            }}
          >
            Last.fm tags
          </button>
          <button
            type="button"
            onClick={() => setGenreSource('both')}
            style={{
              backgroundColor: genreSource === 'both' ? '#1db954' : 'transparent',
              color: genreSource === 'both' ? '#ffffff' : '#b3b3b3',
              border: '1px solid #404040',
              padding: '6px 12px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Both
          </button>
        </div>
        {genreStats && (
          <div style={{ marginTop: '6px', color: '#b3b3b3', fontSize: '12px' }}>
            <p>
              Genre coverage (any source): {genreStats.totalSongs - genreStats.songsWithNoGenres} / {genreStats.totalSongs}{' '}
              ({Math.round(((genreStats.totalSongs - genreStats.songsWithNoGenres) / Math.max(1, genreStats.totalSongs)) * 100)}%)
            </p>
            <p>
              Sources: Spotify {genreStats.songsWithSpotifyGenres}, Last.fm {genreStats.songsWithLastfmGenres}
              {!genreStats.lastfmEnabled && ' (Last.fm disabled)'}
            </p>
            {genreStats.songsWithNoGenres > 0 && (
              <p>
                Still missing: {genreStats.songsWithNoGenres} songs (no Spotify artist genres and no Last.fm tags)
              </p>
            )}
          </div>
        )}
        {cacheStats && (
          <p style={{ color: '#1db954' }}>
            ✓ Cache: {cacheStats.count} entries, {Math.round(cacheStats.size / 1024)} KB
          </p>
        )}
        <button
          onClick={refreshData}
          style={{
            background: 'transparent',
            border: '1px solid #404040',
            color: '#b3b3b3',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: '8px'
          }}
        >
          Refresh Data
        </button>
      </div>

      <GenreFilter
        availableGenres={availableGenres}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />

      <ExportPlaylist
        filteredSongs={filteredSongs}
        selectedGenre={selectedGenre}
        onExport={handleExportToPlaylist}
      />

      {exportStatus && (
        <div
          style={{
            backgroundColor: exportStatus.startsWith('✅') ? '#1db954' : exportStatus.startsWith('❌') ? '#e22134' : '#404040',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}
        >
          {exportStatus}
        </div>
      )}

      <div className="songs-grid">
        {filteredSongs.map((song) => (
          <SongCard key={song.track.id} song={song} />
        ))}
      </div>

      {filteredSongs.length === 0 && selectedGenre && (
        <div className="error">
          No songs found for genre "{selectedGenre}". Try a different search term.
        </div>
      )}
    </div>
  );
}

export default App;