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
    if (onPlay) {
      onPlay()
    } else {
      setTrack(track, allTracks, index)
    }
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
        isActive ? 'bg-neon-cyan/10' : 'hover:bg-surface'
      }`}
    >
      {showIndex && (
        <span className={`w-6 text-right text-sm font-mono ${
          isActive ? 'text-neon-cyan' : 'text-text-muted group-hover:text-neon-cyan'
        }`}>
          {isActive && isPlaying ? (
            <span className="flex items-center justify-end gap-px">
              <span className="w-0.5 h-3 bg-neon-cyan rounded-full animate-pulse" />
              <span className="w-0.5 h-4 bg-neon-cyan rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <span className="w-0.5 h-2 bg-neon-cyan rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </span>
          ) : (
            track.indexNumber ?? index + 1
          )}
        </span>
      )}
      {showArt && track.imageUrl && (
        <img src={track.imageUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate transition-colors ${isActive ? 'text-neon-cyan font-semibold' : 'text-text-primary group-hover:text-neon-cyan'}`}>
          {track.name}
        </p>
        {track.artistName && (
          <p className="text-xs text-text-muted truncate">{track.artistName}</p>
        )}
      </div>
      <span className="text-xs text-text-muted font-mono shrink-0">
        {formatDuration(track.duration)}
      </span>
    </motion.div>
  )
}
