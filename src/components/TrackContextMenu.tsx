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
  const { playNext, addToQueue } = usePlayerStore()
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = track !== null && position !== null

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

  // Clamp menu position to viewport
  const menuStyle = position ? (() => {
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
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[100] w-[220px] bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          style={menuStyle}
        >
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
