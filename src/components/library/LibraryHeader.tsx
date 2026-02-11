import { useRef, useEffect, useCallback } from 'react'
import FilterPill from '../FilterPill'
import SortDropdown from './SortDropdown'
import ViewModeToggle from './ViewModeToggle'
import type { SortOption, ViewMode } from '../../stores/ui'

const filters = ['Artists', 'Albums', 'Playlists', 'Genres', 'Recent']

interface LibraryHeaderProps {
  counts: { artists: number; albums: number; playlists: number }
  loading: boolean
  search: string
  setSearch: (search: string) => void
  libraryFilter: string
  setLibraryFilter: (filter: string) => void
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  showSort: boolean
  setShowSort: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
}

export default function LibraryHeader({
  counts,
  loading,
  search,
  setSearch,
  libraryFilter,
  setLibraryFilter,
  sortOption,
  setSortOption,
  viewMode,
  setViewMode,
  showSort,
  setShowSort,
  showMobileSearch,
  setShowMobileSearch
}: LibraryHeaderProps) {
  const mobileSearchRef = useRef<HTMLInputElement>(null)

  // Focus input when mobile search opens
  useEffect(() => {
    if (showMobileSearch && mobileSearchRef.current) {
      mobileSearchRef.current.focus()
    }
  }, [showMobileSearch])

  const toggleMobileSearch = useCallback(() => {
    setShowMobileSearch(!showMobileSearch)
  }, [showMobileSearch, setShowMobileSearch])

  const clearSearchAndClose = useCallback(() => {
    setSearch('')
    setShowMobileSearch(false)
  }, [setSearch, setShowMobileSearch])

  const handleFilterClick = useCallback((filter: string) => {
    setLibraryFilter(filter)
  }, [setLibraryFilter])

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 md:pb-5 space-y-4 shrink-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Library</h1>
          {!loading && counts.artists > 0 && (
            <p className="text-sm text-text-secondary mt-1 font-mono">
              {counts.artists.toLocaleString()} artists · {counts.albums.toLocaleString()} albums
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
          <FilterPill key={f} label={f} active={libraryFilter === f} onClick={() => handleFilterClick(f)} />
        ))}
        {/* Mobile search toggle */}
        <button
          onClick={toggleMobileSearch}
          className={`flex md:hidden items-center justify-center w-9 h-9 rounded-lg border transition-all ml-2 ${
            showMobileSearch || search ? 'border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan' : 'border-white/5 text-text-muted hover:text-text-primary'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>
        {/* Sort + View toggle — inline on desktop */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <SortDropdown
            sortOption={sortOption}
            setSortOption={setSortOption}
            showSort={showSort}
            setShowSort={setShowSort}
          />
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
      </div>

      {/* Mobile search input — expandable */}
      {showMobileSearch && (
        <div className="flex md:hidden items-center gap-2 mt-1">
          <div className="relative flex-1">
            <input
              ref={mobileSearchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-9 pr-9 py-2.5 bg-surface border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10"
            />
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            {search && (
              <button
                onClick={clearSearchAndClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort + View toggle — second row on mobile */}
      <div className="flex md:hidden items-center gap-2 mt-1">
        <SortDropdown
          sortOption={sortOption}
          setSortOption={setSortOption}
          showSort={showSort}
          setShowSort={setShowSort}
          isMobile={true}
        />
        <div className="flex-1" />
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
    </div>
  )
}