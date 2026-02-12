import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/auth'
import { fetchPlaylists, fetchTracks, fetchArtistTracks, createPlaylist, deletePlaylist, addToPlaylist } from '../../lib/jellyfin'
import type { BaseItemDto } from '../../lib/jellyfin'
import { getDragData } from '../../lib/dragdrop'
import SidebarPlaylistItem from './SidebarPlaylistItem'

const SIDEBAR_ITEM_LIMIT = 8

interface SidebarPlaylistsProps {
  onDropToast: (message: string) => void
}

export default function SidebarPlaylists({ onDropToast }: SidebarPlaylistsProps) {
  const { api, userId } = useAuthStore()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const loadPlaylists = useCallback(async () => {
    if (!api || !userId) return
    try {
      const res = await fetchPlaylists(api, userId)
      setPlaylists(res.Items ?? [])
    } catch { /* ignore */ }
  }, [api, userId])

  useEffect(() => {
    if (!api || !userId) return
    // This is a standard async data loading pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlaylists()
  }, [api, userId, loadPlaylists])

  async function handleCreatePlaylist() {
    if (!api || !userId || !newPlaylistName.trim()) return
    setCreatingPlaylist(true)
    try {
      const result = await createPlaylist(api, userId, newPlaylistName.trim())
      setNewPlaylistName('')
      setShowCreatePlaylist(false)
      await loadPlaylists()
      if (result?.Id) navigate(`/playlist/${result.Id}`)
    } catch { /* ignore */ }
    setCreatingPlaylist(false)
  }

  async function handleDeletePlaylist() {
    if (!api || !confirmDelete) return
    setDeleteError('')
    try {
      await deletePlaylist(api, confirmDelete.id)
      setConfirmDelete(null)
      await loadPlaylists()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        setDeleteError('Your account doesn\'t have permission to delete playlists on this server.')
      } else {
        setDeleteError('Failed to delete playlist. Try again.')
      }
    }
  }

  async function handlePlaylistDrop(playlistId: string, playlistName: string, e: React.DragEvent) {
    if (!api || !userId) return
    const data = getDragData(e)
    if (!data) return

    try {
      let trackIds: string[] = []
      if (data.type === 'tracks' && data.trackIds) {
        trackIds = data.trackIds
      } else if (data.type === 'album' && data.albumId) {
        const res = await fetchTracks(api, userId, data.albumId)
        trackIds = (res.Items ?? []).map((t: BaseItemDto) => t.Id).filter((id): id is string => !!id)
      } else if (data.type === 'artist' && data.artistId) {
        const res = await fetchArtistTracks(api, userId, data.artistId)
        trackIds = (res.Items ?? []).map((t: BaseItemDto) => t.Id).filter((id): id is string => !!id)
      }

      if (trackIds.length === 0) return

      await addToPlaylist(api, playlistId, trackIds)
      const label = data.type === 'tracks'
        ? (data.label ?? '1 track')
        : `${data.label ?? 'items'} (${trackIds.length} tracks)`
      onDropToast(`Added ${label} to ${playlistName}`)
    } catch {
      onDropToast('Failed to add to playlist')
    }
  }

  const displayPlaylists = playlists.slice(0, SIDEBAR_ITEM_LIMIT)

  return (
    <>
      <div className="hidden lg:block px-3 pt-5">
        <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-center justify-between px-4 mb-2">
          <p className="text-[11px] font-mono uppercase tracking-widest text-text-muted/60">Playlists</p>
          <button
            onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
            aria-label="Create new playlist"
            className="text-text-muted/50 hover:text-neon-cyan transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {showCreatePlaylist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 mb-2 overflow-hidden"
            >
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePlaylist()
                    if (e.key === 'Escape') { setShowCreatePlaylist(false); setNewPlaylistName('') }
                  }}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-surface border border-white/10 rounded-md text-xs text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/30"
                />
                <button
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist || !newPlaylistName.trim()}
                  className="px-2.5 py-1.5 rounded-md bg-neon-cyan/20 text-neon-cyan text-xs font-semibold disabled:opacity-40 hover:bg-neon-cyan/30 transition-colors shrink-0"
                >
                  {creatingPlaylist ? '...' : '✓'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {displayPlaylists.length > 0 && (
          <nav className="space-y-0.5">
            {displayPlaylists.map((p) => (
              <SidebarPlaylistItem 
                key={p.Id} 
                playlist={p} 
                onDelete={(id, name) => setConfirmDelete({ id, name })} 
                onDrop={handlePlaylistDrop} 
              />
            ))}
          </nav>
        )}
        {playlists.length > SIDEBAR_ITEM_LIMIT && (
          <Link
            to="/playlists"
            className="block text-xs text-text-muted/50 hover:text-neon-cyan px-4 pt-2 transition-colors"
          >
            Show all ({playlists.length})
          </Link>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-lg font-bold mb-2">Delete Playlist</h3>
              <p className="text-sm text-text-secondary mb-3">
                Delete <span className="text-text-primary font-medium">"{confirmDelete.name}"</span>? This can't be undone.
              </p>
              {deleteError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmDelete(null); setDeleteError('') }}
                  className="flex-1 py-2.5 rounded-lg bg-surface border border-white/5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {deleteError ? 'Close' : 'Cancel'}
                </button>
                {!deleteError && (
                  <button
                    onClick={handleDeletePlaylist}
                    className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-500/20 text-sm text-red-400 font-semibold hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}