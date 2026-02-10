import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchTracks, getImageUrl, toggleFavorite } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import TrackRow from '../components/TrackRow'
import TrackContextMenu from '../components/TrackContextMenu'

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [album, setAlbum] = useState<BaseItemDto | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)
  const [contextTrack, setContextTrack] = useState<Track | null>(null)
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null)

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
      <div className="h-full overflow-y-auto pb-40 md:pb-28 px-5 md:px-8 pt-6">
        <div className="h-6 w-12 skeleton rounded mb-4" />
        <div className="flex flex-col items-center md:flex-row md:items-end gap-6 md:gap-8 mb-10">
          <div className="w-[220px] md:w-[260px] aspect-square skeleton rounded-2xl shrink-0" />
          <div className="flex flex-col items-center md:items-start gap-3 flex-1 w-full">
            <div className="h-8 skeleton rounded w-2/3" />
            <div className="h-5 skeleton rounded w-1/3" />
            <div className="h-4 skeleton rounded w-1/4" />
            <div className="flex gap-3 mt-2">
              <div className="h-11 skeleton rounded-full w-28" />
              <div className="h-11 skeleton rounded-full w-24" />
              <div className="h-11 w-11 skeleton rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-3 min-h-[52px]">
              <div className="w-6 h-4 skeleton rounded" />
              <div className="flex-1"><div className="h-4 skeleton rounded w-2/5" /></div>
              <div className="w-10 h-4 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!album) return <div className="p-6 text-text-muted">Album not found</div>

  const artistId = album.AlbumArtists?.[0]?.Id

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      <div className="px-5 md:px-8 pt-5 md:pt-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-5"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back
        </button>

        {/* Hero */}
        <div className="flex flex-col items-center md:flex-row md:items-end gap-6 md:gap-8 mb-8 md:mb-10">
          {/* Art */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[220px] md:w-[260px] aspect-square rounded-2xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10"
          >
            <img src={imageUrl} alt={album.Name ?? ''} className="w-full h-full object-cover" />
          </motion.div>

          {/* Info */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1 min-w-0 gap-1">
            <h1 className="text-xl md:text-3xl font-extrabold tracking-[-0.02em] leading-tight">
              {album.Name}
            </h1>

            {album.AlbumArtist && (
              <Link
                to={artistId ? `/artist/${artistId}` : '#'}
                className="text-[15px] text-text-secondary hover:text-neon-cyan transition-colors mt-0.5"
              >
                {album.AlbumArtist}
              </Link>
            )}

            <p className="text-xs text-text-muted font-mono mt-1">
              {[
                album.ProductionYear,
                `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`,
                `${totalMin} min`,
              ].filter(Boolean).join(' · ')}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start self-stretch">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => playAll()}
                className="h-11 inline-flex items-center gap-2 rounded-full bg-gradient-primary text-deep-black font-bold text-sm whitespace-nowrap shrink-0"
                style={{ paddingLeft: '1.75rem', paddingRight: '1.75rem' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                <span>Play All</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={shufflePlay}
                className="h-11 inline-flex items-center gap-2.5 px-6 rounded-full border border-white/10 text-sm text-text-secondary whitespace-nowrap hover:text-text-primary hover:border-white/20 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                Shuffle
              </motion.button>
              <button
                onClick={handleFavorite}
                className={`h-11 w-11 rounded-full border border-white/10 transition-all flex items-center justify-center ${isFav ? 'text-neon-pink border-neon-pink/30' : 'text-text-muted hover:text-neon-pink'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFav ? 0 : 2.5}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="px-4 md:px-8 pr-6 md:pr-8">
        <div className="border-t border-white/5 pt-4">
          {tracks.map((track, i) => (
            <div key={track.id} className={i < tracks.length - 1 ? 'border-b border-white/5' : ''}>
              <TrackRow
                track={track}
                index={i}
                allTracks={tracks}
                showIndex
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextTrack(track)
                  setContextPos({ x: e.clientX, y: e.clientY })
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <TrackContextMenu
        track={contextTrack}
        position={contextPos}
        onClose={() => { setContextTrack(null); setContextPos(null) }}
      />
    </div>
  )
}
