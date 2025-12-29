import React from 'react';
import { toGenreSearchKey } from '../utils/genreSearch';

interface TrackWithGenres {
  added_at: string;
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
    external_urls: {
      spotify: string;
    };
  };
  genres: string[];
  spotifyGenres?: string[];
  lastfmGenres?: string[];
}

interface SongCardProps {
  song: TrackWithGenres;
}

export const SongCard: React.FC<SongCardProps> = ({ song }) => {
  const { track, genres } = song;
  const albumImage = track.album.images[0]?.url || '';
  const artistNames = track.artists.map(artist => artist.name).join(', ');
  const spotifyGenreKeys = new Set((song.spotifyGenres || []).map(toGenreSearchKey).filter(Boolean));
  const lastfmGenreKeys = new Set((song.lastfmGenres || []).map(toGenreSearchKey).filter(Boolean));

  const getGenreSourceLabel = (genre: string) => {
    const key = toGenreSearchKey(genre);
    const fromSpotify = key ? spotifyGenreKeys.has(key) : false;
    const fromLastfm = key ? lastfmGenreKeys.has(key) : false;
    if (fromSpotify && fromLastfm) return 'spotify + lastfm';
    if (fromSpotify) return 'spotify';
    if (fromLastfm) return 'lastfm';
    return 'unknown';
  };

  const handleClick = () => {
    window.open(track.external_urls.spotify, '_blank');
  };

  return (
    <div className="song-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="song-info">
        {albumImage && (
          <img src={albumImage} alt={track.album.name} className="song-image" />
        )}
        <div className="song-details">
          <h3>{track.name}</h3>
          <p>{artistNames}</p>
          <p>{track.album.name}</p>
        </div>
      </div>
      {genres.length > 0 && (
        <div className="song-genres">
          {genres.map((genre, index) => (
            <span
              key={index}
              className="song-genre-tag"
              title={`${genre} from ${getGenreSourceLabel(genre)}`}
            >
              {genre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};