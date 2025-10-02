import React from 'react';

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
}

interface SongCardProps {
  song: TrackWithGenres;
}

export const SongCard: React.FC<SongCardProps> = ({ song }) => {
  const { track, genres } = song;
  const albumImage = track.album.images[0]?.url || '';
  const artistNames = track.artists.map(artist => artist.name).join(', ');

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
          {genres.slice(0, 3).map((genre, index) => (
            <span key={index} className="song-genre-tag">
              {genre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};