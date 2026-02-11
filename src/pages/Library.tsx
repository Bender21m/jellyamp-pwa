import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import JellyImage from '../components/JellyImage'
import type { SortOption } from '../stores/ui'
import { fetchAlbums, fetchArtists, fetchPlaylists, fetchGenres, fetchAlbumsByGenre, fetchRecentAlbums, getImageUrl, SortOrder, ItemSortBy } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import FilterPill from '../components/FilterPill'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import PlaylistCard from '../components/PlaylistCard'
import GenreCard from '../components/GenreCard'
import HorizontalScroll from '../components/HorizontalScroll'
import EmptyStateComponent from '../components/EmptyState'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

const filters = ['Artists', 'Albums', 'Playlists', 'Genres', 'Recent']

const sortLabels: Record<SortOption, string> = {
  'name-asc': 'Name A→Z',
  'name-desc': 'Name Z→A',
  'artist-asc': 'Artist A→Z',
  'artist-desc': 'Artist Z→A',
  'year-newest': 'Year ↓',
  'year-oldest': 'Year ↑',
  'date-added': 'Date Added',
}

const sortOptions: SortOption[] = ['name-asc', 'name-desc', 'artist-asc', 'artist-desc', 'year-newest', 'year-oldest', 'date-added']

function getColumnCount() {
  const w = window.innerWidth
  if (w >= 1536) return 6
  if (w >= 1280) return 5
  if (w >= 1024) return 4
  if (w >= 640) return 3
  return 2
}

function getGridGap() {
  const w = window.innerWidth
  if (w >= 1024) return 28
  if (w >= 768) return 24
  return 20
}

export default function Library() {
  const { api, userId, serverUrl } = useAuthStore()
  const { viewMode, setViewMode, sortOption, setSortOption, libraryFilter, setLibraryFilter } = useUIStore()
  const navigate = useNavigate()
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [artists, setArtists] = useState<BaseItemDto[]>([])
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [genres, setGenres] = useState<BaseItemDto[]>([])
  const [selectedGenre, setSelectedGenre] = useState<{ id: string; name: string } | null>(null)
  const [genreAlbums, setGenreAlbums] = useState<BaseItemDto[]>([])
  const [recentAlbums, setRecentAlbums] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSort, setShowSort] = useState(false)
  
  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollRestore(scrollContainerRef)

  const loadData = useCallback(async () => {
    if (!api || !userId) return
    setLoading(true)
    try {
      const sortMap: Record<SortOption, { sortBy: ItemSortBy[], sortOrder: SortOrder[] }> = {
        'name-asc': { sortBy: [ItemSortBy.SortName], sortOrder: [SortOrder.Ascending] },
        'name-desc': { sortBy: [ItemSortBy.SortName], sortOrder: [SortOrder.Descending] },
        'artist-asc': { sortBy: [ItemSortBy.AlbumArtist, ItemSortBy.SortName], sortOrder: [SortOrder.Ascending, SortOrder.Ascending] },
        'artist-desc': { sortBy: [ItemSortBy.AlbumArtist, ItemSortBy.SortName], sortOrder: [SortOrder.Descending, SortOrder.Ascending] },
        'year-newest': { sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName], sortOrder: [SortOrder.Descending, SortOrder.Ascending] },
        'year-oldest': { sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName], sortOrder: [SortOrder.Ascending, SortOrder.Ascending] },
        'date-added': { sortBy: [ItemSortBy.DateCreated, ItemSortBy.SortName], sortOrder: [SortOrder.Descending, SortOrder.Ascending] },
      }
      const sort = sortMap[sortOption]

      const [albumsRes, artistsRes, playlistsRes, genresRes, recentRes] = await Promise.all([
        fetchAlbums(api, userId, { limit: 200, ...sort, searchTerm: search || undefined }),
        fetchArtists(api, userId, { limit: 200, searchTerm: search || undefined }),
        fetchPlaylists(api, userId),
        fetchGenres(api, userId),
        fetchRecentAlbums(api, userId, 50),
      ])
      setAlbums(albumsRes.Items ?? [])
      setArtists(artistsRes.Items ?? [])
      setPlaylists(playlistsRes.Items ?? [])
      setGenres(genresRes.Items ?? [])
      setRecentAlbums(recentRes.Items ?? [])
    } catch (e) {
      console.error('Library fetch error', e)
    }
    setLoading(false)
  }, [api, userId, sortOption, search])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [search])

  // Pull to refresh
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const {
    containerRef: pullContainerRef,
    touchHandlers: pullTouchHandlers,
    isRefreshing: isPullRefreshing,
    isPulling,
    shouldTrigger,
    progress: pullProgress
  } = usePullToRefresh({
    onRefresh: loadData,
    disabled: !isTouchDevice
  })

  // Genre selection handler
  const handleGenreClick = useCallback(async (genreId: string, genreName: string) => {
    if (!api || !userId) return
    setSelectedGenre({ id: genreId, name: genreName })
    setLoading(true)
    try {
      const res = await fetchAlbumsByGenre(api, userId, genreId)
      setGenreAlbums(res.Items ?? [])
    } catch (e) {
      console.error('Genre albums fetch error', e)
    }
    setLoading(false)
  }, [api, userId])

  // Reset genre selection when switching filters
  useEffect(() => {
    setSelectedGenre(null)
    setGenreAlbums([])
  }, [libraryFilter])

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

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  // Responsive grid: larger minimum card sizes
  const gridCols = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 md:pb-5 space-y-4 shrink-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Library</h1>
            {!loading && (
              <p className="text-sm text-text-secondary mt-1 font-mono">
                {artists.length.toLocaleString()} artists · {albums.length.toLocaleString()} albums
              </p>
            )}
          </div>
          {/* Search - hidden on mobile (use search tab) */}
          <div className="relative hidden md:block">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="pl-9 pr-4 py-2.5 bg-surface border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10 focus:shadow-[0_0_16px_rgba(0,255,221,0.08)] w-48 transition-all focus:w-64"
            />
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <FilterPill key={f} label={f} active={libraryFilter === f} onClick={() => setLibraryFilter(f)} />
          ))}
          {/* Sort + View toggle — inline on desktop */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-white/5 text-xs text-text-secondary hover:text-text-primary transition-colors font-mono"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
                </svg>
                <span>{sortLabels[sortOption]}</span>
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSort(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-1.5 bg-card border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1.5 z-30 min-w-[170px]"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortOption(opt); setShowSort(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortOption === opt ? 'text-neon-cyan bg-neon-cyan/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        {sortLabels[opt]}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </div>
            <div className="flex rounded-lg overflow-hidden border border-white/5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sort + View toggle — second row on mobile */}
        <div className="flex md:hidden items-center gap-2 mt-1">
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-white/5 text-xs text-text-secondary hover:text-text-primary transition-colors font-mono"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
              </svg>
              <span>{sortLabels[sortOption]}</span>
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowSort(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 top-full mt-1.5 bg-card border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1.5 z-30 min-w-[170px]"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSortOption(opt); setShowSort(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sortOption === opt ? 'text-neon-cyan bg-neon-cyan/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      {sortLabels[opt]}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex rounded-lg overflow-hidden border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content - extra bottom padding for player + mobile nav */}
      <div
        ref={(el) => {
          (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          pullContainerRef(el)
        }}
        className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28 relative"
        {...pullTouchHandlers}
      >
        {/* Pull to refresh indicator */}
        <PullToRefreshIndicator
          isVisible={isPulling}
          isRefreshing={isPullRefreshing}
          shouldTrigger={shouldTrigger}
          progress={pullProgress}
        />
        {loading ? (
          <SkeletonGrid viewMode={viewMode} type={libraryFilter === 'Artists' ? 'artist' : 'album'} />
        ) : libraryFilter === 'Genres' ? (
          selectedGenre ? (
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
                <div className={gridCols}>
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
          ) : genres.length === 0 ? (
            <EmptyStateComponent
              icon={<svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>}
              title="No genres found"
              subtitle="Your Jellyfin server doesn't have any music genres yet."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {genres.map((g, i) => (
                <div key={g.Id}>
                  <GenreCard name={g.Name ?? 'Unknown'} index={i} onClick={() => handleGenreClick(g.Id!, g.Name ?? 'Unknown')} />
                </div>
              ))}
            </div>
          )
        ) : libraryFilter === 'Recent' ? (
          recentAlbums.length === 0 ? (
            <EmptyStateComponent
              icon={<svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" /></svg>}
              title="No recent albums"
              subtitle="Albums you add will appear here."
            />
          ) : (
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
                  <div className={gridCols}>
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
        ) : libraryFilter === 'Albums' ? (
          albums.length === 0 ? (
            <EmptyStateComponent
              icon={
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                </svg>
              }
              title="Your library is empty"
              subtitle="Add some music to your Jellyfin server to get started."
            />
          ) : viewMode === 'list' ? (
            <VirtualList
              items={albums}
              scrollRef={scrollContainerRef}
              estimateSize={64}
              renderItem={(a) => (
                <AlbumListRow
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  artistName={a.AlbumArtist ?? 'Unknown Artist'}
                  imageUrl={imgUrl(a, 120)}
                  year={a.ProductionYear ?? undefined}
                  trackCount={a.ChildCount ?? undefined}
                />
              )}
            />
          ) : (
            <VirtualGrid
              items={albums}
              scrollRef={scrollContainerRef}
              renderItem={(a) => (
                <AlbumCard
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  artistName={a.AlbumArtist ?? 'Unknown Artist'}
                  imageUrl={imgUrl(a)}
                  year={a.ProductionYear ?? undefined}
                />
              )}
            />
          )
        ) : libraryFilter === 'Artists' ? (
          artists.length === 0 ? (
            <EmptyStateComponent
              icon={
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              }
              title="Your library is empty"
              subtitle="Add some music to your Jellyfin server to get started."
            />
          ) : viewMode === 'list' ? (
            <VirtualList
              items={artists}
              scrollRef={scrollContainerRef}
              estimateSize={56}
              renderItem={(a) => (
                <ArtistListRow
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  imageUrl={a.ImageTags?.Primary ? imgUrl(a, 120) : undefined}
                  albumCount={(a as Record<string, unknown>).AlbumCount as number | undefined}
                />
              )}
            />
          ) : (
            <VirtualGrid
              items={artists}
              scrollRef={scrollContainerRef}
              renderItem={(a) => (
                <ArtistCard
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined}
                />
              )}
            />
          )
        ) : libraryFilter === 'Playlists' ? (
          playlists.length === 0 ? (
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
          ) : (
            <div className={gridCols}>
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
        ) : null}
      </div>
    </div>
  )
}

/* ── Virtualized Grid ── */

function VirtualGrid({ items, scrollRef, renderItem }: {
  items: BaseItemDto[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  renderItem: (item: BaseItemDto) => React.ReactNode
}) {
  const [cols, setCols] = useState(getColumnCount)
  const [gap, setGap] = useState(getGridGap)

  useEffect(() => {
    const update = () => {
      setCols(getColumnCount())
      setGap(getGridGap())
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const rows = useMemo(() => {
    const r: BaseItemDto[][] = []
    for (let i = 0; i < items.length; i += cols) r.push(items.slice(i, i + cols))
    return r
  }, [items, cols])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 280,
    overscan: 3,
  })

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map(vRow => (
        <div
          key={vRow.key}
          data-index={vRow.index}
          ref={virtualizer.measureElement}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${vRow.start}px)`,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, paddingBottom: gap }}>
            {rows[vRow.index].map(item => (
              <div key={item.Id}>{renderItem(item)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Virtualized List ── */

function VirtualList({ items, scrollRef, estimateSize, renderItem }: {
  items: BaseItemDto[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  estimateSize: number
  renderItem: (item: BaseItemDto) => React.ReactNode
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
  })

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map(vRow => (
        <div
          key={vRow.key}
          data-index={vRow.index}
          ref={virtualizer.measureElement}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${vRow.start}px)`,
          }}
        >
          {renderItem(items[vRow.index])}
        </div>
      ))}
    </div>
  )
}

/* ── List Row Components ── */

function ArtistListRow({ id, name, imageUrl, albumCount }: { id: string; name: string; imageUrl?: string; albumCount?: number }) {
  return (
    <Link to={`/artist/${id}`} className="flex items-center gap-4 px-4 py-2.5 min-h-[56px] rounded-lg hover:bg-surface transition-colors group cursor-pointer">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-card shrink-0 ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all">
        <JellyImage src={imageUrl} width={48} height={48} maxWidth={80} alt={name} className="w-12 h-12" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate group-hover:text-neon-cyan transition-colors">{name}</p>
      </div>
      {albumCount !== undefined && (
        <span className="text-[13px] text-text-muted font-mono shrink-0">{albumCount} album{albumCount !== 1 ? 's' : ''}</span>
      )}
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted/30 group-hover:text-text-muted shrink-0 transition-colors hidden md:block" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </Link>
  )
}

function AlbumListRow({ id, name, artistName, imageUrl, year, trackCount }: { id: string; name: string; artistName: string; imageUrl: string; year?: number; trackCount?: number }) {
  return (
    <Link to={`/album/${id}`} className="flex items-center gap-4 px-4 py-2.5 min-h-[64px] rounded-lg hover:bg-surface transition-colors group cursor-pointer">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-card shrink-0 ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all">
        <JellyImage src={imageUrl} width={56} height={56} maxWidth={80} alt={name} className="w-14 h-14" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate group-hover:text-neon-cyan transition-colors">{name}</p>
        <p className="text-[13px] text-text-secondary truncate">{artistName}</p>
      </div>
      {year && <span className="text-[13px] text-text-muted font-mono shrink-0 hidden sm:inline">{year}</span>}
      {trackCount !== undefined && (
        <span className="text-[13px] text-text-muted font-mono shrink-0 hidden md:inline">{trackCount} tracks</span>
      )}
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted/30 group-hover:text-text-muted shrink-0 transition-colors hidden md:block" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </Link>
  )
}

/* ── Skeleton Loader ── */

function SkeletonGrid({ viewMode, type }: { viewMode: string; type: string }) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5 min-h-[56px]">
            <div className={`${type === 'artist' ? 'w-12 h-12 rounded-xl' : 'w-14 h-14 rounded-xl'} skeleton`} />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-1/3" />
              {type !== 'artist' && <div className="h-3.5 skeleton rounded w-1/5" />}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-square rounded-xl skeleton mb-3" />
          <div className="h-4 skeleton rounded w-3/4 mb-2" />
          <div className="h-3.5 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
