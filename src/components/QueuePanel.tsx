import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/player'
import EmptyState from './EmptyState'

export default function QueuePanel() {
  const { queue, queueIndex, currentTrack, showQueue, setShowQueue, jumpToTrack, removeFromQueue, moveInQueue, clearQueue, isPlaying } = usePlayerStore()
  const navigate = useNavigate()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  
  // Mobile bottom sheet drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef(0)
  const isMobile = window.matchMedia('(max-width: 768px)').matches

  if (!showQueue || !currentTrack) return null

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const upcoming = queue.slice(queueIndex + 1)

  // Mobile bottom sheet drag handlers
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    setIsDragging(true)
    setDragY(0)
  }

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile || !isDragging) return
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = clientY - dragStartY.current
    
    // Only allow dragging down
    if (deltaY > 0) {
      setDragY(deltaY)
    }
  }

  const handleDragEnd = () => {
    if (!isMobile || !isDragging) return
    
    // If dragged down more than 100px, close the sheet
    if (dragY > 100) {
      setShowQueue(false)
    }
    
    setIsDragging(false)
    setDragY(0)
  }

  return (
    <AnimatePresence>
      {/* Mobile backdrop */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 z-30"
          onClick={() => setShowQueue(false)}
        />
      )}

      {/* Queue panel */}
      <motion.div
        initial={isMobile ? { y: '100%', opacity: 0 } : { x: 320, opacity: 0 }}
        animate={{ 
          y: isMobile ? (isDragging ? dragY : 0) : 0,
          x: isMobile ? 0 : 0, 
          opacity: 1 
        }}
        exit={isMobile ? { y: '100%', opacity: 0 } : { x: 320, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          damping: isDragging ? 0 : 25, 
          stiffness: isDragging ? 0 : 300,
          duration: isDragging ? 0 : undefined
        }}
        className={`fixed z-40 flex flex-col bg-card/95 backdrop-blur-xl ${
          isMobile 
            ? 'left-0 right-0 bottom-0 top-20 rounded-t-2xl border-t border-white/5'
            : 'right-0 top-0 w-80 bottom-[73px] border-l border-white/5'
        }`}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
        )}

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
        <div className="px-4 py-3 border-b border-white/5 bg-neon-cyan/[0.04] shadow-[inset_0_0_24px_rgba(0,255,221,0.06)]">
          <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider mb-2">Now Playing</p>
          <div className="flex items-center gap-3">
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shadow-[0_0_12px_rgba(0,255,221,0.15)]" />
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
            <div className="py-8">
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                }
                title="Queue is empty"
                subtitle="Play something to get started"
                action={{
                  label: "Browse library",
                  onClick: () => {
                    setShowQueue(false)
                    navigate('/library')
                  }
                }}
              />
            </div>
          ) : (
            <>
              <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider px-4 pt-3 pb-1">
                Up Next · {upcoming.length} track{upcoming.length !== 1 ? 's' : ''}
              </p>
              {upcoming.map((track, i) => {
                const realIndex = queueIndex + 1 + i
                const isDragging = dragIdx === realIndex
                const isOver = overIdx === realIndex
                return (
                  <div
                    key={`${track.id}-${realIndex}`}
                    draggable
                    onDragStart={() => setDragIdx(realIndex)}
                    onDragOver={(e) => { e.preventDefault(); setOverIdx(realIndex) }}
                    onDragLeave={() => { if (overIdx === realIndex) setOverIdx(null) }}
                    onDrop={() => {
                      if (dragIdx !== null && dragIdx !== realIndex) {
                        moveInQueue(dragIdx, realIndex)
                      }
                      setDragIdx(null)
                      setOverIdx(null)
                    }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                    onClick={() => jumpToTrack(realIndex)}
                    className={`flex items-center gap-3 px-4 py-2.5 min-h-[48px] cursor-pointer group transition-all ${
                      isDragging ? 'opacity-30' : isOver ? 'bg-neon-cyan/10 border-t border-neon-cyan/30' : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing shrink-0 text-text-muted">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                        <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </div>
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
