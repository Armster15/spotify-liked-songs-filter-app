# I did not write a single line of code. This was 100% written by Claude Code in ~15-20 minutes.

The below README is also written by Claude


---

# Spotify Liked Songs Analyzer

A web application that lets you analyze, filter, and organize your Spotify liked songs by genre. Built with React, TypeScript, and the Spotify Web API.

## Features

🎭 **Genre Filtering** - Filter your liked songs by any genre (e.g., "phonk", "hip-hop", "rock")
📝 **Export to Playlists** - Create new Spotify playlists from your filtered results
🔍 **Smart Search** - Type to search genres or click tags for quick filtering
💾 **Offline Caching** - IndexedDB caching for fast loading and offline browsing
👤 **Multi-User Support** - Works with any Spotify account
⚡ **Rate Limit Handling** - Intelligent API request management to avoid limits

## Screenshots

### Home Page
Clean welcome screen showing your Spotify profile and a start button to begin analysis.

### Analysis View
Browse all your liked songs with genre tags, filter by specific genres, and export filtered results to new playlists.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS with Spotify-inspired dark theme
- **Storage**: IndexedDB for caching API responses
- **API**: Spotify Web API for authentication and music data
- **Build Tool**: Vite for fast development and building

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Spotify account
- A Spotify Developer App (see setup instructions below)

## Setup Instructions

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create an App"**
3. Fill in the details:
   - **App Name**: "Liked Songs Analyzer" (or any name)
   - **App Description**: "Analyze and filter Spotify liked songs by genre"
   - **Redirect URI**: `http://127.0.0.1:3000/callback`
4. Save your **Client ID** (Client Secret is not needed - we use PKCE flow)

### 2. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd spotify-liked-songs

# Install dependencies
npm install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Spotify credentials
```

Update `.env` with your Spotify app credentials:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```

Note: No Client Secret needed! This app uses PKCE (Proof Key for Code Exchange) flow for enhanced security.

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://127.0.0.1:3000`

## Usage

1. **Login**: Click "Login with Spotify" and authorize the app
2. **Home Page**: See your profile and click "🎵 Start Analysis"
3. **Analysis**: Wait for the app to fetch and analyze your liked songs
4. **Filter**: Type genre names or click genre tags to filter songs
5. **Export**: Click "📝 Export to Playlist" to create playlists from filtered results

## How It Works

### Authentication Flow
1. User clicks login → redirected to Spotify OAuth
2. User authorizes → redirected back with authorization code
3. App exchanges code for access token
4. Token is stored locally for subsequent API calls

### Data Processing
1. **Fetch Liked Songs**: Retrieves all user's liked songs via Spotify API
2. **Get Artist Genres**: Batch fetches genre data for all unique artists
3. **Smart Caching**: Stores raw API responses in IndexedDB for 24 hours
4. **Genre Mapping**: Associates each song with all genres from its artists

### Filtering & Export
1. **Real-time Filtering**: Filter songs by typing genre names
2. **Playlist Creation**: Creates new Spotify playlist with filtered songs
3. **Batch Processing**: Handles large playlists with rate limit management

## Project Structure

```
src/
├── components/          # React components
│   ├── SongCard.tsx    # Individual song display
│   ├── GenreFilter.tsx # Filtering interface
│   ├── ExportPlaylist.tsx # Playlist export modal
│   └── HomePage.tsx    # Welcome/profile page
├── hooks/              # Custom React hooks
│   ├── useSpotify.ts   # Main Spotify API hook
│   └── useGenreFilter.ts # Genre filtering logic
├── cache.ts            # IndexedDB caching layer
├── spotify.ts          # Spotify API functions
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main application component
```

## API Permissions

The app requests these Spotify permissions:
- `user-library-read` - Read your liked songs
- `playlist-modify-public` - Create public playlists
- `playlist-modify-private` - Create private playlists

## Development Notes

### Rate Limiting
- Spotify API has rate limits (~100 requests per minute per user)
- App includes automatic retry with exponential backoff
- Requests are cached to minimize API calls

### Caching Strategy
- Raw API responses cached in IndexedDB for 24 hours
- Much higher storage quota than localStorage (50MB+)
- Automatic cache expiry and cleanup

### Multi-User Support
- Each user gets their own access token and cache
- No data sharing between users
- Works with any Spotify account

## Building for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production files.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes. Make sure to comply with Spotify's API Terms of Service when using this application.

## Troubleshooting

### "Invalid client" error
- Check that your `VITE_SPOTIFY_CLIENT_ID` is correct
- Ensure the redirect URI in your Spotify app matches exactly: `http://127.0.0.1:3000/callback`
- No Client Secret needed - PKCE flow handles authentication securely

### No songs loading
- Check browser console for API errors
- Verify you have liked songs in your Spotify account
- Try logging out and back in to refresh the access token

### Rate limit errors
- The app handles rate limits automatically
- If you see persistent rate limit errors, wait a few minutes before trying again

### Cache issues
- Clear your browser data for the site
- Click "Refresh Data" button in the app
- Check browser console for IndexedDB errors
