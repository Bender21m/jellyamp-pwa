import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFocusManagement } from '../hooks/useFocusManagement'
import { usePlayerStore } from '../stores/player'

interface SleepTimerProps {
  isOpen: boolean
  onClose: () => void
}

const TIMER_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
]

export default function SleepTimer({ isOpen, onClose }: SleepTimerProps) {
  const { 
    sleepTimer, 
    setSleepTimer, 
    setSleepTimerEndOfTrack, 
    clearSleepTimer,
    getSleepTimerRemaining 
  } = usePlayerStore()

  const [remainingTime, setRemainingTime] = useState(0)

  // Focus management
  const { containerRef } = useFocusManagement({
    isOpen,
    restoreOnClose: true,
    trapFocus: true,
  })

  // Update remaining time every second
  useEffect(() => {
    if (!sleepTimer.active) return

    const interval = setInterval(() => {
      if (sleepTimer.mode === 'time') {
        const remaining = getSleepTimerRemaining()
        setRemainingTime(remaining)
        
        // Timer expired
        if (remaining <= 0) {
          clearSleepTimer()
          setRemainingTime(0)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sleepTimer.active, sleepTimer.mode, getSleepTimerRemaining, clearSleepTimer])

  // Initial remaining time calculation - derived state from sleepTimer
  useEffect(() => {
    if (sleepTimer.active && sleepTimer.mode === 'time') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemainingTime(getSleepTimerRemaining())
    }
  }, [sleepTimer.active, sleepTimer.mode, getSleepTimerRemaining])

  function handleTimerSelect(minutes: number) {
    setSleepTimer(minutes)
    onClose()
  }

  function handleEndOfTrack() {
    setSleepTimerEndOfTrack()
    onClose()
  }

  function handleOff() {
    clearSleepTimer()
    setRemainingTime(0)
    onClose()
  }

  function formatTime(milliseconds: number) {
    if (milliseconds <= 0) return '0m'
    const minutes = Math.ceil(milliseconds / (1000 * 60))
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
          
          {/* Dropdown */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-4 bottom-full mb-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1.5 z-50 min-w-[160px]"
          >
            <div className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-text-muted border-b border-white/5">
              Sleep Timer
            </div>
            
            {/* Current timer status */}
            {sleepTimer.active && (
              <div className="px-3 py-2 text-xs text-neon-cyan border-b border-white/5">
                {sleepTimer.mode === 'time' 
                  ? `Active: ${formatTime(remainingTime)}`
                  : 'Active: End of track'
                }
              </div>
            )}
            
            {/* Timer options */}
            {TIMER_OPTIONS.map(({ label, minutes }) => (
              <button
                key={minutes}
                onClick={() => handleTimerSelect(minutes)}
                className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                {label}
              </button>
            ))}
            
            <button
              onClick={handleEndOfTrack}
              className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              End of track
            </button>
            
            <button
              onClick={handleOff}
              className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors border-t border-white/5"
            >
              Off
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}