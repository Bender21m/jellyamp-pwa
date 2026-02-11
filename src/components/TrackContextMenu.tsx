import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchPlaylists, addToPlaylist, createPlaylist, removeFromPlaylist } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'

interface ContextMenuProps {
  track: Track | null
  position: { x: number; y: number } | null
  onClose: () => void
  playlistId?: string // if viewing a playlist, enables "Remove from Playlist"
  onRemoveFromPlaylist?: () => void // callback after removal to refresh
}

export default function TrackContextMenu({ track, position, onClose, playlistId, onRemoveFromPlaylist }: ContextMenuProps) {
  const { api, userId } = useAuthStore()
  const playNext = usePlayerStore(s => s.playNext)
  const addToQueue = usePlayerStore(s => s.addToQueue)
  const setTrack = usePlayerStore(s => s.setTrack)
  const setRadioMode = usePlayerStore(s => s.setRadioMode)
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = track !== null && position !== null
  const isMobile = window.matchMedia('(hover: none)').matches

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // Use pointerdown instead of mousedown — works for both mouse and touch,
    // and fires on the correct target (not stealing clicks from child buttons)
    document.addEventListener('pointerdown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (showPlaylists && api && userId) {
      setLoadingPlaylists(true)
      fetchPlaylists(api, userId)
        .then(res => setPlaylists(res.Items ?? []))
        .catch(() => {})
        .finally(() => setLoadingPlaylists(false))
    }
  }, [showPlaylists, api, userId])

  useEffect(() => {
    if (showNewInput) inputRef.current?.focus()
  }, [showNewInput])

  // Reset submenu state when menu opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowPlaylists(false)
      setShowNewInput(false)
      setNewPlaylistName('')
      setFeedback(null)
    }
  }, [isOpen])

  function showFeedbackAndClose(msg: string) {
    setFeedback(msg)
    setTimeout(() => onClose(), 800)
  }

  async function handleAddToPlaylist(playlistId: string) {
    if (!api || !track) return
    try {
      await addToPlaylist(api, playlistId, [track.id])
      showFeedbackAndClose('Added!')
    } catch {
      showFeedbackAndClose('Failed')
    }
  }

  async function handleCreateAndAdd() {
    if (!api || !userId || !track || !newPlaylistName.trim()) return
    try {
      const { Id } = await createPlaylist(api, userId, newPlaylistName.trim())
      await addToPlaylist(api, Id, [track.id])
      showFeedbackAndClose('Created & added!')
    } catch {
      showFeedbackAndClose('Failed')
    }
  }

  function handlePlayNext() {
    if (track) {
      playNext(track)
      showFeedbackAndClose('Playing next')
    }
  }

  function handleAddToQueue() {
    if (track) {
      addToQueue([track])
      showFeedbackAndClose('Added to queue')
    }
  }

  // Position menu - desktop: clamped to viewport, mobile: bottom sheet
  const menuStyle = position && !isMobile ? (() => {
    const menuW = 220, menuH = 200
    let x = position.x, y = position.y
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8
    if (x < 8) x = 8
    if (y < 8) y = 8
    return { left: x, top: y }
  })() : undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: backdrop overlay */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
              onClick={onClose}
            />
          )}
          
          <motion.div
            ref={menuRef}
            initial={isMobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.92 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.92 }}
            transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : { duration: 0.12 }}
            className={`fixed z-[100] bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden ${
              isMobile
                ? 'left-0 right-0 bottom-0 rounded-t-2xl mx-2 mb-2'
                : 'w-[220px] rounded-xl'
            }`}
            style={menuStyle}
          >
          {/* Mobile: handle bar */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-white/20" />
            </div>
          )}
          
          {feedback ? (
            <div className="px-4 py-3 text-sm text-neon-cyan font-semibold text-center">{feedback}</div>
          ) : !showPlaylists ? (
            <div className="py-1.5">
              <MenuItem
                icon="M8 5v14l11-7z"
                label="Play Next"
                onClick={handlePlayNext}
              />
              <MenuItem
                icon="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"
                label="Add to Queue"
                onClick={handleAddToQueue}
              />
              <div className="mx-3 my-1.5 h-px bg-white/5" />
              <MenuItem
                icon="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z"
                label="Start Radio"
                onClick={() => {
                  if (track) {
                    setTrack(track, [track], 0)
                    setRadioMode(true, track.id)
                    showFeedbackAndClose('Radio started')
                  }
                }}
              />
              <div className="mx-3 my-1.5 h-px bg-white/5" />
              <MenuItem
                icon="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"
                label="Add to Playlist"
                onClick={() => setShowPlaylists(true)}
                hasSubmenu
              />
              {playlistId && track?.playlistItemId && (
                <>
                  <div className="mx-3 my-1.5 h-px bg-white/5" />
                  <MenuItem
                    icon="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                    label="Remove from Playlist"
                    onClick={async () => {
                      if (!api || !track?.playlistItemId) return
                      try {
                        await removeFromPlaylist(api, playlistId, [track.playlistItemId])
                        showFeedbackAndClose('Removed from playlist')
                        onRemoveFromPlaylist?.()
                      } catch { onClose() }
                    }}
                    danger
                  />
                </>
              )}
            </div>
          ) : (
            <div className="py-1.5">
              <button
                onClick={() => setShowPlaylists(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                Back
              </button>
              <div className="mx-3 my-1 h-px bg-white/5" />
              {loadingPlaylists ? (
                <div className="px-4 py-3 text-xs text-text-muted">Loading...</div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto">
                  {playlists.map(p => (
                    <button
                      key={p.Id}
                      onClick={() => handleAddToPlaylist(p.Id!)}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 truncate transition-colors"
                    >
                      {p.Name}
                    </button>
                  ))}
                </div>
              )}
              <div className="mx-3 my-1 h-px bg-white/5" />
              {showNewInput ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateAndAdd() }}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    placeholder="Playlist name"
                    className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-neon-cyan/40"
                  />
                  <button
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="shrink-0 text-neon-cyan text-sm font-semibold disabled:opacity-30"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewInput(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neon-cyan hover:bg-white/5 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  New Playlist
                </button>
              )}
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function MenuItem({ icon, label, onClick, hasSubmenu, danger }: {
  icon: string; label: string; onClick: () => void; hasSubmenu?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
      }`}
    >
      <svg viewBox="0 0 24 24" className={`w-4 h-4 shrink-0 ${danger ? 'text-red-400' : 'text-text-muted'}`} fill="currentColor">
        <path d={icon} />
      </svg>
      <span className="flex-1 text-left">{label}</span>
      {hasSubmenu && (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-text-muted" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      )}
    </button>
  )
}
