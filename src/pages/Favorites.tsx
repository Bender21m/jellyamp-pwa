import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchFavorites, getImageUrl, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import AlbumListRow from '../components/library/AlbumListRow'
import ArtistListRow from '../components/library/ArtistListRow'
import TrackRow from '../components/TrackRow'
import TrackContextMenu from '../components/TrackContextMenu'
import EmptyState from '../components/EmptyState'
import FilterPill from '../components/FilterPill'
import ViewModeToggle from '../components/library/ViewModeToggle'
import { getGridProps } from '../components/library/LibraryContent'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

const filters = ['All', 'Artists', 'Albums', 'Tracks']

function createTrack(item: BaseItemDto, serverUrl: string): Track {
  return {
    id: item.Id!,
    name: item.Name ?? 'Unknown',
    albumId: item.AlbumId ?? '',
    albumName: item.Album ?? '',
    artistName: item.ArtistItems?.[0]?.Name ?? item.AlbumArtist ?? 'Unknown Artist',
    artistId: item.ArtistItems?.[0]?.Id,
    duration: (item.RunTimeTicks ?? 0) / 10000000,
    imageUrl: item.AlbumId ? getImageUrl(serverUrl, item.AlbumId, item.AlbumPrimaryImageTag) : undefined,
  }
}

/** Section header with count and optional Play All */
function SectionHeader({ title, count, onPlayAll }: { title: string; count: number; onPlayAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold tracking-[-0.02em]">
        {title} <span className="text-text-muted font-medium">({count})</span>
      </h2>
      {onPlayAll && count > 0 && (
        <button
          onClick={onPlayAll}
          className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-hover active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play All
        </button>
      )}
    </div>
  )
}

/** Muted empty hint for a section */
function SectionEmpty({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-sm text-text-muted/70">{text}</p>
  )
}

export default function Favorites() {
  const { api, userId, serverUrl } = useAuthStore()
  const { viewMode, gridDensity, setViewMode, setGridDensity } = useUIStore()
  const { setTrack } = usePlayerStore()
  const navigate = useNavigate()
  const [items, setItems] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoritesFilter, setFavoritesFilter] = useState('All')
  const [contextMenu, setContextMenu] = useState<{ track: Track; position: { x: number; y: number } } | null>(null)

  async function loadFavorites() {
    if (!api || !userId) return
     
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFavorites(api, userId, [BaseItemKind.MusicAlbum, BaseItemKind.MusicArtist, BaseItemKind.Audio])
      setItems(res.Items ?? [])
    } catch (e) {
      console.error('Favorites fetch failed', e)
      setError('Failed to load favorites. Please try again.')
      setItems([])
    }
    setLoading(false)
  }

   
  useEffect(() => {
    if (!api || !userId) return
    loadFavorites()
  }, [api, userId, loadFavorites])

  // Pull to refresh
  const containerRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const {
    containerRef: pullContainerRef,
    touchHandlers,
    isRefreshing: isPullRefreshing,
    isPulling,
    shouldTrigger,
    progress,
  } = usePullToRefresh({ onRefresh: loadFavorites, disabled: !isTouchDevice })

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  // Sorted & filtered items
  const artists = useMemo(
    () =>
      items
        .filter((i) => i.Type === BaseItemKind.MusicArtist)
        .sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? '')),
    [items],
  )

  const albums = useMemo(
    () =>
      items
        .filter((i) => i.Type === BaseItemKind.MusicAlbum)
        .sort((a, b) => {
          const artist = (a.AlbumArtist ?? '').localeCompare(b.AlbumArtist ?? '')
          if (artist !== 0) return artist
          return (a.ProductionYear ?? 0) - (b.ProductionYear ?? 0)
        }),
    [items],
  )

  const tracks = useMemo(() => items.filter((i) => i.Type === BaseItemKind.Audio), [items])

  const trackObjects = useMemo(
    () =>
      serverUrl
        ? tracks
            .map((t) => createTrack(t, serverUrl))
            .sort((a, b) => {
              const artist = (a.artistName ?? '').localeCompare(b.artistName ?? '')
              if (artist !== 0) return artist
              return a.name.localeCompare(b.name)
            })
        : [],
    [tracks, serverUrl],
  )

  const gridProps = getGridProps(gridDensity)
  const showViewToggle = favoritesFilter === 'All' || favoritesFilter === 'Albums' || favoritesFilter === 'Artists'

  function handleTrackContextMenu(track: Track, e: React.MouseEvent) {
    e.preventDefault()
    setContextMenu({ track, position: { x: e.clientX, y: e.clientY } })
  }

  function handleTrackPlay(track: Track, index: number) {
    setTrack(track, trackObjects, index)
  }

  function handlePlayAllTracks() {
    if (trackObjects.length > 0) setTrack(trackObjects[0], trackObjects, 0)
  }

  // --- Section renderers ---

  function renderArtists() {
    if (artists.length === 0) return <SectionEmpty text="No favorite artists yet" />
    if (viewMode === 'list') {
      return (
        <div className="space-y-1">
          {artists.map((a) => (
            <ArtistListRow
              key={a.Id}
              id={a.Id!}
              name={a.Name ?? 'Unknown'}
              imageUrl={a.ImageTags?.Primary ? imgUrl(a, 120) : undefined}
              albumCount={(a as Record<string, unknown>).AlbumCount as number | undefined}
            />
          ))}
        </div>
      )
    }
    return (
      <div style={gridProps.style}>
        {artists.map((a) => (
          <ArtistCard key={a.Id} id={a.Id!} name={a.Name ?? ''} imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined} />
        ))}
      </div>
    )
  }

  function renderAlbums() {
    if (albums.length === 0) return <SectionEmpty text="No favorite albums yet" />
    if (viewMode === 'list') {
      return (
        <div className="space-y-1">
          {albums.map((a) => (
            <AlbumListRow
              key={a.Id}
              id={a.Id!}
              name={a.Name ?? 'Unknown'}
              artistName={a.AlbumArtist ?? 'Unknown Artist'}
              imageUrl={imgUrl(a, 120)}
              year={a.ProductionYear ?? undefined}
              trackCount={a.ChildCount ?? undefined}
            />
          ))}
        </div>
      )
    }
    return (
      <div style={gridProps.style}>
        {albums.map((a) => (
          <AlbumCard key={a.Id} id={a.Id!} name={a.Name ?? ''} artistName={a.AlbumArtist ?? ''} imageUrl={imgUrl(a)} year={a.ProductionYear ?? undefined} />
        ))}
      </div>
    )
  }

  function renderTracks() {
    if (trackObjects.length === 0) return <SectionEmpty text="No favorite tracks yet" />
    return (
      <div className="space-y-1">
        {trackObjects.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            allTracks={trackObjects}
            showIndex={false}
            showArt={true}
            onPlay={() => handleTrackPlay(track, index)}
            onContextMenu={(e) => handleTrackContextMenu(track, e)}
          />
        ))}
      </div>
    )
  }

  const isAll = favoritesFilter === 'All'

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 md:pb-5 space-y-4 shrink-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Favorites</h1>
            {!loading && items.length > 0 && (
              <p className="text-sm text-text-secondary mt-1 font-mono">
                {artists.length} artists · {albums.length} albums · {tracks.length} tracks
              </p>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <FilterPill key={f} label={f} active={favoritesFilter === f} onClick={() => setFavoritesFilter(f)} />
          ))}
          {showViewToggle && (
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <ViewModeToggle viewMode={viewMode} gridDensity={gridDensity} setViewMode={setViewMode} setGridDensity={setGridDensity} />
            </div>
          )}
        </div>

        {/* Mobile view toggle */}
        {showViewToggle && (
          <div className="flex md:hidden items-center gap-2 mt-1">
            <div className="flex-1" />
            <ViewModeToggle viewMode={viewMode} gridDensity={gridDensity} setViewMode={setViewMode} setGridDensity={setGridDensity} />
          </div>
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
        <PullToRefreshIndicator isVisible={isPulling} isRefreshing={isPullRefreshing} shouldTrigger={shouldTrigger} progress={progress} />

        {loading ? (
          <div style={gridProps.style}>
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
            action={{ label: 'Try again', onClick: () => loadFavorites() }}
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
            action={{ label: 'Browse your library', onClick: () => navigate('/library') }}
          />
        ) : (
          <div className="space-y-8">
            {/* Artists */}
            {(isAll || favoritesFilter === 'Artists') && (
              <section>
                {isAll && <SectionHeader title="Favorite Artists" count={artists.length} />}
                {renderArtists()}
              </section>
            )}

            {/* Albums */}
            {(isAll || favoritesFilter === 'Albums') && (
              <section>
                {isAll && <SectionHeader title="Favorite Albums" count={albums.length} />}
                {renderAlbums()}
              </section>
            )}

            {/* Tracks */}
            {(isAll || favoritesFilter === 'Tracks') && (
              <section>
                {isAll && <SectionHeader title="Favorite Tracks" count={trackObjects.length} onPlayAll={handlePlayAllTracks} />}
                {renderTracks()}
              </section>
            )}
          </div>
        )}
      </div>

      <TrackContextMenu track={contextMenu?.track || null} position={contextMenu?.position || null} onClose={() => setContextMenu(null)} />
    </div>
  )
}
