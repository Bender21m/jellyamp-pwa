import { useEffect, useRef, useState } from 'react'
import type { Track } from '../stores/player'
import type { ScrobbleSettings } from '../stores/ui'
import { updateNowPlaying, scrobbleTrack, shouldScrobble } from '../lib/scrobble'

interface UseScrobblingOptions {
  track: Track | null
  isPlaying: boolean
  scrobbleSettings: ScrobbleSettings
}

export function useScrobbling(options: UseScrobblingOptions) {
  const { track, isPlaying, scrobbleSettings } = options

  const scrobbledTracksRef = useRef<Set<string>>(new Set())
  const trackStartTimeRef = useRef<number | null>(null)
  const playedTimeRef = useRef<number>(0)
  const [scrobbleToast, setScrobbleToast] = useState('')

  // Reset scrobbling state on track change + send "now playing"
  useEffect(() => {
    if (!track) return

    trackStartTimeRef.current = Date.now()
    playedTimeRef.current = 0

    if (scrobbleSettings.enabled) {
      updateNowPlaying(track, scrobbleSettings).catch(() => {})
    }
  }, [track, scrobbleSettings])

  // Called from audio engine's timeupdate
  function handleTimeUpdate(currentTime: number, duration: number) {
    if (trackStartTimeRef.current && isPlaying) {
      const now = Date.now()
      const timeSinceStart = (now - trackStartTimeRef.current) / 1000
      playedTimeRef.current = Math.min(timeSinceStart, currentTime)

      if (
        track && 
        !scrobbledTracksRef.current.has(track.id) && 
        duration && 
        shouldScrobble(playedTimeRef.current, duration)
      ) {
        scrobbledTracksRef.current.add(track.id)
        scrobbleTrack(track, trackStartTimeRef.current, scrobbleSettings)
          .then((success) => {
            if (success) {
              setScrobbleToast('♫ Scrobbled')
              setTimeout(() => setScrobbleToast(''), 2000)
            }
          })
          .catch(() => {})
      }
    }
  }

  return { scrobbleToast, handleTimeUpdate }
}
