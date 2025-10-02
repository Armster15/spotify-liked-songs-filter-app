import React, { useState } from 'react';

interface TrackWithGenres {
  track: {
    id: string;
    name: string;
    uri: string;
    artists: { name: string }[];
  };
  genres: string[];
}

interface ExportPlaylistProps {
  filteredSongs: TrackWithGenres[];
  selectedGenre: string;
  onExport: (playlistName: string, description: string) => Promise<void>;
}

export const ExportPlaylist: React.FC<ExportPlaylistProps> = ({
  filteredSongs,
  selectedGenre,
  onExport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim()) return;

    setIsExporting(true);
    try {
      await onExport(playlistName.trim(), description.trim());
      setIsOpen(false);
      setPlaylistName('');
      setDescription('');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    if (selectedGenre && isOpen) {
      const suggestedName = `${selectedGenre} - Liked Songs`;
      const suggestedDescription = `Songs from my liked music filtered by genre: ${selectedGenre}`;
      setPlaylistName(suggestedName);
      setDescription(suggestedDescription);
    } else if (isOpen && !selectedGenre) {
      setPlaylistName('All Liked Songs');
      setDescription('All songs from my liked music');
    }
  }, [selectedGenre, isOpen]);

  if (filteredSongs.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          backgroundColor: '#1db954',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '25px',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
          marginBottom: '20px'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#1ed760';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#1db954';
        }}
      >
        📝 Export to Playlist ({filteredSongs.length} songs)
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#282828',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              border: '1px solid #404040'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#1db954', marginBottom: '20px', fontSize: '24px' }}>
              Create Playlist
            </h2>

            <div style={{ marginBottom: '20px', color: '#b3b3b3' }}>
              <p>Creating a playlist with {filteredSongs.length} songs</p>
              {selectedGenre && <p>Genre filter: <strong>{selectedGenre}</strong></p>}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="playlist-name"
                  style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px' }}
                >
                  Playlist Name *
                </label>
                <input
                  id="playlist-name"
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  required
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    backgroundColor: '#121212',
                    color: 'white',
                    fontSize: '14px'
                  }}
                  placeholder="Enter playlist name"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="playlist-description"
                  style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px' }}
                >
                  Description (Optional)
                </label>
                <textarea
                  id="playlist-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    backgroundColor: '#121212',
                    color: 'white',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="Enter playlist description"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isExporting}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #404040',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#b3b3b3',
                    fontSize: '14px',
                    cursor: isExporting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!playlistName.trim() || isExporting}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isExporting || !playlistName.trim() ? '#404040' : '#1db954',
                    color: 'white',
                    fontSize: '14px',
                    cursor: isExporting || !playlistName.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isExporting ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};