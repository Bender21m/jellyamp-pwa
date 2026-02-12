import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { fetchPlaylists, createPlaylist, deletePlaylist, getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import PlaylistCard from '../components/PlaylistCard'
import EmptyState from '../components/EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

export default function Playlists() {
  const { api, userId, serverUrl } = useAuthStore()
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const loadPlaylists = useCallback(async () => {
    if (!api || !userId) return
     
    setLoading(true)
    try {
      const res = await fetchPlaylists(api, userId)
      setPlaylists(res.Items ?? [])
    } catch (e) {
      console.error('Playlists fetch failed', e)
    }
    setLoading(false)
  }, [api, userId])

   
  useEffect(() => {
    if (!api || !userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlaylists()
  }, [api, userId, loadPlaylists])

  // Pull to refresh setup
  const containerRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const { 
    containerRef: pullContainerRef, 
    touchHandlers, 
    isRefreshing: isPullRefreshing, 
    isPulling, 
    shouldTrigger, 
    progress 
  } = usePullToRefresh({
    onRefresh: loadPlaylists,
    disabled: !isTouchDevice
  })

  async function handleCreate() {
    if (!api || !userId || !newName.trim()) return
    setCreating(true)
    try {
      await createPlaylist(api, userId, newName.trim())
      setNewName('')
      setShowCreate(false)
      await loadPlaylists()
    } catch (e) {
      console.error('Create playlist failed', e)
    }
    setCreating(false)
  }

  async function handleDelete() {
    if (!api || !confirmDelete) return
    setDeleteError('')
    try {
      await deletePlaylist(api, confirmDelete.id)
      setConfirmDelete(null)
      await loadPlaylists()
    } catch (e: unknown) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        setDeleteError('Your account doesn\'t have permission to delete playlists on this server.')
      } else {
        setDeleteError('Failed to delete playlist. Try again.')
      }
    }
  }

  const imgUrl = (item: BaseItemDto) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, 400) : ''

  const gridCols = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7'

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Playlists</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2.5 rounded-lg bg-surface border border-white/5 text-sm text-neon-cyan hover:bg-surface-hover transition-colors min-h-[44px]"
          >
            + New Playlist
          </button>
        </div>

        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-4 py-2.5 bg-surface border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 min-h-[44px]"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-5 py-2.5 rounded-lg bg-gradient-primary text-deep-black font-semibold text-sm disabled:opacity-50 min-h-[44px]"
            >
              {creating ? '...' : 'Create'}
            </button>
          </motion.div>
        )}
      </div>

      <div 
        ref={(el) => {
          containerRef.current = el
          pullContainerRef(el)
        }}
        className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28 relative"
        {...touchHandlers}
      >
        {/* Pull to refresh indicator */}
        <PullToRefreshIndicator
          isVisible={isPulling}
          isRefreshing={isPullRefreshing}
          shouldTrigger={shouldTrigger}
          progress={progress}
        />
        {loading ? (
          <div className={gridCols}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-xl mb-3" />
                <div className="h-4 skeleton rounded w-3/4 mb-2" />
                <div className="h-3.5 skeleton rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
              </svg>
            }
            title="No playlists yet"
            subtitle="Create custom playlists to organize your favorite tracks."
            action={{
              label: "Create your first playlist",
              onClick: () => setShowCreate(true)
            }}
          />
        ) : (
          <div className={gridCols}>
            {playlists.map((p, i) => (
              <motion.div key={p.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <PlaylistCard
                  id={p.Id!}
                  name={p.Name ?? 'Untitled'}
                  imageUrl={p.ImageTags?.Primary ? imgUrl(p) : undefined}
                  trackCount={p.ChildCount ?? undefined}
                  onDelete={(id, name) => setConfirmDelete({ id, name })}
                />
              </motion.div>
            ))}
          </div>
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
                    onClick={handleDelete}
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
    </div>
  )
}
