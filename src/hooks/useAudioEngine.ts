import { useEffect, useRef, useCallback } from 'react'
import { getStreamUrl, type StreamQuality } from '../lib/jellyfin'
import { AudioEqualizer } from '../lib/equalizer'
import type { Track } from '../stores/player'

interface UseAudioEngineOptions {
  trackId: string | undefined
  currentTrack: Track | undefined
  serverUrl: string | undefined
  accessToken: string | undefined
  audioQuality: StreamQuality
  isPlaying: boolean
  volume: number
  muted: boolean
  playbackRate: number
  crossfadeMode: string
  crossfadeDuration: number
  eqEnabled: boolean
  eqGains: number[]
  queue: { id: string }[]
  queueIndex: number
  repeat: string
  onPlay: () => void
  onSetCurrentTime: (time: number) => void
  onSetDuration: (time: number) => void
  onNext: () => void
  onPreloadNeeded?: () => void
  onTimeUpdate?: (currentTime: number, duration: number, audioElement: HTMLAudioElement) => void
}

export function useAudioEngine(options: UseAudioEngineOptions) {
  const {
    trackId, currentTrack, serverUrl, accessToken, audioQuality,
    isPlaying, volume, muted, playbackRate, crossfadeMode, crossfadeDuration,
    eqEnabled, eqGains,
    queue, queueIndex, repeat,
    onPlay, onSetCurrentTime, onSetDuration, onNext,
    onTimeUpdate,
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)
  const crossfadeTimerRef = useRef<number | null>(null)
  const preloadedTrackIdRef = useRef<string | null>(null)
  const equalizerRef = useRef<AudioEqualizer | null>(null)
  const fadeInRef = useRef<number | null>(null)
  const lastPauseTimeRef = useRef<number>(0)
  const userInitiatedRef = useRef(false) // tracks whether playback was user-initiated vs restore from reload

  // Refs for values accessed in event handlers to prevent stale closures
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  const playbackRateRef = useRef(playbackRate)
  const crossfadeModeRef = useRef(crossfadeMode)
  const crossfadeDurationRef = useRef(crossfadeDuration)
  const onSetCurrentTimeRef = useRef(onSetCurrentTime)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onNextRef = useRef(onNext)

  // Keep refs in sync with current values
  volumeRef.current = volume
  mutedRef.current = muted
  playbackRateRef.current = playbackRate
  crossfadeModeRef.current = crossfadeMode
  crossfadeDurationRef.current = crossfadeDuration
  onSetCurrentTimeRef.current = onSetCurrentTime
  onTimeUpdateRef.current = onTimeUpdate
  onNextRef.current = onNext

  // Fade-in helper function
  const startFadeIn = useCallback((audioElement: HTMLAudioElement, targetVolume: number) => {
    if (fadeInRef.current) {
      cancelAnimationFrame(fadeInRef.current)
      fadeInRef.current = null
    }

    const fadeDuration = 200 // 200ms fade
    const startTime = performance.now()
    audioElement.volume = 0

    const fade = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / fadeDuration, 1)
      
      audioElement.volume = targetVolume * progress
      
      if (progress < 1) {
        fadeInRef.current = requestAnimationFrame(fade)
      } else {
        fadeInRef.current = null
      }
    }
    
    fadeInRef.current = requestAnimationFrame(fade)
  }, [])

  // Get next track in queue
  const getNextTrack = useCallback(() => {
    if (queue.length === 0) return null
    const nextIdx = queueIndex + 1
    if (nextIdx < queue.length) return queue[nextIdx]
    if (repeat === 'all') return queue[0]
    return null
  }, [queue, queueIndex, repeat])

  // Preload next track for gapless/crossfade
  const preloadNext = useCallback(() => {
    if (crossfadeModeRef.current === 'off' || !serverUrl || !accessToken) return
    const nextTrack = getNextTrack()
    if (!nextTrack || preloadedTrackIdRef.current === nextTrack.id) return

    const nextAudio = new Audio()
    nextAudio.preload = 'auto'
    nextAudio.src = getStreamUrl(serverUrl, nextTrack.id, accessToken, audioQuality)
    nextAudio.volume = 0
    nextAudio.load()
    nextAudioRef.current = nextAudio
    preloadedTrackIdRef.current = nextTrack.id
  }, [serverUrl, accessToken, audioQuality, getNextTrack])

  // Initialize the equalizer
  async function initializeEqualizer(audioElement: HTMLAudioElement) {
    try {
      if (!equalizerRef.current) {
        equalizerRef.current = new AudioEqualizer()
      }
      
      await equalizerRef.current.connectToAudio(audioElement)
      
      // Apply saved EQ settings
      if (eqGains.length === 5) {
        equalizerRef.current.setEQGains(eqGains)
      }
    } catch (error) {
      console.error('Failed to initialize equalizer:', error)
    }
  }

  // Create/update audio
  useEffect(() => {
    if (!trackId) return
    if (!currentTrack?.streamUrl && (!serverUrl || !accessToken)) return

    // If we have a preloaded audio for this track, use it (gapless transition)
    let audio: HTMLAudioElement
    if (nextAudioRef.current && preloadedTrackIdRef.current === trackId) {
      audio = nextAudioRef.current
      nextAudioRef.current = null
      preloadedTrackIdRef.current = null
    } else {
      audio = audioRef.current ?? new Audio()
      const url = currentTrack?.streamUrl
        ?? getStreamUrl(serverUrl!, trackId, accessToken!, audioQuality)
      audio.src = url
      audio.load()
    }

    // Clean up old audio if different
    if (audioRef.current && audioRef.current !== audio) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    audioRef.current = audio
    audio.volume = mutedRef.current ? 0 : volumeRef.current

    const onError = (e: Event) => {
      const a = e.target as HTMLAudioElement
      console.error('[JellyAmp] Audio error:', a.error?.code, a.error?.message)
    }

    // Only auto-play if this is a user-initiated track change (not a page reload restore)
    const shouldAutoPlay = userInitiatedRef.current

    if (shouldAutoPlay) {
      const onCanPlay = () => {
        const targetVolume = mutedRef.current ? 0 : volumeRef.current
        if (crossfadeModeRef.current === 'gapless') {
          audio.volume = targetVolume
        } else {
          startFadeIn(audio, targetVolume)
        }
        audio.play().then(() => onPlay()).catch((err) => console.error('[JellyAmp] Play failed:', err))
      }

      const isGaplessPreloaded = crossfadeModeRef.current === 'gapless' && audio.readyState >= 3
      if (audio.readyState >= 3) {
        const targetVolume = mutedRef.current ? 0 : volumeRef.current
        if (isGaplessPreloaded) {
          audio.volume = targetVolume
        } else {
          startFadeIn(audio, targetVolume)
        }
        audio.play().then(() => onPlay()).catch(() => {})
      } else {
        audio.addEventListener('canplay', onCanPlay, { once: true })
      }
    }
    audio.addEventListener('error', onError)

    // Initialize EQ if enabled
    if (eqEnabled && !equalizerRef.current) {
      initializeEqualizer(audio)
    } else if (eqEnabled && equalizerRef.current) {
      equalizerRef.current.connectToAudio(audio).catch(console.error)
    }

    const handleTimeUpdate = () => {
      if (!seekingRef.current) onSetCurrentTimeRef.current(audio.currentTime)

      // Notify external listeners (scrobbling, etc.)
      if (onTimeUpdateRef.current) {
        onTimeUpdateRef.current(audio.currentTime, audio.duration, audio)
      }

      // Preload next track when 10 seconds from end
      if (audio.duration && isFinite(audio.duration) && audio.duration - audio.currentTime < 10) {
        preloadNext()
      }

      // Start crossfade when approaching end
      if (crossfadeModeRef.current === 'crossfade' && audio.duration && isFinite(audio.duration)) {
        const timeLeft = audio.duration - audio.currentTime
        if (timeLeft <= crossfadeDurationRef.current && timeLeft > 0 && nextAudioRef.current) {
          const progress = 1 - (timeLeft / crossfadeDurationRef.current)
          audio.volume = (mutedRef.current ? 0 : volumeRef.current) * (1 - progress)
          nextAudioRef.current.volume = (mutedRef.current ? 0 : volumeRef.current) * progress
          if (nextAudioRef.current.paused) {
            nextAudioRef.current.play().catch(() => {})
          }
        }
      }

      // Gapless: ensure next audio is fully buffered
      if (crossfadeModeRef.current === 'gapless' && audio.duration && isFinite(audio.duration)) {
        const timeLeft = audio.duration - audio.currentTime
        if (timeLeft <= 15) preloadNext()
        if (timeLeft <= 3 && nextAudioRef.current) {
          if (nextAudioRef.current.readyState < 3) {
            nextAudioRef.current.load()
          }
        }
      }
    }
    const onDuration = () => { if (audio.duration && isFinite(audio.duration)) onSetDuration(audio.duration) }
    const onEnded = () => {
      onNextRef.current()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      if (crossfadeTimerRef.current) {
        cancelAnimationFrame(crossfadeTimerRef.current)
        crossfadeTimerRef.current = null
      }
      if (fadeInRef.current) {
        cancelAnimationFrame(fadeInRef.current)
        fadeInRef.current = null
      }
    }
  // Re-run when trackId changes OR when auth becomes available (after reload restore)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, currentTrack?.streamUrl, serverUrl, accessToken])

  // Play/pause sync — only react to isPlaying changes, not volume/muted
  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      // Mark that user has initiated playback (for reload detection)
      userInitiatedRef.current = true

      const timeSinceLastPause = Date.now() - lastPauseTimeRef.current
      const isShortPause = timeSinceLastPause < 500
      
      if (!isShortPause && audioRef.current.currentTime === 0) {
        const targetVolume = mutedRef.current ? 0 : volumeRef.current
        startFadeIn(audioRef.current, targetVolume)
      }
      
      audioRef.current.play().catch(() => {})
    } else {
      lastPauseTimeRef.current = Date.now()
      audioRef.current.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  // Playback rate sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Listen for seek events from NowPlaying
  useEffect(() => {
    const handler = (e: Event) => {
      const time = (e as CustomEvent).detail?.time
      if (audioRef.current && typeof time === 'number' && isFinite(time)) {
        audioRef.current.currentTime = time
      }
    }
    window.addEventListener('jellyamp-seek', handler)
    return () => window.removeEventListener('jellyamp-seek', handler)
  }, [])

  // Handle EQ gain changes
  function handleEQGainsChange(gains: number[]) {
    if (equalizerRef.current?.connected) {
      equalizerRef.current.setEQGains(gains)
    }
  }

  // Toggle EQ on/off
  function connectEqualizer() {
    if (audioRef.current) {
      initializeEqualizer(audioRef.current)
    }
  }

  function disconnectEqualizer() {
    if (equalizerRef.current) {
      equalizerRef.current.bypass()
    }
  }

  return {
    audioRef,
    seekingRef,
    handleEQGainsChange,
    connectEqualizer,
    disconnectEqualizer,
  }
}
