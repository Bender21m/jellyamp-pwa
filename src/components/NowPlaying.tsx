import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { useAlbumColors } from '../hooks/useAlbumColors'
import { toggleFavorite } from '../lib/jellyfin'
import LyricsView from './LyricsView'
import Waveform from './Waveform'

export default function NowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration, shuffle, repeat, showNowPlaying,
    queue, queueIndex,
    toggle, next, previous, seek, toggleShuffle, cycleRepeat, setShowNowPlaying, setShowQueue,
  } = usePlayerStore()
  const { api, userId } = useAuthStore()
  const navigate = useNavigate()
  const [showLyrics, setShowLyrics] = useState(false)

  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])

  // Track favorite state — sync from currentTrack, allow local optimistic toggle
  const [localFavOverride, setLocalFavOverride] = useState<{ trackId: string; isFav: boolean } | null>(null)
  const trackIsFav = localFavOverride !== null && localFavOverride.trackId === currentTrack?.id
    ? localFavOverride.isFav
    : (currentTrack?.isFavorite ?? false)
  
  // Extract colors from current track album art
  const { colors: trackColors } = useAlbumColors(currentTrack?.imageUrl)

  async function handleFavorite() {
    if (!api || !userId || !currentTrack) return
    const newFav = !trackIsFav
    // Optimistic update
    setLocalFavOverride({ trackId: currentTrack.id, isFav: newFav })
    try {
      await toggleFavorite(api, userId, currentTrack.id, trackIsFav)
      // Also update the track in the player store queue so it persists
      const { queue } = usePlayerStore.getState()
      const updatedQueue = queue.map(t => t.id === currentTrack.id ? { ...t, isFavorite: newFav } : t)
      const updatedTrack = { ...currentTrack, isFavorite: newFav }
      usePlayerStore.setState({ queue: updatedQueue, currentTrack: updatedTrack })
    } catch {
      // Revert on error
      setLocalFavOverride({ trackId: currentTrack.id, isFav: trackIsFav })
    }
  }

  // calcProgress removed - handled by Waveform component

  // Removed unused progress handlers - using Waveform component now

  // Mouse drag for desktop (REMOVED - using Waveform component)
  /*const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    setIsDraggingProgress(true)
    const pct = calcProgress(e.clientX)
    setDragProgress(pct)
    setCurrentTime(pct * duration)
    const onMove = (me: MouseEvent) => {
      const p = calcProgress(me.clientX)
      setDragProgress(p)
      setCurrentTime(p * duration)
    }
    const onUp = (me: MouseEvent) => {
      const p = calcProgress(me.clientX)
      seek(p * duration)
      setIsDraggingProgress(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, seek, setCurrentTime, calcProgress])

  // Touch drag for mobile
  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return
    e.stopPropagation() // prevent swipe-to-dismiss
    setIsDraggingProgress(true)
    const touch = e.touches[0]
    const pct = calcProgress(touch.clientX)
    setDragProgress(pct)
    setCurrentTime(pct * duration)
  }, [duration, setCurrentTime, calcProgress])

  const handleProgressTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingProgress || !duration) return
    e.stopPropagation()
    const touch = e.touches[0]
    const pct = calcProgress(touch.clientX)
    setDragProgress(pct)
    setCurrentTime(pct * duration)
  }, [isDraggingProgress, duration, setCurrentTime, calcProgress])

  const handleProgressTouchEnd = useCallback(() => {
    if (!isDraggingProgress || !duration) return
    seek(dragProgress * duration)
    setIsDraggingProgress(false)
  }, [isDraggingProgress, dragProgress, duration, seek])*/

  function handlePanEnd(_: any, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      setShowNowPlaying(false)
    }
  }

  function formatTime(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function handleArtistClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.artistId) {
      navigate(`/artist/${currentTrack.artistId}`)
    }
  }

  function handleAlbumClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.albumId) {
      navigate(`/album/${currentTrack.albumId}`)
    }
  }

  if (!currentTrack) return null

  // Progress calculation moved to Waveform component
  const nextTrack = queue[queueIndex + 1] ?? null

  return (
    <AnimatePresence>
      {showNowPlaying && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ y, opacity }}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-deep-black"
        >
          {/* Blurred album art background */}
          <div className="absolute inset-0">
            {currentTrack.imageUrl && (
              <motion.img
                key={currentTrack.id + '-bg'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ duration: 0.8 }}
                src={currentTrack.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-[100px] scale-125 saturate-150"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-deep-black/60 via-deep-black/80 to-deep-black/95" />
            
            {/* Color tint overlay */}
            {trackColors && (
              <motion.div
                key={currentTrack.id + '-color'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${trackColors.primary}40 0%, ${trackColors.secondary}30 50%, transparent 100%)`
                }}
              />
            )}
            
            {/* Noise texture */}
            <div className="absolute inset-0 noise-overlay opacity-[0.03]" />
          </div>

          {/* Top bar — draggable to dismiss */}
          <motion.div
            className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 md:pt-6 md:px-8 cursor-grab active:cursor-grabbing touch-none"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handlePanEnd}
          >
            <button
              onClick={() => setShowNowPlaying(false)}
              className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-mono">Now Playing</p>
            </div>

            <button
              onClick={() => { setShowNowPlaying(false); setShowQueue(true) }}
              className="p-2 -mr-2 text-white/60 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
              </svg>
            </button>
          </motion.div>

          {/* Drag handle - mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 md:hidden z-20" />

          {/* Main content area — scrollable on mobile */}
          <div className="relative z-10 flex-1 flex flex-col items-center px-6 md:px-12 max-w-2xl mx-auto w-full overflow-y-auto overscroll-contain pt-4 md:pt-0 md:justify-center pb-8">
            {/* Album Art */}
            <motion.div
              key={currentTrack.id}
              initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-[60vw] md:w-[72vw] aspect-square max-w-[360px] rounded-2xl overflow-hidden mb-6 md:mb-10 relative group shrink-0"
              style={{ boxShadow: '0 20px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 255, 221, 0.08), 0 0 120px rgba(139, 92, 246, 0.06)' }}
            >
              {currentTrack.imageUrl ? (
                <img src={currentTrack.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-20 h-20 text-text-muted/30" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
            </motion.div>

            {/* Track Info + Favorite */}
            <div className="w-full flex items-start gap-3 mb-6">
              <div className="flex-1 min-w-0 text-center">
                <motion.h2
                  key={currentTrack.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl md:text-2xl font-bold truncate leading-tight"
                >
                  {currentTrack.name}
                </motion.h2>
                {currentTrack.artistName && (
                  <button
                    onClick={handleArtistClick}
                    className="text-white/60 hover:text-neon-cyan mt-1.5 truncate text-[15px] transition-colors cursor-pointer block"
                    title={`Go to ${currentTrack.artistName}`}
                  >
                    {currentTrack.artistName}
                  </button>
                )}
                {currentTrack.albumName && (
                  <button
                    onClick={handleAlbumClick}
                    className="text-white/35 hover:text-neon-cyan text-[13px] mt-0.5 truncate transition-colors cursor-pointer block"
                    title={`Go to ${currentTrack.albumName}`}
                  >
                    {currentTrack.albumName}
                  </button>
                )}
              </div>
              <button
                onClick={handleFavorite}
                className={`p-2 shrink-0 mt-0.5 transition-colors ${trackIsFav ? 'text-neon-pink' : 'text-white/30 hover:text-neon-pink/70'}`}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={trackIsFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={trackIsFav ? 0 : 2}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>

            {/* Waveform progress */}
            <div className="w-full mb-4">
              <div className="h-8 mb-3">
                <Waveform
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={(time) => {
                    seek(time)
                    // Dispatch event so Player.tsx can sync audio element
                    window.dispatchEvent(new CustomEvent('jellyamp-seek', { detail: { time } }))
                  }}
                  trackId={currentTrack?.id}
                  className="h-full"
                  barCount={90}
                  showTooltip={true}
                />
              </div>
              <div className="flex justify-between text-[11px] text-white/40 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 md:gap-5 w-full max-w-xs">
              <button
                onClick={toggleShuffle}
                className={`p-3 transition-colors ${shuffle ? 'text-neon-cyan' : 'text-white/40 hover:text-white/70'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>

              <button onClick={previous} className="p-2 text-white/80 hover:text-white transition-colors active:scale-90">
                <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>

              <motion.button
                onClick={toggle}
                whileTap={{ scale: 0.88 }}
                className="w-[68px] h-[68px] rounded-full bg-white flex items-center justify-center text-deep-black shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-shadow"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 ml-1" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </motion.button>

              <button onClick={next} className="p-2 text-white/80 hover:text-white transition-colors active:scale-90">
                <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>

              <button
                onClick={cycleRepeat}
                className={`p-3 transition-colors ${repeat !== 'off' ? 'text-neon-cyan' : 'text-white/40 hover:text-white/70'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  {repeat === 'one'
                    ? <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                    : <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />}
                </svg>
              </button>
            </div>

            {/* Bottom section: Up Next / Lyrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 w-full"
            >
              {/* Toggle tabs */}
              <div className="flex items-center justify-center mb-4">
                <div className="flex bg-white/10 rounded-full p-1">
                  <button
                    onClick={() => setShowLyrics(false)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                      !showLyrics
                        ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                        : 'text-white/60 hover:text-white/80'
                    }`}
                  >
                    Up Next
                  </button>
                  <button
                    onClick={() => setShowLyrics(true)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                      showLyrics
                        ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                        : 'text-white/60 hover:text-white/80'
                    }`}
                  >
                    Lyrics
                  </button>
                </div>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {showLyrics ? (
                  <motion.div
                    key="lyrics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LyricsView 
                      trackId={currentTrack.id}
                      currentTime={currentTime}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="up-next"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {nextTrack ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/30 font-mono mb-3">Up Next</p>
                        <button
                          onClick={next}
                          className="w-full flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
                        >
                          {nextTrack.imageUrl && (
                            <img src={nextTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/70 group-hover:text-white truncate transition-colors">{nextTrack.name}</p>
                            <p className="text-xs text-white/35 truncate">{nextTrack.artistName}</p>
                          </div>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/20 shrink-0" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white/30 text-sm">End of queue</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
