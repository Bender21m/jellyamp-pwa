import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore, type Track } from '../stores/player'

interface SelectionBarProps {
  selectedCount: number
  selectedTracks: Track[]
  onClear: () => void
}

export default function SelectionBar({ selectedCount, selectedTracks, onClear }: SelectionBarProps) {
  const setTrack = usePlayerStore(s => s.setTrack)
  const addToQueue = usePlayerStore(s => s.addToQueue)

  function handlePlay() {
    if (selectedTracks.length > 0) {
      setTrack(selectedTracks[0], selectedTracks, 0)
      onClear()
    }
  }

  function handleQueue() {
    if (selectedTracks.length > 0) {
      addToQueue(selectedTracks)
      onClear()
    }
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[60] hidden [@media(hover:hover)]:flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/95 border border-neon-cyan/20 shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,221,0.1)] backdrop-blur-xl"
        >
          <span className="text-sm font-semibold text-neon-cyan whitespace-nowrap">
            {selectedCount} selected
          </span>
          <div className="w-px h-5 bg-white/10" />
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-primary text-deep-black text-sm font-bold hover:shadow-[0_0_16px_rgba(0,255,221,0.3)] transition-shadow"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
          <button
            onClick={handleQueue}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 text-sm text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
            Queue
          </button>
          <button
            onClick={onClear}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            title="Clear selection"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
