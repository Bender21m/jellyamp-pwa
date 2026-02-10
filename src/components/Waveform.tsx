import { useCallback, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'

interface WaveformProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onSeekStart?: () => void
  onSeekEnd?: () => void
  trackId?: string
  className?: string
  barCount?: number
  showTooltip?: boolean
  isDragging?: boolean
  dragTime?: number
}

export default function Waveform({
  currentTime,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
  trackId = 'default',
  className = '',
  barCount = 100,
  showTooltip = true,
  isDragging = false,
  dragTime
}: WaveformProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const waveformRef = useRef<HTMLDivElement>(null)

  // Generate consistent pseudo-random waveform based on track ID
  const waveformBars = useMemo(() => {
    const bars: number[] = []
    const seed = hashString(trackId)
    const random = seededRandom(seed)
    
    for (let i = 0; i < barCount; i++) {
      // Create natural-looking variations with some smoothing
      const baseHeight = 0.3 + random() * 0.7 // 0.3 to 1.0 range
      const smoothingFactor = 0.15
      const prevHeight = i > 0 ? bars[i - 1] : baseHeight
      const height = prevHeight * smoothingFactor + baseHeight * (1 - smoothingFactor)
      bars.push(Math.max(0.2, Math.min(1.0, height)))
    }
    return bars
  }, [trackId, barCount])

  const progress = duration > 0 ? (currentTime / duration) : 0
  const displayProgress = isDragging && dragTime !== undefined ? dragTime / duration : progress

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!waveformRef.current || !duration) return
    const rect = waveformRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(pct * duration)
  }, [duration, onSeek])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!waveformRef.current || !duration) return
    e.preventDefault()
    onSeekStart?.()
    
    const rect = waveformRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(pct * duration)

    const handleMouseMove = (me: MouseEvent) => {
      const newPct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      onSeek(newPct * duration)
    }

    const handleMouseUp = () => {
      onSeekEnd?.()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [duration, onSeek, onSeekStart, onSeekEnd])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!waveformRef.current || !duration || !showTooltip) return
    const rect = waveformRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(pct * duration)
  }, [duration, showTooltip])

  // Touch support for mobile seeking
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!waveformRef.current || !duration) return
    e.stopPropagation() // prevent parent drag/swipe
    onSeekStart?.()
    const touch = e.touches[0]
    const rect = waveformRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    onSeek(pct * duration)
  }, [duration, onSeek, onSeekStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!waveformRef.current || !duration) return
    e.stopPropagation()
    e.preventDefault() // prevent scroll while seeking
    const touch = e.touches[0]
    const rect = waveformRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    onSeek(pct * duration)
  }, [duration, onSeek])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    onSeekEnd?.()
  }, [onSeekEnd])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setHoverTime(null)
  }, [])

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={waveformRef}
        className="relative w-full h-full cursor-pointer flex items-center gap-px"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {waveformBars.map((height, index) => {
          const barProgress = index / waveformBars.length
          const isPlayed = barProgress <= displayProgress
          const isAtCurrentPos = Math.abs(barProgress - displayProgress) < 1 / waveformBars.length
          
          return (
            <motion.div
              key={index}
              className="flex-1 rounded-full transition-colors duration-75"
              style={{
                height: `${height * 100}%`,
                backgroundColor: isPlayed 
                  ? isAtCurrentPos
                    ? '#00FFDD' // Bright cyan at current position
                    : `linear-gradient(to right, #00FFDD ${Math.min(100, (barProgress / displayProgress) * 100)}%, #FF2D78 100%)`
                  : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isAtCurrentPos ? '0 0 4px rgba(0, 255, 221, 0.6)' : undefined,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ 
                duration: 0.2, 
                delay: index * 0.01,
                ease: 'easeOut' 
              }}
            />
          )
        })}
        
        {/* Current position indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-neon-cyan opacity-75 transition-opacity duration-150"
          style={{ 
            left: `${displayProgress * 100}%`,
            opacity: isHovering ? 0.9 : 0.6,
            boxShadow: '0 0 8px rgba(0, 255, 221, 0.8)'
          }}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && isHovering && hoverTime !== null && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-0 pointer-events-none z-10"
          style={{
            left: `${(hoverTime / duration) * 100}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="px-2 py-1 bg-deep-black/90 backdrop-blur-sm text-xs text-white rounded border border-white/10">
            {formatTime(hoverTime)}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Utility functions for consistent pseudo-random generation
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function seededRandom(seed: number) {
  let state = seed
  return function() {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}