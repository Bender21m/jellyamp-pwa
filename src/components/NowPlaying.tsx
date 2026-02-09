import { useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { usePlayerStore } from '../stores/player'

export default function NowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration, shuffle, repeat, showNowPlaying,
    toggle, next, previous, seek, toggleShuffle, cycleRepeat, setShowNowPlaying, setShowQueue, setCurrentTime,
  } = usePlayerStore()
  const progressRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(pct * duration)
  }, [duration, seek])

  const handleProgressDrag = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const onMove = (me: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      setCurrentTime(pct * duration)
    }
    const onUp = (me: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      seek(pct * duration)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, seek, setCurrentTime])

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

  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <AnimatePresence>
      {showNowPlaying && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ y, opacity }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handlePanEnd}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden touch-none"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-deep-black">
            {currentTrack.imageUrl && (
              <img
                src={currentTrack.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-25 scale-110"
              />
            )}
            <div className="absolute inset-0 bg-deep-black/70" />
          </div>

          {/* Drag handle - mobile */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 md:hidden z-10" />

          {/* Close button */}
          <button
            onClick={() => setShowNowPlaying(false)}
            className="absolute top-5 left-5 z-10 text-text-muted hover:text-text-primary transition-colors p-2"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </button>

          {/* Queue button */}
          <button
            onClick={() => { setShowNowPlaying(false); setShowQueue(true) }}
            className="absolute top-5 right-5 z-10 text-text-muted hover:text-text-primary transition-colors p-2"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </button>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6 md:px-8">
            {/* Album Art */}
            <motion.div
              key={currentTrack.id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-[80vw] h-[80vw] max-w-[380px] max-h-[380px] md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl mb-8 md:mb-10 ring-1 ring-white/10"
              style={{ boxShadow: '0 8px 60px rgba(0, 255, 221, 0.15), 0 0 120px rgba(139, 92, 246, 0.08)' }}
            >
              {currentTrack.imageUrl ? (
                <img src={currentTrack.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-20 h-20 text-text-muted" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Track Info */}
            <div className="text-center mb-6 md:mb-8 w-full">
              <motion.h2
                key={currentTrack.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl md:text-2xl font-bold truncate"
              >
                {currentTrack.name}
              </motion.h2>
              <p className="text-text-secondary mt-1 truncate text-[15px]">{currentTrack.artistName}</p>
              {currentTrack.albumName && (
                <p className="text-text-muted text-sm mt-0.5 truncate">{currentTrack.albumName}</p>
              )}
            </div>

            {/* Progress */}
            <div className="w-full mb-6">
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                onMouseDown={handleProgressDrag}
                className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group relative"
              >
                <div
                  className="h-full bg-gradient-primary rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(0,255,221,0.5)] opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 hidden md:block" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5 md:gap-6">
              <button
                onClick={toggleShuffle}
                className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${shuffle ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>
              <button onClick={previous} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-primary hover:text-neon-cyan transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>
              <motion.button
                onClick={toggle}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-deep-black shadow-[0_0_30px_rgba(0,255,221,0.3)] hover:shadow-[0_0_40px_rgba(0,255,221,0.4)] transition-shadow"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 ml-1" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </motion.button>
              <button onClick={next} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-primary hover:text-neon-cyan transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${repeat !== 'off' ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  {repeat === 'one'
                    ? <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                    : <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />}
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
