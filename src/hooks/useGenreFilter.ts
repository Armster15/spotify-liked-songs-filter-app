import { useState, useMemo } from "react";
import {
  filterGenreLabels,
  parseGenreQuery,
  toGenreSearchKey,
} from "../utils/genreSearch";

interface TrackWithGenres {
  genres: string[];
  [key: string]: any;
}

export const useGenreFilter = <T extends TrackWithGenres>(songs: T[]) => {
  const [selectedGenre, setSelectedGenre] = useState<string>("");

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach((song) => {
      filterGenreLabels(song.genres).forEach((genre) => genreSet.add(genre));
    });
    return Array.from(genreSet).sort();
  }, [songs]);

  const query = useMemo(() => parseGenreQuery(selectedGenre), [selectedGenre]);

  const filteredSongs = useMemo(() => {
    if (!selectedGenre) return songs;

    // Include: match ANY include term (if provided). Exclude: match NONE of the exclude terms.
    return songs.filter((song) => {
      if (song.genres.length === 0) return false;
      const genreKeys = song.genres.map(toGenreSearchKey).filter(Boolean);
      const matchesInclude =
        query.include.length === 0
          ? true
          : query.include.some((term) =>
              genreKeys.some((g) => g.includes(term))
            );
      if (!matchesInclude) return false;

      const matchesExclude = query.exclude.some((term) =>
        genreKeys.some((g) => g.includes(term))
      );
      return !matchesExclude;
    });
  }, [songs, selectedGenre, query]);

  return {
    selectedGenre,
    setSelectedGenre,
    availableGenres,
    filteredSongs,
  };
};
