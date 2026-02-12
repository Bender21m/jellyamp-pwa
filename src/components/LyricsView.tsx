import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { fetchLyrics, type LyricsResponse } from '../lib/jellyfin'
import { useAuthStore } from '../stores/auth'

interface LyricsViewProps {
  trackId: string
  currentTime: number // in seconds
  className?: string
}

export default function LyricsView({ trackId, currentTime, className = '' }: LyricsViewProps) {
  const { api } = useAuthStore()
  const [lyrics, setLyrics] = useState<LyricsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Load lyrics when track changes
  useEffect(() => {
    if (!api || !trackId) return
    
    // This is a standard async data fetching pattern - setting loading states is legitimate
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError(null)
     
    setLyrics(null)
     
    setCurrentLineIndex(-1)
    
    fetchLyrics(api, trackId)
      .then((result) => {
        setLyrics(result)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load lyrics')
        setLoading(false)
      })
  }, [api, trackId])

  // Update current line based on time
  useEffect(() => {
    if (!lyrics || !lyrics.Lyrics.length) return

    const currentTimeTicks = currentTime * 10000000 // Convert seconds to ticks
    
    // Find the current line (last line where Start time <= current time)
    let activeIndex = -1
    for (let i = 0; i < lyrics.Lyrics.length; i++) {
      const line = lyrics.Lyrics[i]
      if (line.Start === undefined) break // Unsynced lyrics
      
      if (line.Start <= currentTimeTicks) {
        activeIndex = i
      } else {
        break
      }
    }
    
    // This is derived state based on current time and lyrics - legitimate pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLineIndex(activeIndex)
  }, [lyrics, currentTime])

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex === -1 || !scrollContainerRef.current) return
    
    const currentLineElement = lineRefs.current[currentLineIndex]
    if (!currentLineElement) return
    
    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const lineRect = currentLineElement.getBoundingClientRect()
    
    // Check if line is outside viewport
    const isAbove = lineRect.top < containerRect.top + 80
    const isBelow = lineRect.bottom > containerRect.bottom - 80
    
    if (isAbove || isBelow) {
      const targetScrollTop = currentLineElement.offsetTop - container.offsetTop - (container.clientHeight / 2) + (currentLineElement.clientHeight / 2)
      
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    }
  }, [currentLineIndex])

  const hasSyncedLyrics = lyrics && lyrics.Lyrics.some(line => line.Start !== undefined)
  const lyricsLines = lyrics?.Lyrics || []

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-neon-cyan animate-spin" />
          <p className="text-sm text-text-muted">Loading lyrics...</p>
        </div>
      </div>
    )
  }

  if (error || !lyrics || !lyricsLines.length) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-text-muted/30" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <p className="text-text-muted text-center">
            {error || 'No lyrics available'}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div 
        ref={scrollContainerRef}
        className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 py-4"
      >
        <div className="space-y-2 px-1">
          {lyricsLines.map((line, index) => {
            const isCurrent = hasSyncedLyrics && index === currentLineIndex
            const isPast = hasSyncedLyrics && index < currentLineIndex
            const isFuture = hasSyncedLyrics && index > currentLineIndex
            
            return (
              <motion.div
                key={index}
                ref={(el) => { lineRefs.current[index] = el }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`transition-all duration-300 leading-relaxed ${
                  isCurrent
                    ? 'text-text-primary font-semibold text-lg scale-105'
                    : isPast
                    ? 'text-text-muted/40'
                    : isFuture || !hasSyncedLyrics
                    ? 'text-text-muted/60'
                    : 'text-text-muted/60'
                }`}
              >
                {line.Text}
              </motion.div>
            )
          })}
        </div>
        
        {/* Padding at bottom for better scroll experience */}
        <div className="h-32" />
      </div>
      
      {hasSyncedLyrics && (
        <div className="mt-3 text-xs text-text-muted/50 text-center font-mono">
          Synced Lyrics
        </div>
      )}
    </div>
  )
}