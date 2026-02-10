import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { getStreamUrl } from '../lib/jellyfin'
import { useUIStore } from '../stores/ui'
import KeyboardShortcuts from './KeyboardShortcuts'
import Waveform from './Waveform'
import MiniPlayer from './MiniPlayer'
import { updateNowPlaying, scrobbleTrack, shouldScrobble } from '../lib/scrobble'

export default function Player() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    queue, queueIndex,
    play, pause, toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle,
    cycleRepeat, setCurrentTime, setDuration, setShowNowPlaying, showQueue, setShowQueue,
  } = usePlayerStore()
  const { serverUrl, api } = useAuthStore()
  const { audioQuality, crossfadeMode, crossfadeDuration, scrobbleSettings, showMiniPlayer, setShowMiniPlayer } = useUIStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)
  const crossfadeTimerRef = useRef<number | null>(null)
  const preloadedTrackIdRef = useRef<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Scrobbling state
  const scrobbledTracksRef = useRef<Set<string>>(new Set())
  const trackStartTimeRef = useRef<number | null>(null)
  const playedTimeRef = useRef<number>(0)
  const [scrobbleToast, setScrobbleToast] = useState('')

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
      audio.play().then(() => play()).catch((err) => console.error('[JellyAmp] Play failed:', err))
    }

    // If audio is already ready (preloaded), play immediately
    if (audio.readyState >= 3) {
      audio.volume = muted ? 0 : volume
      audio.play().then(() => play()).catch(() => {})
    } else {
      audio.addEventListener('canplay', onCanPlay, { once: true })
    }
    audio.addEventListener('error', onError)

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
    }
    const onDuration = () => { if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration) }
    const onEnded = () => next()

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
    }
  }, [currentTrack?.id])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

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
  }, [currentTrack?.id, scrobbleSettings.enabled])

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

  return (
    <AnimatePresence>
      {currentTrack && !showMiniPlayer && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-50 left-0 right-0 border-t border-white/5 backdrop-blur-xl
            bottom-[56px] md:bottom-0"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,16,0.95) 0%, rgba(5,5,8,0.98) 100%)' }}
        >
          {/* Waveform progress */}
          <div className="h-[2px] hover:h-2 transition-[height] duration-150">
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
          <div className="flex md:hidden items-center gap-3 px-4 py-2.5 min-h-[64px]"
            onClick={() => setShowNowPlaying(true)}
          >
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.4), 0 0 16px rgba(0,255,221,0.08)' }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate">{currentTrack.name}</p>
              <p className="text-[13px] text-text-secondary truncate">{currentTrack.artistName}</p>
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
                <p className="text-[13px] text-text-secondary truncate">{currentTrack.artistName}</p>
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
              <button
                onClick={() => setShowMiniPlayer(!showMiniPlayer)}
                className="p-2 rounded transition-colors text-text-muted hover:text-text-primary"
                title="Mini Player"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 7h-3V6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM9 6h6v1H9V6zm9 13H6V8h2v1a1 1 0 0 0 2 0V8h4v1a1 1 0 0 0 2 0V8h2v11z" />
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

      {/* Mini Player */}
      {currentTrack && showMiniPlayer && <MiniPlayer />}
      
      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcuts 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
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
