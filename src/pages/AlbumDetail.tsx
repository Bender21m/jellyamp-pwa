import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchTracks, getImageUrl, toggleFavorite } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import TrackRow from '../components/TrackRow'

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>()
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack, addToQueue } = usePlayerStore()
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
      // Fetch album info
      const { data: albumData } = await api.axiosInstance.get(`${api.basePath}/Users/${userId}/Items/${id}`)
      setAlbum(albumData)
      setIsFav(albumData.UserData?.IsFavorite ?? false)

      // Fetch tracks
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

  const imageUrl = album && serverUrl ? getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary, 500) : ''
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)
  const totalMin = Math.round(totalDuration / 60)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      </div>
    )
  }

  if (!album) return <div className="p-6 text-text-muted">Album not found</div>

  return (
    <div className="h-full overflow-y-auto pb-24">
      {/* Hero */}
      <div className="relative px-6 pt-6 pb-8">
        <div className="flex gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-64 h-64 rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(0,255,221,0.06)' }}
          >
            <img src={imageUrl} alt={album.Name ?? ''} className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex flex-col justify-end min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Album</p>
            <h1 className="text-3xl font-extrabold mb-1 truncate tracking-[-0.02em]">{album.Name}</h1>
            {album.AlbumArtist && (
              <Link
                to={album.AlbumArtists?.[0]?.Id ? `/artist/${album.AlbumArtists[0].Id}` : '#'}
                className="text-text-secondary hover:text-neon-cyan transition-colors"
              >
                {album.AlbumArtist}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted font-mono">
              {album.ProductionYear && <span>{album.ProductionYear}</span>}
              <span>·</span>
              <span>{tracks.length} tracks</span>
              <span>·</span>
              <span>{totalMin} min</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => playAll()}
                className="px-6 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
              >
                ▶ Play All
              </motion.button>
              <button
                onClick={() => addToQueue(tracks)}
                className="px-4 py-2.5 rounded-full border border-white/10 text-sm text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
              >
                Add to Queue
              </button>
              <button
                onClick={handleFavorite}
                className={`p-2.5 rounded-full border border-white/10 transition-all ${isFav ? 'text-neon-pink border-neon-pink/30' : 'text-text-muted hover:text-neon-pink'}`}
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
      <div className="px-6 space-y-0.5">
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
