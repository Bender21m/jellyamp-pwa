import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { fetchFavorites, getImageUrl, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import EmptyState from '../components/EmptyState'

export default function Favorites() {
  const { api, userId, serverUrl } = useAuthStore()
  const navigate = useNavigate()
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
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, 400) : ''

  const artists = items.filter(i => i.Type === BaseItemKind.MusicArtist)
  const albums = items.filter(i => i.Type === BaseItemKind.MusicAlbum)

  const gridCols = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7'

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Favorites</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28">
        {loading ? (
          <div className={gridCols}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-xl mb-3" />
                <div className="h-4 skeleton rounded w-3/4 mb-2" />
                <div className="h-3.5 skeleton rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            }
            title="No favorites yet"
            subtitle="Tap the heart on albums and artists to add them to your favorites."
            action={{
              label: "Browse your library",
              onClick: () => navigate('/library')
            }}
          />
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-bold tracking-[-0.02em] mb-4">Favorite Artists</h2>
              {artists.length > 0 ? (
                <div className={gridCols}>
                  {artists.map(a => (
                    <ArtistCard key={a.Id} id={a.Id!} name={a.Name ?? ''} imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-muted">
                  <p className="text-sm">No favorite artists yet</p>
                  <p className="text-xs mt-1 text-text-muted/60">Tap the ♥ on any artist to add them here</p>
                </div>
              )}
            </section>
            <section>
              <h2 className="text-lg font-bold tracking-[-0.02em] mb-4">Favorite Albums</h2>
              {albums.length > 0 ? (
                <div className={gridCols}>
                  {albums.map(a => (
                    <AlbumCard key={a.Id} id={a.Id!} name={a.Name ?? ''} artistName={a.AlbumArtist ?? ''} imageUrl={imgUrl(a)} year={a.ProductionYear ?? undefined} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-muted">
                  <p className="text-sm">No favorite albums yet</p>
                  <p className="text-xs mt-1 text-text-muted/60">Tap the ♥ on any album to add it here</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
