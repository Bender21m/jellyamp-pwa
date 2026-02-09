import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchAlbums, fetchTracks, getImageUrl, fetchArtistById } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [artist, setArtist] = useState<BaseItemDto | null>(null)
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || !userId || !id) return
    loadArtist()
  }, [id, api, userId])

  async function loadArtist() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    try {
      const [artistData, albumsRes] = await Promise.all([
        fetchArtistById(api, userId, id),
        fetchAlbums(api, userId, { artistIds: [id], limit: 100 }),
      ])
      setArtist(artistData)
      setAlbums(albumsRes.Items ?? [])
    } catch (e) {
      console.error('Failed to load artist', e)
    }
    setLoading(false)
  }

  async function playAll() {
    if (!api || !userId || !serverUrl || albums.length === 0) return
    try {
      // Fetch tracks from first album and play
      const firstAlbum = albums[0]
      const tracksRes = await fetchTracks(api, userId, firstAlbum.Id!)
      const mapped: Track[] = (tracksRes.Items ?? []).map((t) => ({
        id: t.Id!,
        name: t.Name ?? 'Unknown',
        albumId: firstAlbum.Id!,
        albumName: firstAlbum.Name ?? '',
        artistName: artist?.Name ?? '',
        duration: (t.RunTimeTicks ?? 0) / 10000000,
        imageUrl: getImageUrl(serverUrl, firstAlbum.Id!, firstAlbum.ImageTags?.Primary),
      }))
      if (mapped.length > 0) setTrack(mapped[0], mapped, 0)
    } catch (e) {
      console.error('Play all failed', e)
    }
  }

  const imgUrl = (item: BaseItemDto, size = 300) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const artistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 600)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      </div>
    )
  }

  if (!artist) return <div className="p-6 text-text-muted">Artist not found</div>

  return (
    <div className="h-full overflow-y-auto pb-24">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        {artistImage ? (
          <>
            <img src={artistImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-pink/20 to-purple/20" />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Artist</p>
          <h1 className="text-4xl font-extrabold mb-2">{artist.Name}</h1>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={playAll}
              className="px-6 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
            >
              ▶ Play All
            </motion.button>
            <span className="text-xs text-text-muted font-mono">{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Albums */}
      <div className="px-6 pt-6">
        <h2 className="text-lg font-bold mb-4">Discography</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {albums.map((a, i) => (
            <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <AlbumCard
                id={a.Id!}
                name={a.Name ?? 'Unknown'}
                artistName={a.AlbumArtist ?? artist.Name ?? ''}
                imageUrl={imgUrl(a)}
                year={a.ProductionYear ?? undefined}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
