import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { getStreamUrl } from '../lib/jellyfin'
import { useUIStore } from '../stores/ui'
import KeyboardShortcuts from './KeyboardShortcuts'
import Waveform from './Waveform'
import Equalizer from './Equalizer'
import SleepTimer from './SleepTimer'
import { updateNowPlaying, scrobbleTrack, shouldScrobble } from '../lib/scrobble'
import { AudioEqualizer, type EQPreset } from '../lib/equalizer'
import { useSwipeAction } from '../hooks/useSwipeAction'

export default function Player() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    queue, queueIndex, sleepTimer,
    play, pause, toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle,
    cycleRepeat, setCurrentTime, setDuration, setShowNowPlaying, showQueue, setShowQueue,
    clearSleepTimer,
  } = usePlayerStore()
  const { serverUrl, api } = useAuthStore()
  const { audioQuality, crossfadeMode, crossfadeDuration, scrobbleSettings, eqGains, eqEnabled, setEQGains, setEQEnabled } = useUIStore()
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)
  const crossfadeTimerRef = useRef<number | null>(null)
  const preloadedTrackIdRef = useRef<string | null>(null)
  const equalizerRef = useRef<AudioEqualizer | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showEqualizer, setShowEqualizer] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0)
  
  // Scrobbling state
  const scrobbledTracksRef = useRef<Set<string>>(new Set())
  const trackStartTimeRef = useRef<number | null>(null)
  const playedTimeRef = useRef<number>(0)
  const [scrobbleToast, setScrobbleToast] = useState('')
  
  // Sleep timer state
  const sleepFadeRef = useRef<number | null>(null)
  
  // Fade-in state
  const fadeInRef = useRef<number | null>(null)
  const lastPauseTimeRef = useRef<number>(0)

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
    if (crossfadeMode === 'off' || !serverUrl || !api?.accessToken) return
    const nextTrack = getNextTrack()
    if (!nextTrack || preloadedTrackIdRef.current === nextTrack.id) return

    const nextAudio = new Audio()
    nextAudio.preload = 'auto'
    nextAudio.src = getStreamUrl(serverUrl, nextTrack.id, api.accessToken, audioQuality)
    nextAudio.volume = 0
    nextAudio.load()
    nextAudioRef.current = nextAudio
    preloadedTrackIdRef.current = nextTrack.id
  }, [crossfadeMode, serverUrl, api?.accessToken, audioQuality, getNextTrack])

  // Create/update audio
  useEffect(() => {
    if (!currentTrack || !serverUrl || !api?.accessToken) return

    // If we have a preloaded audio for this track, use it (gapless transition)
    let audio: HTMLAudioElement
    if (nextAudioRef.current && preloadedTrackIdRef.current === currentTrack.id) {
      audio = nextAudioRef.current
      nextAudioRef.current = null
      preloadedTrackIdRef.current = null
    } else {
      audio = audioRef.current ?? new Audio()
      const streamUrl = getStreamUrl(serverUrl, currentTrack.id, api.accessToken, audioQuality)
      audio.src = streamUrl
      audio.load()
    }

    // Clean up old audio if different
    if (audioRef.current && audioRef.current !== audio) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    audioRef.current = audio
    audio.volume = muted ? 0 : volume

    const onError = (e: Event) => {
      const a = e.target as HTMLAudioElement
      console.error('[JellyAmp] Audio error:', a.error?.code, a.error?.message)
    }
    const onCanPlay = () => {
      const targetVolume = muted ? 0 : volume
      if (crossfadeMode === 'gapless') {
        // No fade for gapless — instant volume to avoid dip between segued tracks
        audio.volume = targetVolume
      } else {
        startFadeIn(audio, targetVolume)
      }
      audio.play().then(() => play()).catch((err) => console.error('[JellyAmp] Play failed:', err))
    }

    // If audio is already ready (preloaded), play immediately
    // For gapless mode with preloaded audio: skip fade-in to avoid volume dip between tracks
    const isGaplessPreloaded = crossfadeMode === 'gapless' && audio.readyState >= 3
    if (audio.readyState >= 3) {
      const targetVolume = muted ? 0 : volume
      if (isGaplessPreloaded) {
        // Instant start — no fade, no gap
        audio.volume = targetVolume
      } else {
        startFadeIn(audio, targetVolume)
      }
      audio.play().then(() => play()).catch(() => {})
    } else {
      audio.addEventListener('canplay', onCanPlay, { once: true })
    }
    audio.addEventListener('error', onError)

    // Initialize EQ if enabled
    if (eqEnabled && !equalizerRef.current) {
      initializeEqualizer(audio)
    } else if (eqEnabled && equalizerRef.current) {
      // Reconnect EQ to new audio element
      equalizerRef.current.connectToAudio(audio).catch(console.error)
    }

    const onTimeUpdate = () => {
      if (!seekingRef.current) setCurrentTime(audio.currentTime)

      // Track playing time for scrobbling
      if (trackStartTimeRef.current && isPlaying && !seekingRef.current) {
        const now = Date.now()
        const timeSinceStart = (now - trackStartTimeRef.current) / 1000
        playedTimeRef.current = Math.min(timeSinceStart, audio.currentTime)

        // Check if we should scrobble this track
        if (
          currentTrack && 
          !scrobbledTracksRef.current.has(currentTrack.id) && 
          audio.duration && 
          shouldScrobble(playedTimeRef.current, audio.duration)
        ) {
          scrobbledTracksRef.current.add(currentTrack.id)
          scrobbleTrack(currentTrack, trackStartTimeRef.current, scrobbleSettings)
            .then((success) => {
              if (success) {
                setScrobbleToast('♫ Scrobbled')
                setTimeout(() => setScrobbleToast(''), 2000)
              }
            })
            .catch(() => {})
        }
      }

      // Preload next track when 10 seconds from end
      if (audio.duration && isFinite(audio.duration) && audio.duration - audio.currentTime < 10) {
        preloadNext()
      }

      // Start crossfade when approaching end
      if (crossfadeMode === 'crossfade' && audio.duration && isFinite(audio.duration)) {
        const timeLeft = audio.duration - audio.currentTime
        if (timeLeft <= crossfadeDuration && timeLeft > 0 && nextAudioRef.current) {
          // Fade out current, fade in next
          const progress = 1 - (timeLeft / crossfadeDuration)
          audio.volume = (muted ? 0 : volume) * (1 - progress)
          nextAudioRef.current.volume = (muted ? 0 : volume) * progress
          if (nextAudioRef.current.paused) {
            nextAudioRef.current.play().catch(() => {})
          }
        }
      }

      // Gapless: ensure next audio is fully buffered and ready before current ends
      // We do NOT start it early or overlap — live recordings segue directly
      // Instead we just make sure it's preloaded so play() is instant on 'ended'
      if (crossfadeMode === 'gapless' && audio.duration && isFinite(audio.duration)) {
        const timeLeft = audio.duration - audio.currentTime
        // Preload aggressively at 15s, then ensure buffered at 3s
        if (timeLeft <= 15) preloadNext()
        if (timeLeft <= 3 && nextAudioRef.current) {
          // Force the browser to buffer by loading
          if (nextAudioRef.current.readyState < 3) {
            nextAudioRef.current.load()
          }
        }
      }
    }
    const onDuration = () => { if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration) }
    const onEnded = () => {
      // For gapless: the next audio is preloaded, so next() will pick it up
      // and play() will be near-instant since it's already buffered
      next()
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnded)

    // Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artistName ?? '',
        album: currentTrack.albumName ?? '',
        artwork: currentTrack.imageUrl
          ? [{ src: currentTrack.imageUrl, sizes: '300x300', type: 'image/jpeg' }]
          : [],
      })
      navigator.mediaSession.setActionHandler('play', () => { audio.play(); play() })
      navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); pause() })
      navigator.mediaSession.setActionHandler('previoustrack', previous)
      navigator.mediaSession.setActionHandler('nexttrack', next)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          audio.currentTime = details.seekTime
          seek(details.seekTime)
        }
      })
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
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
  }, [currentTrack?.id])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      // Check if this is a resume after brief pause (< 500ms)
      const timeSinceLastPause = Date.now() - lastPauseTimeRef.current
      const isShortPause = timeSinceLastPause < 500
      
      if (!isShortPause && audioRef.current.currentTime === 0) {
        // Start of track or long pause - apply fade
        const targetVolume = muted ? 0 : volume
        startFadeIn(audioRef.current, targetVolume)
      }
      
      audioRef.current.play().catch(() => {})
    } else {
      lastPauseTimeRef.current = Date.now()
      audioRef.current.pause()
    }
  }, [isPlaying, muted, volume, startFadeIn])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  // Listen for seek events from NowPlaying (or any external component)
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

  // Handle scrobbling track changes and "now playing" updates
  useEffect(() => {
    if (!currentTrack) return

    // Reset scrobbling state for new track
    trackStartTimeRef.current = Date.now()
    playedTimeRef.current = 0

    // Send "now playing" update to scrobbling services
    if (scrobbleSettings.enabled) {
      updateNowPlaying(currentTrack, scrobbleSettings).catch(() => {})
    }

    // Handle sleep timer "end of track" mode
    if (sleepTimer.active && sleepTimer.mode === 'track') {
      // Don't start fade immediately, wait for track to actually end naturally
    }
  }, [currentTrack?.id, scrobbleSettings.enabled, sleepTimer.active, sleepTimer.mode])

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
          const fadeInterval = 50 // Update every 50ms
          const steps = 5000 / fadeInterval // 100 steps over 5 seconds
          let step = 0

          sleepFadeRef.current = window.setInterval(() => {
            if (!audioRef.current) return
            
            step++
            const progress = step / steps
            const newVolume = fadeStartVolume * (1 - progress)
            
            audioRef.current.volume = Math.max(0, newVolume)
            
            if (step >= steps) {
              // Fade complete, pause and clear timer
              pause()
              clearSleepTimer()
              if (sleepFadeRef.current) {
                clearInterval(sleepFadeRef.current)
                sleepFadeRef.current = null
              }
              // Restore volume for next time
              audioRef.current.volume = sleepTimer.originalVolume
            }
          }, fadeInterval)
        }

        // Timer expired
        if (remaining <= 0) {
          pause()
          clearSleepTimer()
          setSleepTimerRemaining(0)
          if (sleepFadeRef.current) {
            clearInterval(sleepFadeRef.current)
            sleepFadeRef.current = null
          }
          // Restore volume
          if (audioRef.current) {
            audioRef.current.volume = sleepTimer.originalVolume
          }
        }
      }
    }

    const interval = setInterval(checkTimer, 1000)
    checkTimer() // Run immediately

    return () => {
      clearInterval(interval)
      if (sleepFadeRef.current) {
        clearInterval(sleepFadeRef.current)
        sleepFadeRef.current = null
      }
    }
  }, [sleepTimer, volume, pause, clearSleepTimer])

  // Handle track end for "end of track" sleep timer
  useEffect(() => {
    if (!audioRef.current) return

    const handleTrackEnd = () => {
      if (sleepTimer.active && sleepTimer.mode === 'track') {
        // Track ended naturally, activate sleep timer
        pause()
        clearSleepTimer()
      }
    }

    const audio = audioRef.current
    audio.addEventListener('ended', handleTrackEnd)

    return () => {
      audio.removeEventListener('ended', handleTrackEnd)
    }
  }, [sleepTimer.active, sleepTimer.mode, pause, clearSleepTimer])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (true) {
        case e.code === 'Space': e.preventDefault(); toggle(); break
        case e.code === 'ArrowRight' && e.shiftKey: next(); break
        case e.code === 'ArrowLeft' && e.shiftKey: previous(); break
        case e.code === 'KeyM': toggleMute(); break
        case e.code === 'ArrowUp' && !e.shiftKey: e.preventDefault(); setVolume(Math.min(1, volume + 0.05)); break
        case e.code === 'ArrowDown' && !e.shiftKey: e.preventDefault(); setVolume(Math.max(0, volume - 0.05)); break
        case e.key === '?': e.preventDefault(); setShowShortcuts(s => !s); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [volume])

  function formatTime(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function handleArtistClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.artistId) {
      navigate(`/artist/${currentTrack.artistId}`)
    }
  }

  function handleAlbumClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.albumId) {
      navigate(`/album/${currentTrack.albumId}`)
    }
  }

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

  // Handle EQ gain changes
  function handleEQGainsChange(gains: number[]) {
    setEQGains(gains)
    if (equalizerRef.current?.connected) {
      equalizerRef.current.setEQGains(gains)
    }
  }

  // Handle EQ preset application
  function handleEQPresetApply(preset: EQPreset) {
    handleEQGainsChange(preset.gains)
  }

  // Toggle EQ on/off
  function toggleEqualizer() {
    const newEqEnabled = !eqEnabled
    setEQEnabled(newEqEnabled)
    
    if (newEqEnabled && audioRef.current) {
      // Initialize EQ
      initializeEqualizer(audioRef.current)
    } else if (!newEqEnabled && equalizerRef.current) {
      // Disable EQ
      equalizerRef.current.disconnect()
      equalizerRef.current = null
    }
  }

  // Swipe up to open Now Playing on mobile player bar
  const { touchHandlers: playerSwipeHandlers } = useSwipeAction({
    onSwipeMove: (_deltaX, deltaY) => {
      // Swipe up (negative deltaY)
      if (deltaY < -30) {
        setShowNowPlaying(true)
      }
    }
  })

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-50 left-0 right-0 border-t border-white/5 backdrop-blur-xl
            bottom-[56px] md:bottom-0"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,16,0.95) 0%, rgba(5,5,8,0.98) 100%)' }}
        >
          {/* Mobile grabber pill — hints swipe-up */}
          <div className="md:hidden flex justify-center pt-1.5 pb-0">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>

          {/* Mobile progress line */}
          <div className="md:hidden h-0.5 w-full bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-300 ease-out"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Desktop waveform progress */}
          <div className="hidden md:block h-[2px] hover:h-2 transition-[height] duration-150">
            <Waveform
              currentTime={currentTime}
              duration={duration}
              onSeek={(time) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = time
                  seek(time)
                }
              }}
              onSeekStart={() => { seekingRef.current = true }}
              onSeekEnd={() => { seekingRef.current = false }}
              trackId={currentTrack?.id}
              className="h-full"
              barCount={120}
              showTooltip={false} // No tooltip on minimal player bar
            />
          </div>

          {/* Mobile: simplified player bar */}
          <div 
            className="flex md:hidden items-center gap-3 px-4 py-2.5 min-h-[64px] cursor-pointer active:bg-white/5 transition-colors"
            onClick={() => setShowNowPlaying(true)}
            {...playerSwipeHandlers}
          >
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.4), 0 0 16px rgba(0,255,221,0.08)' }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate">{currentTrack.name}</p>
              <button
                onClick={handleArtistClick}
                className="text-[13px] text-text-secondary hover:text-neon-cyan transition-colors cursor-pointer truncate block"
                title={`Go to ${currentTrack.artistName}`}
              >
                {currentTrack.artistName}
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggle() }}
              className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-deep-black shrink-0"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          {/* Desktop: full player bar */}
          <div className="hidden md:flex items-center gap-4 px-4 lg:px-6 py-3 min-h-[72px]">
            {/* Track info */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => setShowNowPlaying(true)}
            >
              {currentTrack.imageUrl && (
                <motion.img
                  key={currentTrack.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={currentTrack.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,221,0.08)' }}
                />
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold truncate hover:text-neon-cyan transition-colors">{currentTrack.name}</p>
                <div className="text-[13px] text-text-secondary truncate flex items-center gap-1">
                  {currentTrack.artistName && (
                    <>
                      <button
                        onClick={handleArtistClick}
                        className="text-text-secondary hover:text-neon-cyan transition-colors cursor-pointer truncate"
                        title={`Go to ${currentTrack.artistName}`}
                      >
                        {currentTrack.artistName}
                      </button>
                      {currentTrack.albumName && <span className="text-text-secondary/60">•</span>}
                    </>
                  )}
                  {currentTrack.albumName && (
                    <button
                      onClick={handleAlbumClick}
                      className="text-text-secondary hover:text-neon-cyan transition-colors cursor-pointer truncate"
                      title={`Go to ${currentTrack.albumName}`}
                    >
                      {currentTrack.albumName}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <ControlButton onClick={toggleShuffle} active={shuffle} title="Shuffle">
                <ShuffleIcon />
              </ControlButton>
              <ControlButton onClick={previous} title="Previous">
                <PrevIcon />
              </ControlButton>
              <motion.button
                onClick={toggle}
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-deep-black mx-1 hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </motion.button>
              <ControlButton onClick={next} title="Next">
                <NextIcon />
              </ControlButton>
              <ControlButton onClick={cycleRepeat} active={repeat !== 'off'} title={`Repeat: ${repeat}`}>
                <RepeatIcon one={repeat === 'one'} />
              </ControlButton>
            </div>

            {/* Time + Volume + Queue */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-[13px] text-text-muted font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-text-muted hover:text-text-primary transition-colors">
                  <VolumeIcon muted={muted || volume === 0} />
                </button>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 accent-neon-cyan h-1"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSleepTimer(!showSleepTimer)}
                  className={`p-2 rounded transition-colors relative ${sleepTimer.active ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                  title="Sleep Timer"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M6 6.9L3.87 4.78l1.41-1.41L7.05 5.14C8.23 4.43 9.57 4 11 4c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9c0-1.43.43-2.77 1.14-3.95L1.37 7.28l1.41-1.41L6 8.74V6.9zM12 6c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 3h-2v6h6v-2h-4V9z" />
                  </svg>
                  {sleepTimer.active && sleepTimer.mode === 'time' && sleepTimerRemaining > 0 && (
                    <span className="absolute -top-1 -right-1 bg-neon-cyan text-deep-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] leading-tight">
                      {Math.ceil(sleepTimerRemaining / (1000 * 60))}m
                    </span>
                  )}
                  {sleepTimer.active && sleepTimer.mode === 'track' && (
                    <span className="absolute -top-1 -right-1 bg-neon-cyan text-deep-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] leading-tight">
                      ♪
                    </span>
                  )}
                </button>
                <SleepTimer
                  isOpen={showSleepTimer}
                  onClose={() => setShowSleepTimer(false)}
                />
              </div>
              <button
                onClick={toggleEqualizer}
                className={`p-2 rounded transition-colors ${eqEnabled ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                title="Equalizer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M7 20h4v-9H7v9zm6-16h-4v7h4V4zm6 0h-4v3h4V4zm0 5h-4v11h4V9z" />
                </svg>
              </button>
              <button
                onClick={() => setShowEqualizer(!showEqualizer)}
                className={`p-2 rounded transition-colors ${showEqualizer ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                title="EQ Settings"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                </svg>
              </button>
              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`p-2 rounded transition-colors ${showQueue ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                title="Queue"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcuts 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      {/* Equalizer overlay */}
      <Equalizer
        isOpen={showEqualizer}
        onClose={() => setShowEqualizer(false)}
        gains={eqGains}
        onGainsChange={handleEQGainsChange}
        onPresetApply={handleEQPresetApply}
      />

      {/* Scrobble toast */}
      <AnimatePresence>
        {scrobbleToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="px-4 py-2 bg-deep-black/90 backdrop-blur-sm text-neon-cyan text-sm rounded-lg border border-neon-cyan/20 shadow-[0_0_20px_rgba(0,255,221,0.2)]">
              {scrobbleToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}

function ControlButton({ onClick, active, title, children }: {
  onClick: () => void, active?: boolean, title?: string, children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-full transition-colors ${active ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
    >
      {children}
    </button>
  )
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
)
const PrevIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
)
const NextIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
)
const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
)
const RepeatIcon = ({ one }: { one: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    {one ? <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
      : <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />}
  </svg>
)
const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    {muted ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />}
  </svg>
)
