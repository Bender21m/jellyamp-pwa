import { motion } from 'framer-motion'
import { usePlayerStore } from '../stores/player'
import { useUIStore } from '../stores/ui'
import { useState } from 'react'

export default function MiniPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, toggle, next } = usePlayerStore()
  const { setShowMiniPlayer } = useUIStore()
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 })

  function formatTime(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function handleDragEnd() {
    // Update drag constraints based on viewport size
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    setDragConstraints({
      left: -windowWidth + 320,
      right: 0,
      top: 0,
      bottom: windowHeight - 100
    })
  }

  if (!currentTrack) return null

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ x: -320, y: 0 }}
      animate={{ x: -20, y: 20 }}
      exit={{ x: -320, scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-20 right-5 z-[60] w-80 cursor-grab active:cursor-grabbing"
      dragConstraints={dragConstraints}
      whileDrag={{ scale: 1.02 }}
    >
      <div className="bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-white/5 relative">
          <div 
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-200"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Mini player content */}
        <div className="flex items-center gap-3 p-4">
          {/* Album art */}
          {currentTrack.imageUrl && (
            <img 
              src={currentTrack.imageUrl} 
              alt="" 
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            />
          )}

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-text-primary">
              {currentTrack.name}
            </p>
            <p className="text-xs text-text-muted truncate">
              {currentTrack.artistName}
            </p>
            <p className="text-xs text-text-muted font-mono mt-0.5">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-deep-black hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={next}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/20 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={() => setShowMiniPlayer(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/20 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}