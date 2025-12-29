export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface LikedSong {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifyApiResponse {
  items: LikedSong[];
  next: string | null;
  total: number;
}