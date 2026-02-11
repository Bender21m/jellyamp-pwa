import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AlbumCard from '../AlbumCard'
import ArtistCard from '../ArtistCard'
import PlaylistCard from '../PlaylistCard'
import GenreCard from '../GenreCard'
import HorizontalScroll from '../HorizontalScroll'
import EmptyStateComponent from '../EmptyState'
import SkeletonGrid from './SkeletonGrid'
import ArtistListRow from './ArtistListRow'
import AlbumListRow from './AlbumListRow'
import type { BaseItemDto } from '../../lib/jellyfin'
import type { ViewMode, GridDensity } from '../../stores/ui'
import { getImageUrl } from '../../lib/jellyfin'

/**
 * Returns inline style + className for responsive grid based on density.
 * Uses CSS minmax auto-fill so Tailwind purging can't strip the classes.
 */
export function getGridProps(density: GridDensity = 'normal'): { style: React.CSSProperties; className: string } {
  // minWidth per card determines how many columns fit
  const config = {
    normal: { minWidth: '160px', gap: '1.25rem' },   // ~2 cols mobile
    compact: { minWidth: '120px', gap: '0.75rem' },   // ~3 cols mobile
    dense: { minWidth: '90px', gap: '0.5rem' },        // ~4 cols mobile
  }
  const { minWidth, gap } = config[density]
  return {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
      gap,
    },
    className: '',
  }
}

interface LibraryContentProps {
  loading: boolean
  libraryFilter: string
  viewMode: ViewMode
  gridDensity: GridDensity
  serverUrl: string | null
  // Data
  albums: BaseItemDto[]
  artists: BaseItemDto[]
  playlists: BaseItemDto[]
  genres: BaseItemDto[]
  selectedGenre: { id: string; name: string } | null
  setSelectedGenre: (genre: { id: string; name: string } | null) => void
  genreAlbums: BaseItemDto[]
  setGenreAlbums: (albums: BaseItemDto[]) => void
  recentAlbums: BaseItemDto[]
  // Handlers
  handleGenreClick: (genreId: string, genreName: string) => Promise<void>
}

export default function LibraryContent({
  loading,
  libraryFilter,
  viewMode,
  gridDensity,
  serverUrl,
  albums,
  artists,
  playlists,
  genres,
  selectedGenre,
  setSelectedGenre,
  genreAlbums,
  setGenreAlbums,
  recentAlbums,
  handleGenreClick
}: LibraryContentProps) {
  const navigate = useNavigate()

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const gridProps = getGridProps(gridDensity)

  // Group recent albums by timeframe
  const groupRecentAlbums = useCallback((items: BaseItemDto[]) => {
    const now = new Date()
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0)
    const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const groups: { label: string; items: BaseItemDto[] }[] = [
      { label: 'This Week', items: [] },
      { label: 'Last Week', items: [] },
      { label: 'This Month', items: [] },
      { label: 'Older', items: [] },
    ]

    // Skip first 20 (shown in horizontal scroll)
    items.slice(20).forEach(item => {
      const date = item.DateCreated ? new Date(item.DateCreated) : new Date(0)
      if (date >= startOfWeek) groups[0].items.push(item)
      else if (date >= startOfLastWeek) groups[1].items.push(item)
      else if (date >= startOfMonth) groups[2].items.push(item)
      else groups[3].items.push(item)
    })

    return groups.filter(g => g.items.length > 0)
  }, [])

  if (loading) {
    return <SkeletonGrid viewMode={viewMode} type={libraryFilter === 'Artists' ? 'artist' : 'album'} />
  }

  if (libraryFilter === 'Genres') {
    if (selectedGenre) {
      return (
        <div>
          <button
            onClick={() => { setSelectedGenre(null); setGenreAlbums([]) }}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-neon-cyan transition-colors mb-4 group"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span className="group-hover:underline">Back to Genres</span>
          </button>
          <h2 className="text-xl font-bold mb-4">{selectedGenre.name}</h2>
          {genreAlbums.length === 0 ? (
            <p className="text-text-muted text-sm">No albums found in this genre.</p>
          ) : (
            <div style={gridProps.style}>
              {genreAlbums.map((a) => (
                <div key={a.Id}>
                  <AlbumCard
                    id={a.Id!}
                    name={a.Name ?? 'Unknown'}
                    artistName={a.AlbumArtist ?? 'Unknown Artist'}
                    imageUrl={imgUrl(a)}
                    year={a.ProductionYear ?? undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    if (genres.length === 0) {
      return (
        <EmptyStateComponent
          icon={<svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>}
          title="No genres found"
          subtitle="Your Jellyfin server doesn't have any music genres yet."
        />
      )
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {genres.map((g, i) => (
          <div key={g.Id}>
            <GenreCard name={g.Name ?? 'Unknown'} index={i} onClick={() => handleGenreClick(g.Id!, g.Name ?? 'Unknown')} />
          </div>
        ))}
      </div>
    )
  }

  if (libraryFilter === 'Recent') {
    if (recentAlbums.length === 0) {
      return (
        <EmptyStateComponent
          icon={<svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" /></svg>}
          title="No recent albums"
          subtitle="Albums you add will appear here."
        />
      )
    }
    
    return (
      <div className="space-y-8">
        {/* Horizontal scroll of latest 20 */}
        <div>
          <h2 className="text-lg font-bold mb-3">Recently Added</h2>
          <HorizontalScroll>
            {recentAlbums.slice(0, 20).map((a) => (
              <div key={a.Id} className="shrink-0 w-36 md:w-44">
                <AlbumCard
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  artistName={a.AlbumArtist ?? 'Unknown Artist'}
                  imageUrl={imgUrl(a)}
                  year={a.ProductionYear ?? undefined}
                />
              </div>
            ))}
          </HorizontalScroll>
        </div>
        {/* Grouped by timeframe */}
        {groupRecentAlbums(recentAlbums).map(group => (
          <div key={group.label}>
            <h2 className="text-lg font-bold mb-3 text-text-secondary">{group.label}</h2>
            <div style={gridProps.style}>
              {group.items.map((a) => (
                <div key={a.Id}>
                  <AlbumCard
                    id={a.Id!}
                    name={a.Name ?? 'Unknown'}
                    artistName={a.AlbumArtist ?? 'Unknown Artist'}
                    imageUrl={imgUrl(a)}
                    year={a.ProductionYear ?? undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (libraryFilter === 'Albums') {
    if (albums.length === 0) {
      return (
        <EmptyStateComponent
          icon={
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          }
          title="Your library is empty"
          subtitle="Add some music to your Jellyfin server to get started."
        />
      )
    }
    
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
          <AlbumCard
            key={a.Id}
            id={a.Id!}
            name={a.Name ?? 'Unknown'}
            artistName={a.AlbumArtist ?? 'Unknown Artist'}
            imageUrl={imgUrl(a)}
            year={a.ProductionYear ?? undefined}
          />
        ))}
      </div>
    )
  }

  if (libraryFilter === 'Artists') {
    if (artists.length === 0) {
      return (
        <EmptyStateComponent
          icon={
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          }
          title="Your library is empty"
          subtitle="Add some music to your Jellyfin server to get started."
        />
      )
    }
    
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
          <ArtistCard
            key={a.Id}
            id={a.Id!}
            name={a.Name ?? 'Unknown'}
            imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined}
          />
        ))}
      </div>
    )
  }

  if (libraryFilter === 'Playlists') {
    if (playlists.length === 0) {
      return (
        <EmptyStateComponent
          icon={
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          }
          title="No playlists yet"
          subtitle="Create custom playlists to organize your favorite tracks."
          action={{
            label: "Create your first playlist",
            onClick: () => navigate('/playlists')
          }}
        />
      )
    }
    
    return (
      <div style={gridProps.style}>
        {playlists.map((p) => (
          <div key={p.Id}>
            <PlaylistCard
              id={p.Id!}
              name={p.Name ?? 'Untitled'}
              imageUrl={p.ImageTags?.Primary ? imgUrl(p) : undefined}
              trackCount={p.ChildCount ?? undefined}
            />
          </div>
        ))}
      </div>
    )
  }

  return null
}