import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchTracks, getImageUrl } from '../lib/jellyfin'
import TrackRow from '../components/TrackRow'

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack, addToQueue } = usePlayerStore()
  const [playlist, setPlaylist] = useState<{ name: string; imageUrl?: string } | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || !userId || !id) return
    loadPlaylist()
  }, [id, api, userId])

  async function loadPlaylist() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    try {
      const { data: plData } = await api.axiosInstance.get(`${api.basePath}/Users/${userId}/Items/${id}`)
      setPlaylist({
        name: plData.Name ?? 'Playlist',
        imageUrl: plData.ImageTags?.Primary ? getImageUrl(serverUrl, id, plData.ImageTags.Primary, 400) : undefined,
      })

      const tracksRes = await fetchTracks(api, userId, id)
      const mapped: Track[] = (tracksRes.Items ?? []).map((t) => ({
        id: t.Id!,
        name: t.Name ?? 'Unknown',
        albumId: t.AlbumId ?? undefined,
        albumName: t.Album ?? '',
        artistName: t.AlbumArtist ?? t.Artists?.[0] ?? '',
        duration: (t.RunTimeTicks ?? 0) / 10000000,
        imageUrl: t.AlbumId ? getImageUrl(serverUrl, t.AlbumId, t.AlbumPrimaryImageTag, 100) : undefined,
        playlistItemId: t.PlaylistItemId ?? undefined,
      }))
      setTracks(mapped)
    } catch (e) {
      console.error('Failed to load playlist', e)
    }
    setLoading(false)
  }

  function playAll(startIndex = 0) {
    if (tracks.length > 0) setTrack(tracks[startIndex], tracks, startIndex)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-24">
      {/* Hero */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex gap-6">
          <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0 bg-surface ring-1 ring-white/10">
            {playlist?.imageUrl ? (
              <img src={playlist.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple/20 to-neon-pink/20">
                <svg viewBox="0 0 24 24" className="w-16 h-16 text-purple" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-end min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Playlist</p>
            <h1 className="text-3xl font-extrabold mb-2 truncate">{playlist?.name}</h1>
            <p className="text-xs text-text-muted font-mono">{tracks.length} tracks</p>
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
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="px-6 space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow key={`${track.id}-${i}`} track={track} index={i} allTracks={tracks} showIndex showArt />
        ))}
      </div>
    </div>
  )
}
