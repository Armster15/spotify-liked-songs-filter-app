import React, { useMemo, useState } from "react";
import { parseGenreQuery, toGenreSearchKey } from "../utils/genreSearch";

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
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [excludeMode, setExcludeMode] = useState(false);
  const query = useMemo(() => parseGenreQuery(selectedGenre), [selectedGenre]);

  const isAllActive = query.include.length === 0 && query.exclude.length === 0;
  const hasSearchInput = selectedGenre.trim().length > 0;

  const isGenreActive = (genre: string) => {
    const g = toGenreSearchKey(genre);
    if (!g) return false;
    return query.include.includes(g);
  };

  const isGenreExcluded = (genre: string) => {
    const g = toGenreSearchKey(genre);
    if (!g) return false;
    return query.exclude.includes(g);
  };

  const toggleGenre = (genre: string, mode: "include" | "exclude") => {
    const gKey = toGenreSearchKey(genre);
    if (!gKey) return;

    // Build a list of currently selected *display* terms from the raw input.
    const currentRawTerms = (selectedGenre || "")
      .split(/[,\|]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const next: string[] = [];
    let removed = false;

    for (const term of currentRawTerms) {
      const isExclude = term.startsWith("-") || term.startsWith("!");
      const cleaned = isExclude ? term.slice(1).trim() : term;
      const key = toGenreSearchKey(cleaned);
      const matches = key && key === gKey && (mode === "exclude") === isExclude;
      if (matches && !removed) {
        removed = true;
        continue;
      }
      if (term) next.push(term);
    }

    if (!removed) {
      next.push(mode === "exclude" ? `-${genre}` : genre);
    }

    onGenreChange(next.join(", "));
  };

  return (
    <div className="filters">
      <div className="genre-filter">
        <label htmlFor="genre-input" style={{ fontWeight: 600 }}>
          Genre filter
        </label>
        <input
          id="genre-input"
          type="text"
          placeholder="Search genres (e.g. r&b / rnb, phonk, trap | rage)"
          value={selectedGenre}
          onChange={(e) => {
            onGenreChange(e.target.value);
            // If user starts typing a query, keep it expanded so they can see all matches.
            if (e.target.value.trim().length > 0) setShowAllGenres(true);
          }}
          aria-describedby="genre-filter-help"
        />
      </div>
      <div
        id="genre-filter-help"
        style={{
          marginTop: "-12px",
          marginBottom: "12px",
          color: "#b3b3b3",
          fontSize: "12px",
        }}
      >
        Type genres to include. Prefix with <code>-</code> or <code>!</code> to
        exclude (e.g. <code>rnb, -pop</code>). You can also click tags below to
        add/remove filters.
      </div>

      <div className="genre-tags">
        {(() => {
          const filtered = availableGenres.filter((genre) => {
            const terms = [...query.include, ...query.exclude];
            if (terms.length === 0) return true;
            const g = toGenreSearchKey(genre);
            return terms.some((term) => g.includes(term));
          });

          const visible =
            !hasSearchInput && !showAllGenres
              ? filtered.slice(0, 15)
              : filtered;

          return (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  width: "100%",
                }}
              >
                <span
                  className={`genre-tag ${isAllActive ? "active" : ""}`}
                  onClick={() => {
                    onGenreChange("");
                    setShowAllGenres(false);
                    setExcludeMode(false);
                  }}
                >
                  All
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 4px",
                  }}
                >
                  <span style={{ color: "#b3b3b3", fontSize: "12px" }}>
                    Tag clicks:
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setExcludeMode(false)}
                      className="genre-tag"
                      title="Clicking a genre tag will INCLUDE it"
                      style={{
                        backgroundColor: !excludeMode
                          ? "#1db954"
                          : "transparent",
                        borderColor: !excludeMode ? "#1db954" : "#404040",
                        color: !excludeMode ? "#ffffff" : "#b3b3b3",
                      }}
                    >
                      Include
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcludeMode(true)}
                      className="genre-tag"
                      title="Clicking a genre tag will EXCLUDE it (adds -genre)"
                      style={{
                        backgroundColor: excludeMode
                          ? "#e22134"
                          : "transparent",
                        borderColor: excludeMode ? "#e22134" : "#404040",
                        color: excludeMode ? "#ffffff" : "#b3b3b3",
                      }}
                    >
                      Exclude
                    </button>
                  </div>
                </div>

                {!hasSearchInput && filtered.length > 15 && (
                  <span
                    className="genre-tag"
                    onClick={() => setShowAllGenres((v) => !v)}
                    style={{
                      backgroundColor: "transparent",
                      color: "#b3b3b3",
                      borderColor: "#404040",
                    }}
                  >
                    {showAllGenres
                      ? `Hide genres (${filtered.length})`
                      : `Show all genres (${filtered.length})`}
                  </span>
                )}
              </div>

              {visible.map((genre) => (
                <span
                  key={genre}
                  className={`genre-tag ${
                    isGenreActive(genre)
                      ? "active"
                      : isGenreExcluded(genre)
                      ? "exclude"
                      : ""
                  }`}
                  onClick={() =>
                    toggleGenre(genre, excludeMode ? "exclude" : "include")
                  }
                >
                  {genre}
                </span>
              ))}
            </>
          );
        })()}
      </div>
    </div>
  );
};
