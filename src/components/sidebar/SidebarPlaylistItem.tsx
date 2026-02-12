import { useState, useRef, useCallback, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { BaseItemDto } from '../../lib/jellyfin'
import { DRAG_FORMAT } from '../../lib/dragdrop'

interface SidebarPlaylistItemProps {
  playlist: BaseItemDto
  onDelete: (id: string, name: string) => void
  onDrop: (playlistId: string, playlistName: string, e: React.DragEvent) => void
}

export default function SidebarPlaylistItem({ playlist, onDelete, onDrop }: SidebarPlaylistItemProps) {
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
      {showCtx && createPortal(
        <div
          ref={ctxRef}
          className="fixed z-50 bg-card border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1.5 min-w-[160px]"
          style={{ left: ctxPos.x, top: ctxPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowCtx(false); onDelete(playlist.Id!, playlist.Name ?? 'Untitled') }}
            aria-label={`Delete playlist ${playlist.Name ?? 'Untitled'}`}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 min-h-[44px] focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            Delete Playlist
          </button>
        </div>,
        document.body
      )}
    </>
  )
}