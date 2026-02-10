import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { getStreamUrl } from '../lib/jellyfin'
import { useUIStore } from '../stores/ui'

export default function Player() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    play, pause, toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle,
    cycleRepeat, setCurrentTime, setDuration, setShowNowPlaying, showQueue, setShowQueue,
  } = usePlayerStore()
  const { serverUrl, api } = useAuthStore()
  const { audioQuality } = useUIStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)

  // Create/update audio
  useEffect(() => {
    if (!currentTrack || !serverUrl || !api?.accessToken) return

    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio

    const streamUrl = getStreamUrl(serverUrl, currentTrack.id, api.accessToken, audioQuality)
    audio.src = streamUrl
    audio.volume = muted ? 0 : volume

    const onError = (e: Event) => {
      const a = e.target as HTMLAudioElement
      console.error('[JellyAmp] Audio error:', a.error?.code, a.error?.message)
    }
    const onCanPlay = () => {
      audio.play().then(() => play()).catch((err) => console.error('[JellyAmp] Play failed:', err))
    }
    audio.addEventListener('error', onError)
    audio.addEventListener('canplay', onCanPlay, { once: true })
    audio.load()

    const onTimeUpdate = () => { if (!seekingRef.current) setCurrentTime(audio.currentTime) }
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
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [volume])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = pct * duration
    audioRef.current.currentTime = time
    seek(time)
  }, [duration])

  const handleSeekDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    seekingRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const onMove = (me: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      setCurrentTime(pct * duration)
    }
    const onUp = (me: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width))
      const time = pct * duration
      audioRef.current!.currentTime = time
      seek(time)
      seekingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration])

  function formatTime(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

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
          {/* Progress bar */}
          <div
            onClick={handleSeek}
            onMouseDown={handleSeekDrag}
            className="h-[2px] hover:h-1 bg-surface cursor-pointer group relative transition-[height] duration-150"
          >
            <div className="h-full bg-gradient-primary transition-none shadow-[0_0_6px_rgba(0,255,221,0.25)]" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_6px_rgba(0,255,221,0.5)] hidden md:block"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
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
