import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { fetchFavorites, BaseItemKind } from '../../lib/jellyfin'
import type { BaseItemDto } from '../../lib/jellyfin'
import SidebarArtistItem from './SidebarArtistItem'

const SIDEBAR_ITEM_LIMIT = 8

export default function SidebarFavorites() {
  const { api, userId } = useAuthStore()
  const [favoriteArtists, setFavoriteArtists] = useState<BaseItemDto[]>([])

  useEffect(() => {
    if (!api || !userId) return
    fetchFavorites(api, userId, [BaseItemKind.MusicArtist])
      .then(res => setFavoriteArtists(res.Items ?? []))
      .catch(() => {})
  }, [api, userId])

  const displayArtists = favoriteArtists.slice(0, SIDEBAR_ITEM_LIMIT)

  if (displayArtists.length === 0) return null

  return (
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
  )
}