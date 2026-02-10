import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import { formatTime } from '../lib/formatTime'
import { type EQPreset } from '../lib/equalizer'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useMediaSession } from '../hooks/useMediaSession'
import { useScrobbling } from '../hooks/useScrobbling'
import { useSleepTimer } from '../hooks/useSleepTimer'
import { usePlayerKeyboard } from '../hooks/usePlayerKeyboard'
import { usePlaybackReporting } from '../hooks/usePlaybackReporting'
import { useSwipeAction } from '../hooks/useSwipeAction'
import KeyboardShortcuts from './KeyboardShortcuts'
import Waveform from './Waveform'
import Equalizer from './Equalizer'
import SleepTimer from './SleepTimer'

export default function Player() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    queue, queueIndex, sleepTimer, showNowPlaying,
    play, pause, toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle,
    cycleRepeat, setCurrentTime, setDuration, setShowNowPlaying, showQueue, setShowQueue,
    clearSleepTimer,
  } = usePlayerStore()
  const { serverUrl, api } = useAuthStore()
  const { audioQuality, crossfadeMode, crossfadeDuration, scrobbleSettings, eqGains, eqEnabled, setEQGains, setEQEnabled } = useUIStore()
  const navigate = useNavigate()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showEqualizer, setShowEqualizer] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)

  // Scrobbling
  const { scrobbleToast, handleTimeUpdate: scrobbleTimeUpdate } = useScrobbling({
    track: currentTrack,
    isPlaying,
    scrobbleSettings,
  })

  // Audio engine
  const { audioRef, seekingRef, handleEQGainsChange: applyEQGains, connectEqualizer, disconnectEqualizer } = useAudioEngine({
    trackId: currentTrack?.id,
    serverUrl: serverUrl ?? undefined,
    accessToken: api?.accessToken ?? undefined,
    audioQuality,
    isPlaying,
    volume,
    muted,
    crossfadeMode,
    crossfadeDuration,
    eqEnabled,
    eqGains,
    queue,
    queueIndex,
    repeat,
    onPlay: play,
    onSetCurrentTime: setCurrentTime,
    onSetDuration: setDuration,
    onNext: next,
    onTimeUpdate: (ct, dur, audioEl) => {
      if (!seekingRef.current) {
        scrobbleTimeUpdate(ct, dur, audioEl)
      }
    },
  })

  // Media session
  useMediaSession({
    track: currentTrack,
    audioRef,
    onPlay: () => { audioRef.current?.play(); play() },
    onPause: () => { audioRef.current?.pause(); pause() },
    onNext: next,
    onPrevious: previous,
    onSeek: (time) => {
      if (audioRef.current) audioRef.current.currentTime = time
      seek(time)
    },
  })

  // Sleep timer
  const { sleepTimerRemaining } = useSleepTimer({
    audioRef,
    sleepTimer,
    volume,
    onPause: pause,
    onClearTimer: clearSleepTimer,
    trackId: currentTrack?.id,
  })

  // Playback reporting to Jellyfin (enables play history, play counts)
  usePlaybackReporting({
    api: api ?? undefined,
    trackId: currentTrack?.id,
    isPlaying,
    currentTime,
    muted,
    volume,
  })

  // Keyboard shortcuts
  usePlayerKeyboard({
    volume,
    onToggle: toggle,
    onNext: next,
    onPrevious: previous,
    onMute: toggleMute,
    onVolumeChange: setVolume,
    onShowShortcuts: useCallback(() => setShowShortcuts(s => !s), []),
  })

  function handleArtistClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.artistId) navigate(`/artist/${currentTrack.artistId}`)
  }

  function handleAlbumClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (currentTrack?.albumId) navigate(`/album/${currentTrack.albumId}`)
  }

  function handleEQGainsChange(gains: number[]) {
    setEQGains(gains)
    applyEQGains(gains)
  }

  function handleEQPresetApply(preset: EQPreset) {
    handleEQGainsChange(preset.gains)
  }

  function toggleEqualizerEnabled() {
    const newEqEnabled = !eqEnabled
    setEQEnabled(newEqEnabled)
    if (newEqEnabled) {
      connectEqualizer()
    } else {
      disconnectEqualizer()
    }
  }

  // Swipe up to open Now Playing on mobile player bar
  const { touchHandlers: playerSwipeHandlers } = useSwipeAction({
    onSwipeMove: (_deltaX, deltaY) => {
      if (deltaY < -30) setShowNowPlaying(true)
    }
  })

  return (
    <AnimatePresence>
      {currentTrack && !showNowPlaying && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-50 left-0 right-0 border-t border-white/5 backdrop-blur-xl
            bottom-[56px] md:bottom-0"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,16,0.95) 0%, rgba(5,5,8,0.98) 100%)' }}
        >
          {/* Mobile grabber pill */}
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
              showTooltip={false}
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
                onClick={toggleEqualizerEnabled}
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
