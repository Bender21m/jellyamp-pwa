import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import type { SortOption } from '../stores/ui'
import { fetchAlbums, fetchArtists, fetchPlaylists, fetchGenres, fetchAlbumsByGenre, fetchRecentAlbums, SortOrder, ItemSortBy } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import LibraryHeader from '../components/library/LibraryHeader'
import LibraryContent from '../components/library/LibraryContent'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

export default function Library() {
  const { api, userId, serverUrl } = useAuthStore()
  const { viewMode, setViewMode, gridDensity, setGridDensity, sortOption, setSortOption, libraryFilter, setLibraryFilter } = useUIStore()
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
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [counts, setCounts] = useState({ artists: 0, albums: 0, playlists: 0 })
  
  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollRestore(scrollContainerRef)

  // Load counts for header (lightweight)
  const loadCounts = useCallback(async () => {
    if (!api || !userId) return
    try {
      const [albumsRes, artistsRes, playlistsRes] = await Promise.all([
        fetchAlbums(api, userId, { limit: 0 }), // 0 limit = count only
        fetchArtists(api, userId, { limit: 0 }),
        fetchPlaylists(api, userId)
      ])
      setCounts({
        artists: artistsRes.TotalRecordCount ?? 0,
        albums: albumsRes.TotalRecordCount ?? 0,
        playlists: playlistsRes.TotalRecordCount ?? 0,
      })
    } catch (e) {
      console.error('Library counts fetch error', e)
    }
  }, [api, userId])

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

      // Only fetch data for the current filter
      switch (libraryFilter) {
        case 'Artists': {
          const artistsRes = await fetchArtists(api, userId, { limit: 200, searchTerm: search || undefined })
          setArtists(artistsRes.Items ?? [])
          break
        }
        case 'Albums': {
          const albumsRes = await fetchAlbums(api, userId, { limit: 200, ...sort, searchTerm: search || undefined })
          setAlbums(albumsRes.Items ?? [])
          break
        }
        case 'Playlists': {
          const playlistsRes = await fetchPlaylists(api, userId)
          setPlaylists(playlistsRes.Items ?? [])
          break
        }
        case 'Genres': {
          const genresRes = await fetchGenres(api, userId)
          setGenres(genresRes.Items ?? [])
          break
        }
        case 'Recent': {
          const recentRes = await fetchRecentAlbums(api, userId, 50)
          setRecentAlbums(recentRes.Items ?? [])
          break
        }
      }
    } catch (e) {
      console.error('Library fetch error', e)
    }
    setLoading(false)
  }, [api, userId, sortOption, search, libraryFilter])

  // Load counts on mount - standard async loading pattern
  useEffect(() => { loadCounts() }, [loadCounts])

  // Load data when filter, sort, or other deps change - standard async loading pattern
  useEffect(() => { loadData() }, [loadData])

  // Debounced search — only re-trigger on search text changes
  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Pull to refresh
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const handleRefresh = useCallback(async () => {
    await Promise.all([loadCounts(), loadData()])
  }, [loadCounts, loadData])

  const {
    containerRef: pullContainerRef,
    touchHandlers: pullTouchHandlers,
    isRefreshing: isPullRefreshing,
    isPulling,
    shouldTrigger,
    progress: pullProgress
  } = usePullToRefresh({
    onRefresh: handleRefresh,
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

  // Reset genre selection when switching filters - legitimate UI state reset
  useEffect(() => {
    setSelectedGenre(null)
     
    setGenreAlbums([])
  }, [libraryFilter])

  return (
    <div className="h-full flex flex-col">
      <LibraryHeader
        counts={counts}
        loading={loading}
        search={search}
        setSearch={setSearch}
        libraryFilter={libraryFilter}
        setLibraryFilter={setLibraryFilter}
        sortOption={sortOption}
        setSortOption={setSortOption}
        viewMode={viewMode}
        setViewMode={setViewMode}
        gridDensity={gridDensity}
        setGridDensity={setGridDensity}
        showSort={showSort}
        setShowSort={setShowSort}
        showMobileSearch={showMobileSearch}
        setShowMobileSearch={setShowMobileSearch}
      />

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
        
        <LibraryContent
          loading={loading}
          libraryFilter={libraryFilter}
          viewMode={viewMode}
          gridDensity={gridDensity}
          serverUrl={serverUrl}
          albums={albums}
          artists={artists}
          playlists={playlists}
          genres={genres}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          genreAlbums={genreAlbums}
          setGenreAlbums={setGenreAlbums}
          recentAlbums={recentAlbums}
          handleGenreClick={handleGenreClick}
        />
      </div>
    </div>
  )
}