import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { usePlayerStore, type Track } from '../stores/player'
import { useToastStore } from '../stores/toast'
import { setDragData } from '../lib/dragdrop'
import { useSwipeAction } from '../hooks/useSwipeAction'

interface TrackRowProps {
  track: Track
  index: number
  allTracks: Track[]
  showIndex?: boolean
  showArt?: boolean
  onPlay?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isSelected?: boolean
  isFocused?: boolean
  onSelectionClick?: (id: string, index: number, event: React.MouseEvent) => void
}

export default function TrackRow({ track, index, allTracks, showIndex = true, showArt = false, onPlay, onContextMenu, isSelected = false, isFocused = false, onSelectionClick }: TrackRowProps) {
  const { currentTrack, setTrack, isPlaying, addToQueue, playNext } = usePlayerStore()
  const { addToast } = useToastStore()
  const navigate = useNavigate()
  const isActive = currentTrack?.id === track.id
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swipeAction, setSwipeAction] = useState<'queue' | 'play-next' | null>(null)

  function handleClick(e: React.MouseEvent) {
    // Check if this is a selection click (Cmd/Ctrl or Shift)
    if (onSelectionClick && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      onSelectionClick(track.id, index, e)
      return
    }
    if (onPlay) onPlay()
    else setTrack(track, allTracks, index)
  }

  function handleArtistClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (track.artistId) {
      navigate(`/artist/${track.artistId}`)
    }
  }

  function handleAlbumClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (track.albumId) {
      navigate(`/album/${track.albumId}`)
    }
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function handleDragStart(e: React.DragEvent) {
    setDragData(e, { type: 'tracks', trackIds: [track.id], label: track.name })
    e.dataTransfer.effectAllowed = 'copy'
  }

  // Swipe actions
  const { touchHandlers, getDeltaX: _getDeltaX, isTracking: _isTracking } = useSwipeAction({
    onSwipeLeft: () => {
      // Swipe left = add to queue
      addToQueue([track])
      addToast('Added to queue', 'success')
      setSwipeAction('queue')
      setTimeout(() => {
        setSwipeAction(null)
        setSwipeOffset(0)
      }, 500)
    },
    onSwipeRight: () => {
      // Swipe right = play next
      playNext(track)
      addToast('Playing next', 'success')
      setSwipeAction('play-next')
      setTimeout(() => {
        setSwipeAction(null)
        setSwipeOffset(0)
      }, 500)
    },
    onSwipeMove: (deltaX) => {
      setSwipeOffset(deltaX)
      
      // Show action preview
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) {
          setSwipeAction('queue')
        } else {
          setSwipeAction('play-next')
        }
      } else {
        setSwipeAction(null)
      }
    },
    onSwipeEnd: () => {
      if (!swipeAction) {
        setSwipeOffset(0)
        setSwipeAction(null)
      }
    }
  })

  // Only enable swipe on touch devices
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const swipeProps = isTouchDevice ? touchHandlers : {}

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background action indicators */}
      {isTouchDevice && swipeAction && (
        <div className={`absolute inset-0 flex items-center justify-center text-white font-semibold ${
          swipeAction === 'queue' ? 'bg-neon-cyan' : 'bg-neon-pink'
        }`}>
          <div className="flex items-center gap-2">
            {swipeAction === 'queue' ? (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
                <span>Queue</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
                <span>Play Next</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Track row */}
      <div draggable onDragStart={handleDragStart} className="cursor-grab active:cursor-grabbing">
        <motion.div
          data-track-index={index}
          onClick={handleClick}
          onContextMenu={onContextMenu}
          initial={{ opacity: 0, y: 4 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            x: swipeAction ? (swipeAction === 'queue' ? -10 : 10) : swipeOffset,
            scale: swipeAction ? 0.98 : 1
          }}
          transition={{ 
            delay: Math.min(index * 0.015, 0.3), 
            duration: swipeAction ? 0.2 : 0.15,
            type: swipeAction ? 'spring' : 'tween',
            damping: 25,
            stiffness: 300
          }}
          className={`flex items-center gap-4 px-3 md:px-4 h-[52px] rounded-lg cursor-pointer group transition-colors relative z-10 ${
            isSelected
              ? 'bg-neon-cyan/10'
              : isActive ? 'bg-neon-cyan/[0.08] shadow-[inset_0_0_20px_rgba(0,255,221,0.04)]' : 'hover:bg-white/[0.03] odd:bg-white/[0.015]'
          } ${isFocused ? 'ring-1 ring-neon-cyan/40' : ''}`}
          {...swipeProps}
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
        <div className="text-[13px] text-text-muted truncate flex items-center gap-1">
          {track.artistName && (
            <>
              <button
                onClick={handleArtistClick}
                className="text-text-muted hover:text-neon-cyan transition-colors cursor-pointer truncate"
                title={`Go to ${track.artistName}`}
              >
                {track.artistName}
              </button>
              {track.albumName && <span className="text-text-muted/60">•</span>}
            </>
          )}
          {track.albumName && (
            <button
              onClick={handleAlbumClick}
              className="text-text-muted hover:text-neon-cyan transition-colors cursor-pointer truncate"
              title={`Go to ${track.albumName}`}
            >
              {track.albumName}
            </button>
          )}
        </div>
      </div>
      <span className="text-[13px] text-text-muted shrink-0 font-mono">
        {formatDuration(track.duration)}
      </span>
      {onContextMenu && (
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
          className="w-8 h-8 flex items-center justify-center shrink-0 text-text-muted/40 hover:text-text-primary transition-opacity rounded-md hover:bg-white/5 opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      )}
        </motion.div>
      </div>
    </div>
  )
}
