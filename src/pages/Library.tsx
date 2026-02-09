import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { getItemsApi } from '../lib/jellyfin'
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models'

interface Album {
  id: string
  name: string
  artistName: string
  imageUrl: string
  year?: number
}

export default function Library() {
  const { api, userId, username, logout, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])

  useEffect(() => {
    if (!api || !userId) return
    fetchAlbums()
  }, [api, userId])

  async function fetchAlbums() {
    if (!api || !userId) return
    setLoading(true)
    try {
      const itemsApi = getItemsApi(api)
      const { data } = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.MusicAlbum],
        recursive: true,
        sortBy: ['DateCreated'],
        sortOrder: ['Descending'],
        limit: 100,
        fields: ['PrimaryImageAspectRatio'],
      })

      const mapped: Album[] = (data.Items ?? []).map((item) => ({
        id: item.Id!,
        name: item.Name ?? 'Unknown Album',
        artistName: item.AlbumArtist ?? 'Unknown Artist',
        imageUrl: `${serverUrl}/Items/${item.Id}/Images/Primary?maxWidth=300&quality=90`,
        year: item.ProductionYear ?? undefined,
      }))
      setAlbums(mapped)
    } catch (e) {
      console.error('Failed to fetch albums', e)
    }
    setLoading(false)
  }

  async function fetchAlbumTracks(album: Album) {
    if (!api || !userId) return
    setSelectedAlbum(album)
    try {
      const itemsApi = getItemsApi(api)
      const { data } = await itemsApi.getItems({
        userId,
        parentId: album.id,
        includeItemTypes: [BaseItemKind.Audio],
        sortBy: ['SortName'],
        sortOrder: ['Ascending'],
      })

      const mapped: Track[] = (data.Items ?? []).map((item) => ({
        id: item.Id!,
        name: item.Name ?? 'Unknown',
        albumId: album.id,
        albumName: album.name,
        artistName: item.AlbumArtist ?? album.artistName,
        duration: item.RunTimeTicks ?? 0,
        imageUrl: album.imageUrl,
      }))
      setTracks(mapped)
    } catch (e) {
      console.error('Failed to fetch tracks', e)
    }
  }

  function playTrack(track: Track, index: number) {
    setTrack(track, tracks, index)
  }

  function formatDuration(ticks: number) {
    const seconds = Math.floor(ticks / 10000000)
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col bg-deep-black">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-text-muted/10">
        <div className="flex items-center gap-3">
          {selectedAlbum && (
            <button
              onClick={() => setSelectedAlbum(null)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-bold text-gradient">
            {selectedAlbum ? selectedAlbum.name : 'Library'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-sm font-mono">{username}</span>
          <button
            onClick={logout}
            className="text-text-muted text-xs font-mono uppercase tracking-wider hover:text-neon-pink transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : selectedAlbum ? (
          /* Track list */
          <div>
            <div className="flex gap-6 mb-8">
              <img
                src={selectedAlbum.imageUrl}
                alt={selectedAlbum.name}
                className="w-48 h-48 rounded-xl object-cover shadow-2xl"
              />
              <div className="flex flex-col justify-end">
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-1">Album</p>
                <h2 className="text-3xl font-extrabold mb-1">{selectedAlbum.name}</h2>
                <p className="text-text-secondary">{selectedAlbum.artistName}</p>
                {selectedAlbum.year && (
                  <p className="text-text-muted text-sm mt-1">{selectedAlbum.year}</p>
                )}
                <button
                  onClick={() => tracks.length > 0 && playTrack(tracks[0], 0)}
                  className="mt-4 px-6 py-2 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm w-fit hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
                >
                  ▶ Play All
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {tracks.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => playTrack(track, i)}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-surface cursor-pointer group transition-colors"
                >
                  <span className="text-text-muted text-sm w-6 text-right font-mono group-hover:text-neon-cyan">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary truncate group-hover:text-neon-cyan transition-colors">
                      {track.name}
                    </p>
                    <p className="text-text-muted text-sm truncate">{track.artistName}</p>
                  </div>
                  <span className="text-text-muted text-sm font-mono">
                    {formatDuration(track.duration)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* Album grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {albums.map((album, i) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.4 }}
                onClick={() => fetchAlbumTracks(album)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-card">
                  <img
                    src={album.imageUrl}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-sm font-semibold truncate group-hover:text-neon-cyan transition-colors">
                  {album.name}
                </h3>
                <p className="text-xs text-text-muted truncate">{album.artistName}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
