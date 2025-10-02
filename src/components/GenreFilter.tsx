import React from 'react';

interface GenreFilterProps {
  availableGenres: string[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
}

export const GenreFilter: React.FC<GenreFilterProps> = ({
  availableGenres,
  selectedGenre,
  onGenreChange,
}) => {
  return (
    <div className="filters">
      <div className="genre-filter">
        <label htmlFor="genre-input">Filter by genre:</label>
        <input
          id="genre-input"
          type="text"
          placeholder="Type to filter genres (e.g., 'phonk')"
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value)}
        />
      </div>

      <div className="genre-tags">
        <span
          className={`genre-tag ${!selectedGenre ? 'active' : ''}`}
          onClick={() => onGenreChange('')}
        >
          All
        </span>
        {availableGenres
          .filter(genre =>
            !selectedGenre || genre.toLowerCase().includes(selectedGenre.toLowerCase())
          )
          .slice(0, 15)
          .map((genre) => (
            <span
              key={genre}
              className={`genre-tag ${selectedGenre === genre ? 'active' : ''}`}
              onClick={() => onGenreChange(genre)}
            >
              {genre}
            </span>
          ))}
      </div>
    </div>
  );
};