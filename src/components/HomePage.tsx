import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../spotify';

interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string }>;
  followers?: { total: number };
  country?: string;
}

interface HomePageProps {
  accessToken: string;
  enableLastfm: boolean;
  lastfmAvailable: boolean;
  onEnableLastfmChange: (enabled: boolean) => void;
  onStartAnalysis: () => void;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  accessToken,
  enableLastfm,
  lastfmAvailable,
  onEnableLastfmChange,
  onStartAnalysis,
  onLogout
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profile = await getUserProfile(accessToken);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          {error}
          <br />
          <button
            onClick={onLogout}
            className="login-btn"
            style={{ marginTop: '20px' }}
          >
            Logout and Try Again
          </button>
        </div>
      </div>
    );
  }

  const profileImage = userProfile?.images?.[0]?.url;

  return (
    <div className="container">
      <div className="header">
        <h1>Spotify Liked Songs</h1>
        <p>Discover and organize your music by genre</p>
      </div>

      <div
        style={{
          backgroundColor: '#282828',
          padding: '30px',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '30px',
          border: '1px solid #404040'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                marginBottom: '15px',
                border: '2px solid #1db954'
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#1db954',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px',
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            >
              {userProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        <h2 style={{ color: '#1db954', marginBottom: '8px', fontSize: '24px' }}>
          Welcome back, {userProfile?.display_name}!
        </h2>

        <div style={{ color: '#b3b3b3', marginBottom: '20px' }}>
          <p>Spotify ID: {userProfile?.id}</p>
          {userProfile?.followers && (
            <p>{userProfile.followers.total.toLocaleString()} followers</p>
          )}
          {userProfile?.country && (
            <p>Country: {userProfile.country}</p>
          )}
        </div>

        <div style={{ marginBottom: '25px', color: '#ffffff' }}>
          <p>Ready to explore your liked songs?</p>
          <p style={{ fontSize: '14px', color: '#b3b3b3', marginTop: '8px' }}>
            This will analyze your music library and organize it by genres
          </p>
        </div>

        <div
          style={{
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            color: '#b3b3b3',
            fontSize: '14px',
            flexWrap: 'wrap'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: lastfmAvailable ? 'pointer' : 'not-allowed' }}>
            <input
              type="checkbox"
              checked={enableLastfm}
              disabled={!lastfmAvailable}
              onChange={(e) => onEnableLastfmChange(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Fetch genres from Last.fm (recommended)
          </label>
          {!lastfmAvailable && (
            <span style={{ color: '#e22134', fontSize: '12px' }}>
              (Last.fm API key not configured)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={onStartAnalysis}
            style={{
              backgroundColor: '#1db954',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '25px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#1ed760';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#1db954';
            }}
          >
            🎵 Start Analysis
          </button>

          <button
            onClick={onLogout}
            style={{
              backgroundColor: 'transparent',
              color: '#b3b3b3',
              border: '1px solid #404040',
              padding: '15px 30px',
              borderRadius: '25px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#b3b3b3';
              (e.target as HTMLButtonElement).style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#404040';
              (e.target as HTMLButtonElement).style.color = '#b3b3b3';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#b3b3b3', fontSize: '14px' }}>
        <p>✨ Features you'll discover:</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span>🎭 Genre filtering</span>
          <span>📝 Export to playlists</span>
          <span>🔍 Smart search</span>
          <span>💾 Offline caching</span>
        </div>
      </div>
    </div>
  );
};