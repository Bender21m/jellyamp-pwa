import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchTracks, getImageUrl, toggleFavorite } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import TrackRow from '../components/TrackRow'

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [album, setAlbum] = useState<BaseItemDto | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    if (!api || !userId || !id) return
    loadAlbum()
  }, [id, api, userId])

  async function loadAlbum() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    try {
      const { data: albumData } = await api.axiosInstance.get(`${api.basePath}/Users/${userId}/Items/${id}`)
      setAlbum(albumData)
      setIsFav(albumData.UserData?.IsFavorite ?? false)

      const tracksRes = await fetchTracks(api, userId, id)
      const mapped: Track[] = (tracksRes.Items ?? []).map((t) => ({
        id: t.Id!,
        name: t.Name ?? 'Unknown',
        indexNumber: t.IndexNumber ?? undefined,
        albumId: id,
        albumName: albumData.Name ?? '',
        artistName: t.AlbumArtist ?? albumData.AlbumArtist ?? '',
        artistId: t.AlbumArtists?.[0]?.Id ?? albumData.AlbumArtists?.[0]?.Id ?? undefined,
        duration: (t.RunTimeTicks ?? 0) / 10000000,
        imageUrl: getImageUrl(serverUrl, id, albumData.ImageTags?.Primary),
        isFavorite: t.UserData?.IsFavorite ?? false,
      }))
      setTracks(mapped)
    } catch (e) {
      console.error('Failed to load album', e)
    }
    setLoading(false)
  }

  async function handleFavorite() {
    if (!api || !userId || !id) return
    try {
      await toggleFavorite(api, userId, id, isFav)
      setIsFav(!isFav)
    } catch (e) {
      console.error('Favorite toggle failed', e)
    }
  }

  function playAll(startIndex = 0) {
    if (tracks.length > 0) setTrack(tracks[startIndex], tracks, startIndex)
  }

  function shufflePlay() {
    if (tracks.length === 0) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    setTrack(shuffled[0], shuffled, 0)
  }

  const imageUrl = album && serverUrl ? getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary, 600) : ''
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)
  const totalMin = Math.round(totalDuration / 60)

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-40 md:pb-28">
        <div className="px-4 md:px-8 pt-5 md:pt-8">
          {/* Back button skeleton */}
          <div className="h-8 w-16 skeleton rounded mb-6" />
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="w-full md:w-[280px] aspect-square skeleton rounded-xl shrink-0 mx-auto md:mx-0 max-w-[280px]" />
            <div className="flex-1 space-y-3">
              <div className="h-8 skeleton rounded w-2/3" />
              <div className="h-5 skeleton rounded w-1/3" />
              <div className="h-4 skeleton rounded w-1/4" />
              <div className="flex gap-3 mt-4">
                <div className="h-10 w-32 skeleton rounded-full" />
                <div className="h-10 w-28 skeleton rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3 min-h-[52px]">
                <div className="w-8 h-4 skeleton rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded w-2/5" />
                </div>
                <div className="w-12 h-4 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!album) return <div className="p-6 text-text-muted">Album not found</div>

  return (
    <div className="h-full overflow-y-auto pb-40 md:pb-28">
      {/* Back button */}
      <div className="px-4 md:px-8 pt-4 md:pt-6">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1 mb-2">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
      </div>

      {/* Hero - stacks on mobile, side by side on desktop */}
      <div className="px-4 md:px-8 pb-6 md:pb-8">
        <div className="flex flex-col md:flex-row gap-5 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[280px] mx-auto md:mx-0 md:w-[280px] aspect-square rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(0,255,221,0.06)' }}
          >
            <img src={imageUrl} alt={album.Name ?? ''} className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex flex-col items-center text-center md:items-start md:text-left justify-end min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Album</p>
            <h1 className="text-2xl md:text-[32px] font-extrabold mb-1 tracking-[-0.03em] leading-tight">{album.Name}</h1>
            {album.AlbumArtist && (
              <Link
                to={album.AlbumArtists?.[0]?.Id ? `/artist/${album.AlbumArtists[0].Id}` : '#'}
                className="text-lg text-text-secondary hover:text-neon-cyan transition-colors"
              >
                {album.AlbumArtist}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-1 text-[13px] text-text-muted font-mono">
              {album.ProductionYear && <span>{album.ProductionYear}</span>}
              <span>·</span>
              <span>{tracks.length} tracks</span>
              <span>·</span>
              <span>{totalMin} min</span>
            </div>
            <div className="flex items-center gap-3 mt-5 flex-wrap justify-center md:justify-start">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => playAll()}
                className="px-6 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
              >
                ▶ Play All
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={shufflePlay}
                className="px-5 py-2.5 rounded-full border border-white/10 text-sm text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
              >
                ⤮ Shuffle
              </motion.button>
              <button
                onClick={handleFavorite}
                className={`p-2.5 rounded-full border border-white/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${isFav ? 'text-neon-pink border-neon-pink/30' : 'text-text-muted hover:text-neon-pink'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFav ? 0 : 2}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 md:px-8 space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            allTracks={tracks}
            showIndex
          />
        ))}
      </div>
    </div>
  )
}
