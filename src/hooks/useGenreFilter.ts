import { useState, useMemo } from 'react';

interface TrackWithGenres {
  genres: string[];
  [key: string]: any;
}

export const useGenreFilter = <T extends TrackWithGenres>(songs: T[]) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(song => {
      song.genres.forEach(genre => genreSet.add(genre));
    });
    return Array.from(genreSet).sort();
  }, [songs]);

  const filteredSongs = useMemo(() => {
    if (!selectedGenre) return songs;

    return songs.filter(song =>
      song.genres.some(genre =>
        genre.toLowerCase().includes(selectedGenre.toLowerCase())
      )
    );
  }, [songs, selectedGenre]);

  return {
    selectedGenre,
    setSelectedGenre,
    availableGenres,
    filteredSongs,
  };
};