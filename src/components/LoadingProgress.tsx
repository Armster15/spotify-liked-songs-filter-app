import React from "react";

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

interface LoadingProgressProps {
  loadingState: LoadingState;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  loadingState,
}) => {
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "fetching_songs":
        return "🎵";
      case "fetching_genres":
        return "🎭";
      case "processing":
        return "⚙️";
      case "complete":
        return "✅";
      default:
        return "⏳";
    }
  };

  const getProgressPercentage = () => {
    if (!loadingState.progress) return 0;
    return Math.min(
      100,
      (loadingState.progress.current / loadingState.progress.total) * 100
    );
  };

  const formatProgress = () => {
    if (!loadingState.progress) return "";
    return `${loadingState.progress.current.toLocaleString()} / ${loadingState.progress.total.toLocaleString()}`;
  };

  return (
    <div className="container">
      <div
        style={{
          backgroundColor: "#282828",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
          maxWidth: "600px",
          margin: "0 auto",
          border: "1px solid #404040",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>
          {getPhaseIcon(loadingState.phase)}
        </div>

        <h2
          style={{ color: "#1db954", marginBottom: "15px", fontSize: "24px" }}
        >
          Analyzing Your Music Library
        </h2>

        <div style={{ marginBottom: "20px" }}>
          <p
            style={{ color: "#ffffff", fontSize: "16px", marginBottom: "8px" }}
          >
            {loadingState.message}
          </p>

          {loadingState.progress && (
            <p style={{ color: "#b3b3b3", fontSize: "14px" }}>
              {formatProgress()}
            </p>
          )}
        </div>

        {loadingState.progress && (
          <div
            key={loadingState.progressKey || loadingState.phase}
            style={{ marginBottom: "20px" }}
          >
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#404040",
                borderRadius: "4px",
                overflow: "hidden",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: `${getProgressPercentage()}%`,
                  height: "100%",
                  backgroundColor: "#1db954",
                  transition: "width 0.3s ease-in-out",
                  borderRadius: "4px",
                }}
              />
            </div>
            <p style={{ color: "#b3b3b3", fontSize: "12px" }}>
              {Math.round(getProgressPercentage())}% complete
            </p>
          </div>
        )}

        <div style={{ color: "#b3b3b3", fontSize: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🎵</span>
              <span
                style={{
                  opacity: loadingState.phase === "fetching_songs" ? 1 : 0.5,
                }}
              >
                Fetch Songs
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🎭</span>
              <span
                style={{
                  opacity: loadingState.phase === "fetching_genres" ? 1 : 0.5,
                }}
              >
                Get Genres
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚙️</span>
              <span
                style={{
                  opacity: loadingState.phase === "processing" ? 1 : 0.5,
                }}
              >
                Process
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>✅</span>
              <span
                style={{ opacity: loadingState.phase === "complete" ? 1 : 0.5 }}
              >
                Complete
              </span>
            </div>
          </div>
        </div>

        {loadingState.phase === "fetching_songs" && (
          <div
            style={{ marginTop: "20px", color: "#b3b3b3", fontSize: "12px" }}
          >
            <p>💡 This may take a while if you have many liked songs</p>
            <p>🚀 We're using smart caching to speed up future loads</p>
          </div>
        )}

        {loadingState.phase === "fetching_genres" && (
          <div
            style={{ marginTop: "20px", color: "#b3b3b3", fontSize: "12px" }}
          >
            <p>
              🎨 Analyzing genres (Spotify artist genres + optional Last.fm
              track tags)
            </p>
            <p>⚡ Using batch requests + caching for optimal performance</p>
          </div>
        )}
      </div>
    </div>
  );
};
