import { useEffect, useRef, useState } from 'react'

interface SleepTimerState {
  active: boolean
  endTime: number | null
  mode: 'time' | 'track'
  originalVolume: number
}

interface UseSleepTimerOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>
  sleepTimer: SleepTimerState
  volume: number
  onPause: () => void
  onClearTimer: () => void
  trackId: string | undefined
}

export function useSleepTimer(options: UseSleepTimerOptions) {
  const { audioRef, sleepTimer, volume, onPause, onClearTimer, trackId } = options
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0)
  const sleepFadeRef = useRef<number | null>(null)

  // Sleep timer logic
  useEffect(() => {
    if (!sleepTimer.active || !audioRef.current) return

    const checkTimer = () => {
      if (sleepTimer.mode === 'time' && sleepTimer.endTime) {
        const remaining = sleepTimer.endTime - Date.now()
        setSleepTimerRemaining(remaining)

        // Start fade when 5 seconds remaining
        if (remaining <= 5000 && remaining > 0 && !sleepFadeRef.current) {
          const fadeStartVolume = audioRef.current?.volume ?? volume
          const fadeInterval = 50
          const steps = 5000 / fadeInterval
          let step = 0

          sleepFadeRef.current = window.setInterval(() => {
            if (!audioRef.current) return
            
            step++
            const progress = step / steps
            const newVolume = fadeStartVolume * (1 - progress)
            
            audioRef.current.volume = Math.max(0, newVolume)
            
            if (step >= steps) {
              onPause()
              onClearTimer()
              if (sleepFadeRef.current) {
                clearInterval(sleepFadeRef.current)
                sleepFadeRef.current = null
              }
              audioRef.current.volume = sleepTimer.originalVolume
            }
          }, fadeInterval)
        }

        // Timer expired
        if (remaining <= 0) {
          onPause()
          onClearTimer()
          setSleepTimerRemaining(0)
          if (sleepFadeRef.current) {
            clearInterval(sleepFadeRef.current)
            sleepFadeRef.current = null
          }
          if (audioRef.current) {
            audioRef.current.volume = sleepTimer.originalVolume
          }
        }
      }
    }

    const interval = setInterval(checkTimer, 1000)
    checkTimer()

    return () => {
      clearInterval(interval)
      if (sleepFadeRef.current) {
        clearInterval(sleepFadeRef.current)
        sleepFadeRef.current = null
      }
    }
  }, [sleepTimer, volume, onPause, onClearTimer])

  // Handle track end for "end of track" sleep timer
  useEffect(() => {
    if (!audioRef.current) return

    const handleTrackEnd = () => {
      if (sleepTimer.active && sleepTimer.mode === 'track') {
        onPause()
        onClearTimer()
      }
    }

    const audio = audioRef.current
    audio.addEventListener('ended', handleTrackEnd)

    return () => {
      audio.removeEventListener('ended', handleTrackEnd)
    }
  }, [audioRef, sleepTimer.active, sleepTimer.mode, onPause, onClearTimer])

  // Handle sleep timer "end of track" mode on track change
  useEffect(() => {
    if (!trackId) return
    // Placeholder: sleep timer track mode is handled by the ended event above
  }, [trackId, sleepTimer.active, sleepTimer.mode])

  return { sleepTimerRemaining }
}
