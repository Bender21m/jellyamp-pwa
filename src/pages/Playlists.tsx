import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { fetchPlaylists, createPlaylist, getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import PlaylistCard from '../components/PlaylistCard'

export default function Playlists() {
  const { api, userId, serverUrl } = useAuthStore()
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!api || !userId) return
    loadPlaylists()
  }, [api, userId])

  async function loadPlaylists() {
    if (!api || !userId) return
    setLoading(true)
    try {
      const res = await fetchPlaylists(api, userId)
      setPlaylists(res.Items ?? [])
    } catch (e) {
      console.error('Playlists fetch failed', e)
    }
    setLoading(false)
  }

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

  const imgUrl = (item: BaseItemDto) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary) : ''

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Playlists</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-lg bg-surface border border-white/5 text-sm text-neon-cyan hover:bg-surface-hover transition-colors"
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
              className="flex-1 px-4 py-2 bg-surface border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-primary text-deep-black font-semibold text-sm disabled:opacity-50"
            >
              {creating ? '...' : 'Create'}
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <svg viewBox="0 0 24 24" className="w-16 h-16 mb-4 opacity-20" fill="currentColor">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
            <p className="text-sm">No playlists yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {playlists.map((p, i) => (
              <motion.div key={p.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <PlaylistCard
                  id={p.Id!}
                  name={p.Name ?? 'Untitled'}
                  imageUrl={p.ImageTags?.Primary ? imgUrl(p) : undefined}
                  trackCount={p.ChildCount ?? undefined}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
