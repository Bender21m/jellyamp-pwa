import { useEffect, useState, useRef, useCallback } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore } from '../stores/player'
import { fetchPlaylists, fetchFavorites, fetchTracks, fetchArtistTracks, createPlaylist, deletePlaylist, addToPlaylist, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { getDragData, DRAG_FORMAT } from '../lib/dragdrop'
import OnThisDay from './OnThisDay'
import logoSvg from '../assets/logo.svg'

const SIDEBAR_ITEM_LIMIT = 8

const libraryNav = [
  { to: '/library', label: 'Library', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { to: '/search', label: 'Search', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { to: '/favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { to: '/history', label: 'History', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
  { to: '/playlists', label: 'Playlists', icon: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z' },
]

const bottomNav = [
  { to: '/settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
]

function NavItem({ item, collapsed }: { item: typeof libraryNav[0]; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg text-[14px] font-semibold transition-all duration-200 group
        ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}
        ${isActive
          ? 'bg-neon-cyan/8 text-neon-cyan'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-neon-cyan shadow-[0_0_8px_rgba(0,255,221,0.5)]"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${isActive ? 'text-neon-cyan' : 'text-text-muted group-hover:text-text-secondary'}`} fill="currentColor">
            <path d={item.icon} />
          </svg>
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

function SidebarPlaylistItem({ playlist, onDelete, onDrop }: {
  playlist: BaseItemDto
  onDelete: (id: string, name: string) => void
  onDrop: (playlistId: string, playlistName: string, e: React.DragEvent) => void
}) {
  const [showCtx, setShowCtx] = useState(false)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)
  const ctxRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setCtxPos({ x: e.clientX, y: e.clientY })
    setShowCtx(true)
  }, [])

  useEffect(() => {
    if (!showCtx) return
    const close = () => setShowCtx(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showCtx])

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes(DRAG_FORMAT)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(playlist.Id!, playlist.Name ?? 'Untitled', e)
  }

  return (
    <>
      <NavLink
        to={`/playlist/${playlist.Id}`}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={({ isActive }) =>
          `relative block text-sm truncate py-1.5 px-4 rounded-md transition-all duration-200
          ${isDragOver
            ? 'text-neon-cyan bg-neon-cyan/15 ring-1 ring-neon-cyan/40 shadow-[0_0_12px_rgba(0,255,221,0.15)]'
            : isActive
              ? 'text-neon-cyan bg-neon-cyan/5'
              : 'text-text-muted hover:text-text-primary hover:bg-white/5'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {(isActive && !isDragOver) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-neon-cyan shadow-[0_0_6px_rgba(0,255,221,0.4)]" />
            )}
            <span className="truncate block">{playlist.Name ?? 'Untitled'}</span>
          </>
        )}
      </NavLink>
      {showCtx && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-card border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1.5 min-w-[160px]"
          style={{ left: ctxPos.x, top: ctxPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowCtx(false); onDelete(playlist.Id!, playlist.Name ?? 'Untitled') }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            Delete Playlist
          </button>
        </div>
      )}
    </>
  )
}

function SidebarArtistItem({ artist }: { artist: BaseItemDto }) {
  return (
    <NavLink
      to={`/artist/${artist.Id}`}
      className={({ isActive }) =>
        `relative block text-sm truncate py-1.5 px-4 rounded-md transition-all duration-200
        ${isActive
          ? 'text-neon-cyan bg-neon-cyan/5'
          : 'text-text-muted hover:text-text-primary hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-neon-cyan shadow-[0_0_6px_rgba(0,255,221,0.4)]" />
          )}
          <span className="truncate block">{artist.Name ?? 'Unknown'}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { username, api, userId } = useAuthStore()
  const { currentTrack, setShowNowPlaying } = usePlayerStore()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [favoriteArtists, setFavoriteArtists] = useState<BaseItemDto[]>([])
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [dropToast, setDropToast] = useState('')

  async function loadPlaylists() {
    if (!api || !userId) return
    try {
      const res = await fetchPlaylists(api, userId)
      setPlaylists(res.Items ?? [])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!api || !userId) return
    loadPlaylists()
    fetchFavorites(api, userId, [BaseItemKind.MusicArtist]).then(res => setFavoriteArtists(res.Items ?? [])).catch(() => {})
  }, [api, userId])

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
    } catch (e: any) {
      const status = e?.response?.status
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
        trackIds = (res.Items ?? []).map((t: any) => t.Id).filter(Boolean)
      } else if (data.type === 'artist' && data.artistId) {
        const res = await fetchArtistTracks(api, userId, data.artistId)
        trackIds = (res.Items ?? []).map((t: any) => t.Id).filter(Boolean)
      }

      if (trackIds.length === 0) return

      await addToPlaylist(api, playlistId, trackIds)
      const label = data.type === 'tracks'
        ? (data.label ?? '1 track')
        : `${data.label ?? 'items'} (${trackIds.length} tracks)`
      setDropToast(`Added ${label} to ${playlistName}`)
      setTimeout(() => setDropToast(''), 2500)
    } catch {
      setDropToast('Failed to add to playlist')
      setTimeout(() => setDropToast(''), 2500)
    }
  }

  const displayPlaylists = playlists.slice(0, SIDEBAR_ITEM_LIMIT)
  const displayArtists = favoriteArtists.slice(0, SIDEBAR_ITEM_LIMIT)

  return (
    <aside className="hidden md:flex h-full flex-col bg-card/50 border-r border-white/5 backdrop-blur-sm shrink-0 overflow-hidden
      md:w-[72px] lg:w-[280px]">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 lg:px-5 py-5 shrink-0">
        <div className="w-9 h-9 shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 221, 0.3))' }}>
          <img src={logoSvg} alt="JellyAmp" className="w-full h-full" />
        </div>
        <span className="hidden lg:block text-lg font-extrabold text-gradient tracking-[-0.03em]">
          JellyAmp
        </span>
      </div>

      {/* Separator */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />

      {/* Library section */}
      <div className="px-2 lg:px-3 pt-4">
        <p className="hidden lg:block text-[11px] font-mono uppercase tracking-widest text-text-muted/60 px-4 mb-2">Library</p>
        <nav className="space-y-1">
          {libraryNav.map((item) => (
            <NavItem key={item.to} item={item} collapsed={false} />
          ))}
        </nav>
      </div>

      {/* Scrollable middle section for playlists + favorites */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Playlists section */}
        <div className="hidden lg:block px-3 pt-5">
          <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="flex items-center justify-between px-4 mb-2">
            <p className="text-[11px] font-mono uppercase tracking-widest text-text-muted/60">Playlists</p>
            <button
              onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
              className="text-text-muted/50 hover:text-neon-cyan transition-colors p-0.5"
              title="New Playlist"
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
                <SidebarPlaylistItem key={p.Id} playlist={p} onDelete={(id, name) => setConfirmDelete({ id, name })} onDrop={handlePlaylistDrop} />
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

        {/* Favorite Artists section */}
        {displayArtists.length > 0 && (
          <div className="hidden lg:block px-3 pt-5">
            <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <p className="text-[11px] font-mono uppercase tracking-widest text-text-muted/60 px-4 mb-2">Favorites</p>
            <nav className="space-y-0.5">
              {displayArtists.map((a) => (
                <SidebarArtistItem key={a.Id} artist={a} />
              ))}
            </nav>
            {favoriteArtists.length > SIDEBAR_ITEM_LIMIT && (
              <Link
                to="/favorites"
                className="block text-xs text-text-muted/50 hover:text-neon-cyan px-4 pt-2 transition-colors"
              >
                Show all ({favoriteArtists.length})
              </Link>
            )}
          </div>
        )}

        {/* On This Day */}
        <OnThisDay />
      </div>

      {/* Now Playing mini (desktop only) */}
      {currentTrack && (
        <div className="hidden lg:block mx-3 mb-3">
          <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <button
            onClick={() => setShowNowPlaying(true)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
          >
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10" />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold truncate group-hover:text-neon-cyan transition-colors">{currentTrack.name}</p>
              <p className="text-[11px] text-text-muted truncate">{currentTrack.artistName}</p>
            </div>
          </button>
        </div>
      )}

      {/* Settings + User */}
      <div className="px-2 lg:px-3 pb-2 shrink-0">
        {bottomNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={false} />
        ))}
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent shrink-0" />

      <div className="px-3 lg:px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-neon-pink flex items-center justify-center text-xs font-bold text-white shrink-0">
            {username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="hidden lg:block text-sm text-text-secondary truncate">
            {username}
          </span>
        </div>
      </div>
      {/* Drop toast */}
      <AnimatePresence>
        {dropToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan text-sm font-medium shadow-[0_8px_30px_rgba(0,255,221,0.15)] backdrop-blur-md"
          >
            {dropToast}
          </motion.div>
        )}
      </AnimatePresence>

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
    </aside>
  )
}
