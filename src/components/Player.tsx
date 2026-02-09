import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'

export default function Player() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, shuffle, repeat,
    play, pause, toggle, next, previous, seek, setVolume, toggleShuffle,
    cycleRepeat, setCurrentTime, setDuration,
  } = usePlayerStore()
  const { serverUrl, api } = useAuthStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create and manage audio element
  useEffect(() => {
    if (!currentTrack || !serverUrl || !api?.accessToken) return

    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio

    const streamUrl = `${serverUrl}/Audio/${currentTrack.id}/universal?api_key=${api.accessToken}&audioCodec=aac&container=mp3&maxStreamingBitrate=320000`
    audio.src = streamUrl
    audio.volume = volume
    audio.play().then(() => play()).catch(() => {})

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.ondurationchange = () => setDuration(audio.duration)
    audio.onended = () => next()

    // Media Session API
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
    }

    return () => {
      audio.ontimeupdate = null
      audio.ondurationchange = null
      audio.onended = null
    }
  }, [currentTrack?.id])

  // Sync play/pause
  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [isPlaying])

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.code === 'ArrowRight' && e.shiftKey) next()
      if (e.code === 'ArrowLeft' && e.shiftKey) previous()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const time = pct * duration
    audioRef.current.currentTime = time
    seek(time)
  }

  function formatTime(s: number) {
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
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-text-muted/10 bg-card/95 backdrop-blur-xl"
        >
          {/* Progress bar (clickable) */}
          <div
            onClick={handleSeek}
            className="h-1 bg-surface cursor-pointer group relative"
          >
            <motion.div
              className="h-full bg-gradient-primary"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
            />
          </div>

          <div className="flex items-center gap-4 px-4 py-3">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentTrack.imageUrl && (
                <img
                  src={currentTrack.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
                <p className="text-xs text-text-muted truncate">{currentTrack.artistName}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors ${shuffle ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                title="Shuffle"
              >
                <ShuffleIcon />
              </button>
              <button onClick={previous} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                <PrevIcon />
              </button>
              <motion.button
                onClick={toggle}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-deep-black"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </motion.button>
              <button onClick={next} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                <NextIcon />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-neon-cyan' : 'text-text-muted hover:text-text-primary'}`}
                title={`Repeat: ${repeat}`}
              >
                <RepeatIcon one={repeat === 'one'} />
              </button>
            </div>

            {/* Time + Volume */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-xs text-text-muted font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="hidden sm:flex items-center gap-2">
                <VolumeIcon muted={volume === 0} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 accent-neon-cyan"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Icons
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

const PrevIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
)

const NextIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
)

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
)

const RepeatIcon = ({ one }: { one: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    {one ? (
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
    ) : (
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    )}
  </svg>
)

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted" fill="currentColor">
    {muted ? (
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    )}
  </svg>
)
