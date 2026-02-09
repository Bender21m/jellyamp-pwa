import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { fetchFavorites, getImageUrl, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'

export default function Favorites() {
  const { api, userId, serverUrl } = useAuthStore()
  const [items, setItems] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || !userId) return
    loadFavorites()
  }, [api, userId])

  async function loadFavorites() {
    if (!api || !userId) return
    setLoading(true)
    try {
      const res = await fetchFavorites(api, userId, [BaseItemKind.MusicAlbum, BaseItemKind.MusicArtist])
      setItems(res.Items ?? [])
    } catch (e) {
      console.error('Favorites fetch failed', e)
    }
    setLoading(false)
  }

  const imgUrl = (item: BaseItemDto) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary) : ''

  const artists = items.filter(i => i.Type === BaseItemKind.MusicArtist)
  const albums = items.filter(i => i.Type === BaseItemKind.MusicAlbum)

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold">Favorites</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <svg viewBox="0 0 24 24" className="w-16 h-16 mb-4 opacity-20" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p className="text-sm">No favorites yet</p>
            <p className="text-xs mt-1">Tap the heart on albums and artists to add them</p>
          </div>
        ) : (
          <div className="space-y-8">
            {artists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Favorite Artists</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {artists.map(a => (
                    <ArtistCard key={a.Id} id={a.Id!} name={a.Name ?? ''} imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined} />
                  ))}
                </div>
              </section>
            )}
            {albums.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">Favorite Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {albums.map(a => (
                    <AlbumCard key={a.Id} id={a.Id!} name={a.Name ?? ''} artistName={a.AlbumArtist ?? ''} imageUrl={imgUrl(a)} year={a.ProductionYear ?? undefined} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
