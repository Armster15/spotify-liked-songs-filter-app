/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  readonly VITE_SPOTIFY_REDIRECT_URI?: string;
  readonly VITE_LASTFM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
