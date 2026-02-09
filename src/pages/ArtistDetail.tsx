import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchAlbums, fetchTracks, getImageUrl, fetchArtistById } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const artistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 800)
    : null

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-40 md:pb-28">
        <div className="h-48 md:h-72 skeleton" />
        <div className="px-4 md:px-8 pt-6 space-y-4">
          <div className="h-8 skeleton rounded w-1/3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6 lg:gap-7 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-xl mb-3" />
                <div className="h-4 skeleton rounded w-3/4 mb-2" />
                <div className="h-3.5 skeleton rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!artist) return <div className="p-6 text-text-muted">Artist not found</div>

  return (
    <div className="h-full overflow-y-auto pb-40 md:pb-28">
      {/* Hero banner */}
      <div className="relative h-48 md:h-72 overflow-hidden">
        {artistImage ? (
          <>
            <img src={artistImage} alt="" className="w-full h-full object-cover scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/50 to-deep-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-deep-black/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-cyan/10 via-purple/15 to-neon-pink/10" />
        )}

        {/* Back button */}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 text-white/70 hover:text-white transition-colors p-2 rounded-full bg-black/30 backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-5 md:pb-6">
          <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Artist</p>
          <h1 className="text-3xl md:text-[40px] font-black mb-3 tracking-[-0.03em] leading-tight">{artist.Name}</h1>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={playAll}
              className="px-6 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
            >
              ▶ Play All
            </motion.button>
            <span className="text-[13px] text-text-muted font-mono">{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Albums */}
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Discography</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6 lg:gap-7">
          {albums.map((a, i) => (
            <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
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
