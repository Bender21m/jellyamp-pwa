import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../stores/player'

export default function QueuePanel() {
  const { queue, queueIndex, currentTrack, showQueue, setShowQueue, jumpToTrack, removeFromQueue, clearQueue, isPlaying } = usePlayerStore()

  if (!showQueue || !currentTrack) return null

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const upcoming = queue.slice(queueIndex + 1)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 z-40 flex flex-col
          w-full md:w-80
          bottom-[120px] md:bottom-[73px]
          bg-card/95 backdrop-blur-xl border-l border-white/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Queue</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={clearQueue}
              className="text-xs text-text-muted hover:text-neon-pink transition-colors font-mono uppercase px-2 py-1 min-h-[44px] flex items-center"
            >
              Clear
            </button>
            <button
              onClick={() => setShowQueue(false)}
              className="text-text-muted hover:text-text-primary transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Now Playing */}
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider mb-2">Now Playing</p>
          <div className="flex items-center gap-3">
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neon-cyan truncate">{currentTrack.name}</p>
              <p className="text-xs text-text-muted truncate">{currentTrack.artistName}</p>
            </div>
            {isPlaying && (
              <div className="flex items-center gap-[2px]">
                <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-1" />
                <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-2" />
                <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-3" />
              </div>
            )}
          </div>
        </div>

        {/* Up Next */}
        <div className="flex-1 overflow-y-auto">
          {upcoming.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              Nothing up next
            </div>
          ) : (
            <>
              <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider px-4 pt-3 pb-1">
                Up Next · {upcoming.length} track{upcoming.length !== 1 ? 's' : ''}
              </p>
              {upcoming.map((track, i) => {
                const realIndex = queueIndex + 1 + i
                return (
                  <div
                    key={`${track.id}-${realIndex}`}
                    onClick={() => jumpToTrack(realIndex)}
                    className="flex items-center gap-3 px-4 py-2.5 min-h-[48px] hover:bg-white/5 cursor-pointer group transition-colors"
                  >
                    {track.imageUrl && (
                      <img src={track.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate group-hover:text-neon-cyan transition-colors">{track.name}</p>
                      <p className="text-xs text-text-muted truncate">{track.artistName}</p>
                    </div>
                    <span className="text-xs text-text-muted font-mono shrink-0">{formatDuration(track.duration)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(realIndex) }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-neon-pink transition-all p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
