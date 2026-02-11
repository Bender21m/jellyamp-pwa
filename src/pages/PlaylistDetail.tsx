import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
// virtualization removed — playlist track counts don't need it, and scrollRef was null on mobile init
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchPlaylistTracks, getImageUrl } from '../lib/jellyfin'
import { detectSetBreaks } from '../lib/setBreaks'
import TrackRow from '../components/TrackRow'
import JellyImage from '../components/JellyImage'
import TrackContextMenu from '../components/TrackContextMenu'
import SelectionBar from '../components/SelectionBar'
import SetBreakIndicator from '../components/SetBreakIndicator'
import { useTrackSelection } from '../hooks/useTrackSelection'
import { useTrackKeyboard } from '../hooks/useTrackKeyboard'

type VirtualTrackItem = { type: 'track'; track: Track; index: number } | { type: 'break'; label: string }

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl } = useAuthStore()
  const setTrack = usePlayerStore(s => s.setTrack)
  const addToQueue = usePlayerStore(s => s.addToQueue)
  const [playlist, setPlaylist] = useState<{ name: string; imageUrl?: string } | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [contextTrack, setContextTrack] = useState<Track | null>(null)
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null)
  const trackListRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Multi-select + keyboard nav
  const trackIds = tracks.map(t => t.id)
  const selection = useTrackSelection(trackIds)
  const handlePlayTrack = useCallback((track: Track, index: number) => {
    setTrack(track, tracks, index)
  }, [tracks, setTrack])
  const { focusedIndex } = useTrackKeyboard({
    tracks,
    containerRef: trackListRef,
    selection,
    onPlay: handlePlayTrack,
  })
  const selectedTracks = tracks.filter(t => selection.isSelected(t.id))

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

      const tracksRes = await fetchPlaylistTracks(api, userId, id)
      const mapped: Track[] = (tracksRes.Items ?? []).map((t) => ({
        id: t.Id!,
        name: t.Name ?? 'Unknown',
        albumId: t.AlbumId ?? undefined,
        albumName: t.Album ?? '',
        artistName: t.AlbumArtist ?? t.Artists?.[0] ?? '',
        duration: (t.RunTimeTicks ?? 0) / 10000000,
        imageUrl: t.AlbumId ? getImageUrl(serverUrl, t.AlbumId, t.AlbumPrimaryImageTag, 120) : undefined,
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
      <div className="h-full overflow-y-auto pb-48 md:pb-28">
        <div className="px-4 md:px-8 pt-5 md:pt-8">
          <div className="h-8 w-16 skeleton rounded mb-6" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-48 h-48 skeleton rounded-xl shrink-0 mx-auto md:mx-0" />
            <div className="flex-1 space-y-3">
              <div className="h-8 skeleton rounded w-1/2" />
              <div className="h-4 skeleton rounded w-1/4" />
              <div className="flex gap-3 mt-4">
                <div className="h-10 w-32 skeleton rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto pb-48 md:pb-28">
      {/* Back button */}
      <div className="px-4 md:px-8 pt-4 md:pt-6">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1 mb-2">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 md:px-8 pb-6 md:pb-8">
        <div className="flex flex-col md:flex-row gap-5 md:gap-6">
          <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0 bg-surface ring-1 ring-white/10 mx-auto md:mx-0">
            {playlist?.imageUrl ? (
              <JellyImage src={playlist.imageUrl} width={260} height={260} maxWidth={600} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple/20 to-neon-pink/20">
                <svg viewBox="0 0 24 24" className="w-16 h-16 text-purple" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center text-center md:items-start md:text-left justify-end min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Playlist</p>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2 truncate tracking-[-0.03em] max-w-full">{playlist?.name}</h1>
            <p className="text-[13px] text-text-muted font-mono">{tracks.length} tracks</p>
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => playAll()}
                className="px-6 py-2.5 rounded-full bg-gradient-primary text-deep-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
              >
                ▶ Play All
              </motion.button>
              <button
                onClick={() => addToQueue(tracks)}
                className="px-5 py-2.5 rounded-full border border-white/10 text-sm text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
              >
                Add to Queue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <PlaylistTracks
        tracks={tracks}
        trackListRef={trackListRef}
        selection={selection}
        focusedIndex={focusedIndex}
        onContextMenu={(track, e) => {
          e.preventDefault()
          setContextTrack(track)
          setContextPos({ x: e.clientX, y: e.clientY })
        }}
      />

      <SelectionBar
        selectedCount={selection.selectedIds.size}
        selectedTracks={selectedTracks}
        onClear={selection.clearSelection}
      />

      <TrackContextMenu
        track={contextTrack}
        position={contextPos}
        onClose={() => { setContextTrack(null); setContextPos(null) }}
        playlistId={id}
        onRemoveFromPlaylist={loadPlaylist}
      />
    </div>
  )
}

/* ── Playlist Tracks (plain render) ── */

function PlaylistTracks({ tracks, trackListRef, selection, focusedIndex, onContextMenu }: {
  tracks: Track[]
  trackListRef: React.RefObject<HTMLDivElement | null>
  selection: ReturnType<typeof import('../hooks/useTrackSelection').useTrackSelection>
  focusedIndex: number | null
  onContextMenu: (track: Track, e: React.MouseEvent) => void
}) {
  const items = useMemo<VirtualTrackItem[]>(() => {
    const setBreaks = detectSetBreaks(tracks)
    const result: VirtualTrackItem[] = []
    tracks.forEach((track, i) => {
      const breakBefore = setBreaks.find(b => b.position === i)
      if (breakBefore) result.push({ type: 'break', label: breakBefore.label })
      result.push({ type: 'track', track, index: i })
    })
    return result
  }, [tracks])

  return (
    <div ref={trackListRef} className="px-4 md:px-8" tabIndex={-1}>
      {items.map((item, i) =>
        item.type === 'break' ? (
          <SetBreakIndicator key={`break-${i}`} label={item.label} />
        ) : (
          <TrackRow
            key={item.track.id}
            track={item.track}
            index={item.index}
            allTracks={tracks}
            showIndex
            showArt
            isSelected={selection.isSelected(item.track.id)}
            isFocused={focusedIndex === item.index}
            onSelectionClick={selection.handleClick}
            onContextMenu={(e) => onContextMenu(item.track, e)}
          />
        )
      )}
    </div>
  )
}
