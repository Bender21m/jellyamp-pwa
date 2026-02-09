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
      // Gather tracks from all albums
      const allTracks: Track[] = []
      for (const album of albums) {
        const tracksRes = await fetchTracks(api, userId, album.Id!)
        const mapped = (tracksRes.Items ?? []).map((t) => ({
          id: t.Id!,
          name: t.Name ?? 'Unknown',
          albumId: album.Id!,
          albumName: album.Name ?? '',
          artistName: artist?.Name ?? '',
          duration: (t.RunTimeTicks ?? 0) / 10000000,
          imageUrl: getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary),
        }))
        allTracks.push(...mapped)
      }
      if (allTracks.length > 0) setTrack(allTracks[0], allTracks, 0)
    } catch (e) {
      console.error('Play all failed', e)
    }
  }

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const artistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 400)
    : null

  // Use first album art as fallback backdrop
  const backdropUrl = albums.length > 0 && serverUrl
    ? getImageUrl(serverUrl, albums[0].Id!, albums[0].ImageTags?.Primary, 600)
    : null

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-40 md:pb-28 px-4 md:px-8 pt-6">
        <div className="flex gap-6 mb-8">
          <div className="w-40 h-40 md:w-52 md:h-52 skeleton rounded-xl shrink-0" />
          <div className="flex flex-col justify-end gap-3 flex-1">
            <div className="h-4 skeleton rounded w-16" />
            <div className="h-10 skeleton rounded w-2/3" />
            <div className="h-4 skeleton rounded w-24" />
            <div className="h-10 skeleton rounded-full w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square skeleton rounded-xl mb-3" />
              <div className="h-4 skeleton rounded w-3/4 mb-2" />
              <div className="h-3.5 skeleton rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!artist) return <div className="p-6 text-text-muted">Artist not found</div>

  const totalAlbums = albums.length
  const trackCountText = `${totalAlbums} album${totalAlbums !== 1 ? 's' : ''}`

  return (
    <div className="h-full overflow-y-auto pb-40 md:pb-28">
      {/* Artist header — clean card-style layout, not hero blowup */}
      <div className="relative overflow-hidden">
        {/* Subtle blurred backdrop from album art */}
        {backdropUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover scale-150 blur-[80px] opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-b from-deep-black/40 to-deep-black" />
          </div>
        )}

        <div className="relative px-4 md:px-8 pt-6 md:pt-10 pb-6 md:pb-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back
          </button>

          <div className="flex gap-5 md:gap-8 items-start">
            {/* Artist image or gradient placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-36 h-36 md:w-52 md:h-52 rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10"
            >
              {artistImage ? (
                <img src={artistImage} alt={artist.Name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neon-cyan/20 via-purple/20 to-neon-pink/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-text-muted/30" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex flex-col justify-end min-w-0 py-1">
              <p className="text-xs font-mono uppercase tracking-widest text-neon-cyan/70 mb-1.5">Artist</p>
              <h1 className="text-2xl md:text-4xl lg:text-[42px] font-black tracking-[-0.03em] leading-tight mb-2">
                {artist.Name}
              </h1>
              <p className="text-sm text-text-muted font-mono mb-4">{trackCountText}</p>
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={playAll}
                  className="px-7 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_24px_rgba(0,255,221,0.3)] transition-shadow"
                >
                  ▶ Play All
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playAll()
                    // TODO: shuffle mode
                  }}
                  className="px-5 py-2.5 rounded-full border border-white/10 text-sm text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
                >
                  ⟳ Shuffle
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discography */}
      <div className="px-4 md:px-8 pt-4 md:pt-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold tracking-[-0.02em]">Discography</h2>
          <span className="text-xs text-text-muted font-mono">{totalAlbums} release{totalAlbums !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6">
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
