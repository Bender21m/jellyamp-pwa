import { motion } from 'framer-motion'
import { usePlayerStore, type Track } from '../stores/player'

interface TrackRowProps {
  track: Track
  index: number
  allTracks: Track[]
  showIndex?: boolean
  showArt?: boolean
  onPlay?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export default function TrackRow({ track, index, allTracks, showIndex = true, showArt = false, onPlay, onContextMenu }: TrackRowProps) {
  const { currentTrack, setTrack, isPlaying } = usePlayerStore()
  const isActive = currentTrack?.id === track.id

  function handleClick() {
    if (onPlay) onPlay()
    else setTrack(track, allTracks, index)
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      onClick={handleClick}
      onContextMenu={onContextMenu}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.3), duration: 0.15 }}
      className={`flex items-center gap-4 px-3 md:px-4 h-[52px] rounded-lg cursor-pointer group transition-colors ${
        isActive ? 'bg-neon-cyan/[0.08] shadow-[inset_0_0_20px_rgba(0,255,221,0.04)]' : 'hover:bg-white/[0.03] odd:bg-white/[0.015]'
      }`}
    >
      {showIndex && (
        <span className={`w-8 text-right text-sm shrink-0 ${
          isActive ? 'text-neon-cyan' : 'text-text-muted group-hover:text-neon-cyan'
        }`} style={{ fontFamily: 'var(--font-mono)' }}>
          {isActive && isPlaying ? (
            <span className="flex items-center justify-end gap-[2px]">
              <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-1" />
              <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-2" />
              <span className="w-[3px] bg-neon-cyan rounded-full eq-bar-3" />
            </span>
          ) : (
            <>
              <span className="group-hover:hidden">{track.indexNumber ?? index + 1}</span>
              <span className="hidden group-hover:flex items-center justify-end">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-neon-cyan" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </>
          )}
        </span>
      )}
      {showArt && track.imageUrl && (
        <img src={track.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm md:text-[15px] truncate transition-colors ${isActive ? 'text-neon-cyan font-semibold' : 'text-text-primary group-hover:text-neon-cyan'}`}>
          {track.name}
        </p>
        {track.artistName && (
          <p className="text-[13px] text-text-muted truncate">{track.artistName}</p>
        )}
      </div>
      <span className="text-[13px] text-text-muted shrink-0 font-mono">
        {formatDuration(track.duration)}
      </span>
      {onContextMenu && (
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
          className="w-8 h-8 flex items-center justify-center shrink-0 text-text-muted/40 hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      )}
    </motion.div>
  )
}
