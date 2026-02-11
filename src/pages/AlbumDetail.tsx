import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchTracks, getImageUrl, toggleFavorite } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { useAlbumColors } from '../hooks/useAlbumColors'
import JellyImage from '../components/JellyImage'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { parseShowDate, formatShowDate } from '../lib/dateParser'
import { parseVenue } from '../lib/venueParser'
import { detectSetBreaks } from '../lib/setBreaks'
import { cacheAlbumTracks, removeAlbumFromCache, isAlbumCached, type CacheProgress } from '../lib/offlineCache'
import TrackRow from '../components/TrackRow'
import TrackContextMenu from '../components/TrackContextMenu'
import SelectionBar from '../components/SelectionBar'
import SetBreakIndicator from '../components/SetBreakIndicator'
import EmptyState from '../components/EmptyState'
import { useTrackSelection } from '../hooks/useTrackSelection'
import { useTrackKeyboard } from '../hooks/useTrackKeyboard'

type VirtualTrackItem = { type: 'track'; track: Track; index: number } | { type: 'break'; label: string }

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl } = useAuthStore()
  const setTrack = usePlayerStore(s => s.setTrack)
  const setRadioMode = usePlayerStore(s => s.setRadioMode)
  const [album, setAlbum] = useState<BaseItemDto | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [contextTrack, setContextTrack] = useState<Track | null>(null)
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null)
  const [isAlbumCachedState, setIsAlbumCachedState] = useState(false)
  const [cacheProgress, setCacheProgress] = useState<CacheProgress | null>(null)
  const [showCacheProgress, setShowCacheProgress] = useState(false)

  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const trackListRef = useRef<HTMLDivElement>(null)
  useScrollRestore(scrollContainerRef)

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
    loadAlbum()
  }, [id, api, userId])

  async function loadAlbum() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    setError(null)
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

      // Check if album is cached
      const cached = await isAlbumCached(id)
      setIsAlbumCachedState(cached)
    } catch (e) {
      console.error('Failed to load album', e)
      setError('Failed to load album. Please try again.')
      setAlbum(null)
      setTracks([])
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

  async function handleCacheToggle() {
    if (!id || !serverUrl) return

    if (isAlbumCachedState) {
      // Remove from cache
      try {
        await removeAlbumFromCache(id, serverUrl)
        setIsAlbumCachedState(false)
      } catch (error) {
        console.error('Failed to remove album from cache:', error)
      }
    } else {
      // Add to cache
      if (tracks.length === 0) return
      
      setShowCacheProgress(true)
      
      try {
        await cacheAlbumTracks(
          tracks, 
          serverUrl, 
          id,
          (progress) => setCacheProgress(progress)
        )
        setIsAlbumCachedState(true)
        setShowCacheProgress(false)
        setCacheProgress(null)
      } catch (error) {
        console.error('Failed to cache album:', error)
        setShowCacheProgress(false)
        setCacheProgress(null)
      }
    }
  }

  const imageUrl = album && serverUrl ? getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary, 600) : ''
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)
  const totalMin = Math.round(totalDuration / 60)
  
  // Extract colors from album art
  const { colors: albumColors } = useAlbumColors(imageUrl)

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-48 md:pb-28 px-5 md:px-8 pt-6">
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

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-5 md:px-8 pt-5 md:pt-6 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-5"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            }
            title="Something went wrong"
            subtitle={error}
            action={{
              label: "Try again",
              onClick: () => loadAlbum()
            }}
          />
        </div>
      </div>
    )
  }

  if (!album) return <div className="p-6 text-text-muted">Album not found</div>

  const artistId = album.AlbumArtists?.[0]?.Id

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto pb-48 md:pb-28 relative">
      {/* Color gradient overlay */}
      {albumColors && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${albumColors.primary}40 0%, ${albumColors.secondary}30 50%, transparent 100%)`
          }}
        />
      )}
      
      <div className="px-5 md:px-8 pt-5 md:pt-6 relative z-10">
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
            <JellyImage src={imageUrl} width={260} height={260} maxWidth={600} alt={album.Name ?? ''} className="w-full h-full" />
          </motion.div>

          {/* Info */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1 min-w-0 gap-1">
            <h1 className="text-xl md:text-3xl font-extrabold tracking-[-0.02em] leading-tight">
              {album.Name}
            </h1>

            {/* Show Date - only display if parsed from album name */}
            {(() => {
              const showDate = parseShowDate(album.Name ?? '');
              if (!showDate) return null;
              return (
                <div className="text-xs text-text-muted font-mono bg-white/5 px-2 py-1 rounded-md border border-white/10 mt-1">
                  {formatShowDate(showDate)}
                </div>
              );
            })()}

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

            {/* Venue - only show if venue data exists */}
            {(() => {
              const venue = parseVenue(album);
              if (!venue) return null;
              return (
                <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono mt-2">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>{venue}</span>
                </div>
              );
            })()}

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
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (id && tracks.length > 0) {
                    setTrack(tracks[0], tracks, 0)
                    setRadioMode(true, id)
                  }
                }}
                className="h-11 inline-flex items-center gap-2.5 px-6 rounded-full border border-white/10 text-sm text-text-secondary whitespace-nowrap hover:text-text-primary hover:border-white/20 transition-all"
              >
                <span className="text-base leading-none">∞</span>
                Radio
              </motion.button>
              <button
                onClick={handleFavorite}
                className={`h-11 w-11 rounded-full border border-white/10 transition-all flex items-center justify-center ${isFav ? 'text-neon-pink border-neon-pink/30' : 'text-text-muted hover:text-neon-pink'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFav ? 0 : 2.5}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <button
                onClick={handleCacheToggle}
                disabled={showCacheProgress}
                className={`h-11 w-11 rounded-full border transition-all flex items-center justify-center ${
                  isAlbumCachedState
                    ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-white/10 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/30'
                } ${showCacheProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isAlbumCachedState ? 'Remove from offline cache' : 'Download for offline playback'}
              >
                {showCacheProgress ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" fill="currentColor">
                    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d={isAlbumCachedState 
                      ? "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" // Check mark when cached
                      : "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" // Download icon when not cached
                    } />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <TrackList
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
      />

      {/* Cache Progress Overlay */}
      <AnimatePresence>
        {showCacheProgress && cacheProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-deep-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Downloading for Offline</h3>
                <p className="text-sm text-text-muted mb-4">
                  {cacheProgress.status === 'downloading' && `${cacheProgress.currentTrack}`}
                  {cacheProgress.status === 'completed' && 'Download completed!'}
                  {cacheProgress.status === 'error' && 'Download failed'}
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cacheProgress.completed / cacheProgress.total) * 100}%` }}
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                  />
                </div>
                
                <p className="text-xs text-text-muted font-mono">
                  {cacheProgress.completed} / {cacheProgress.total} tracks
                </p>
                
                {cacheProgress.status === 'completed' && (
                  <button
                    onClick={() => setShowCacheProgress(false)}
                    className="mt-4 px-4 py-2 bg-gradient-primary text-deep-black rounded-lg font-semibold"
                  >
                    Done
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Track List (plain render — album track counts don't need virtualization) ── */

function TrackList({ tracks, trackListRef, selection, focusedIndex, onContextMenu }: {
  tracks: Track[]
  trackListRef: React.RefObject<HTMLDivElement | null>
  selection: { isSelected: (id: string) => boolean; handleClick: (id: string, index: number, e: React.MouseEvent) => void }
  focusedIndex: number | null
  onContextMenu: (track: Track, e: React.MouseEvent) => void
}) {
  const items = useMemo(() => {
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
    <div ref={trackListRef} className="px-4 md:px-8 pr-6 md:pr-8" tabIndex={-1}>
      <div className="border-t border-white/5 pt-4">
        {items.map((item, i) =>
          item.type === 'break' ? (
            <SetBreakIndicator key={`break-${i}`} label={item.label} />
          ) : (
            <div key={item.track.id} className={item.index < tracks.length - 1 ? 'border-b border-white/5' : ''}>
              <TrackRow
                track={item.track}
                index={item.index}
                allTracks={tracks}
                showIndex
                isSelected={selection.isSelected(item.track.id)}
                isFocused={focusedIndex === item.index}
                onSelectionClick={selection.handleClick}
                onContextMenu={(e) => onContextMenu(item.track, e)}
              />
            </div>
          )
        )}
      </div>
    </div>
  )
}
