import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { fetchFavorites, getImageUrl, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import EmptyState from '../components/EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

export default function Favorites() {
  const { api, userId, serverUrl } = useAuthStore()
  const navigate = useNavigate()
  const [items, setItems] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!api || !userId) return
    loadFavorites()
  }, [api, userId])

  async function loadFavorites() {
    if (!api || !userId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFavorites(api, userId, [BaseItemKind.MusicAlbum, BaseItemKind.MusicArtist])
      setItems(res.Items ?? [])
    } catch (e) {
      console.error('Favorites fetch failed', e)
      setError('Failed to load favorites. Please try again.')
      setItems([])
    }
    setLoading(false)
  }

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
    onRefresh: loadFavorites,
    disabled: !isTouchDevice
  })

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
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-xl mb-3" />
                <div className="h-4 skeleton rounded w-3/4 mb-2" />
                <div className="h-3.5 skeleton rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            }
            title="Something went wrong"
            subtitle={error}
            action={{
              label: "Try again",
              onClick: () => loadFavorites()
            }}
          />
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
