import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchShows, groupShowsByDate, getArtistYears } from '../lib/archive'
import type { ArchiveShow } from '../lib/archive'
import { useArchiveStore } from '../stores/archive'
import { getArtistInfo } from '../lib/artistInfo'
import type { ArtistInfo } from '../lib/artistInfo'
import ArchiveShowCard from '../components/ArchiveShowCard'
import FilterPill from '../components/FilterPill'
import EmptyState from '../components/EmptyState'

const SORT_OPTIONS = [
  { label: 'Date (Newest)', value: 'date desc' },
  { label: 'Date (Oldest)', value: 'date asc' },
  { label: 'Highest Rated', value: 'avg_rating desc' },
  { label: 'Most Reviewed', value: 'num_reviews desc' },
] as const

const SOURCE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'SBD', value: 'sbd' },
  { label: 'AUD', value: 'aud' },
  { label: 'MTX', value: 'matrix' },
] as const

const RATING_FILTERS = [
  { label: 'All Ratings', value: null },
  { label: '4+ Stars', value: 4 },
  { label: '4.5+ Stars', value: 4.5 },
] as const

export default function ArchiveArtist() {
  const { name } = useParams<{ name: string }>()
  const artistName = decodeURIComponent(name ?? '')
  const navigate = useNavigate()
  const { pinnedArtists, pinArtist, unpinArtist } = useArchiveStore()

  const [shows, setShows] = useState<ArchiveShow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [years, setYears] = useState<{ year: number; count: number }[]>([])
  const [yearsLoading, setYearsLoading] = useState(true)
  const [sort, setSort] = useState('date desc')
  const [sortOpen, setSortOpen] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const isPinned = pinnedArtists.some((a) => a.name === artistName)

  // Fetch artist enrichment
  useEffect(() => {
    if (!artistName) return
    getArtistInfo(artistName).then((info) => {
      if (info) setArtistInfo(info)
    })
  }, [artistName])

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    if (sortOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sortOpen])

  // Load all years on mount
  useEffect(() => {
    if (!artistName) return
    setYearsLoading(true)
    getArtistYears(artistName).then((y) => {
      setYears(y)
      setYearsLoading(false)
    }).catch(() => setYearsLoading(false))
  }, [artistName])

  const loadShows = useCallback(async (pg: number, year: number | null, sortVal: string, append: boolean) => {
    if (!artistName) return
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await searchShows(artistName, { year: year ?? undefined, page: pg, rows: 50, sort: sortVal })
      if (append) {
        setShows((prev) => [...prev, ...res.shows])
      } else {
        setShows(res.shows)
      }
      setTotal(res.total)
    } catch {
      if (!append) setShows([])
    }
    setLoading(false)
    setLoadingMore(false)
  }, [artistName])

  useEffect(() => {
    setPage(1)
    loadShows(1, yearFilter, sort, false)
  }, [artistName, yearFilter, sort, loadShows])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    loadShows(nextPage, yearFilter, sort, true)
  }

  // Apply client-side filters
  const filteredShows = shows.filter((show) => {
    // Source filter
    if (sourceFilter && !show.source.toLowerCase().includes(sourceFilter)) {
      return false
    }
    
    // Search filter (date or venue)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const matchesDate = show.date.includes(query)
      const matchesVenue = show.venue.toLowerCase().includes(query)
      if (!matchesDate && !matchesVenue) {
        return false
      }
    }
    
    // Rating filter
    if (ratingFilter !== null && (!show.rating || show.rating < ratingFilter)) {
      return false
    }
    
    return true
  })

  // Group shows by date
  const grouped = groupShowsByDate(filteredShows)

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort'

  // Build meta line
  const metaParts: string[] = []
  if (artistInfo?.description) metaParts.push(artistInfo.description)
  if (artistInfo?.origin) metaParts.push(artistInfo.origin)
  if (artistInfo?.formedYear) metaParts.push(`est. ${artistInfo.formedYear}`)

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      {/* Hero — scrolls away with the page */}
      <div className="relative h-[140px] md:h-[260px] overflow-hidden">
        {/* Background image or gradient fallback */}
        {artistInfo?.fullImageUrl ? (
          <img
            src={artistInfo.fullImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/70 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/archive')}
          className="absolute top-4 left-4 z-10 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back
        </button>

        {/* Pin button */}
        <button
          onClick={() => {
            if (isPinned) unpinArtist(artistName)
            else pinArtist({ name: artistName, showCount: total, pinnedAt: Date.now(), imageUrl: artistInfo?.imageUrl || shows[0]?.imageUrl })
          }}
          className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
            isPinned
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
              : 'bg-black/30 text-white/60 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/30'
          }`}
          title={isPinned ? 'Unpin artist' : 'Pin artist'}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </button>

        {/* Hero content — bottom-aligned */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4">
          <h1
            className="text-2xl md:text-5xl font-extrabold tracking-[-0.04em]"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
          >
            {artistName}
          </h1>

          {metaParts.length > 0 && (
            <p className="text-sm text-text-secondary mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {metaParts.join(' · ')}
            </p>
          )}

          {!loading && (
            <p className="text-[13px] text-text-muted font-mono mt-0.5 tracking-wide">
              {total.toLocaleString()} recording{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Genre tags + bio — hidden on mobile, shown on desktop */}
      {(artistInfo?.genres?.length || artistInfo?.extract) && (
        <div className="hidden md:block px-4 md:px-8 pt-3 pb-2">
          {/* Genre tags */}
          {artistInfo?.genres && artistInfo.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {artistInfo.genres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-white/[0.04] border border-white/[0.06] text-text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Bio — collapsed by default */}
          {artistInfo?.extract && (
            <div>
              <p className={`text-[13px] text-text-secondary/70 leading-relaxed ${!bioExpanded ? 'line-clamp-2' : ''}`}>
                {artistInfo.extract}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {artistInfo.extract.length > 150 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="text-[11px] text-neon-cyan/70 hover:text-neon-cyan transition-colors"
                  >
                    {bioExpanded ? 'Less' : 'More'}
                  </button>
                )}
                {artistInfo.wikiUrl && (
                  <a
                    href={artistInfo.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-text-muted/60 hover:text-text-secondary transition-colors"
                  >
                    Wikipedia ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky filters — stick to top when hero scrolls away */}
      <div className="sticky top-0 z-10 bg-[#050508]/95 backdrop-blur-md px-4 md:px-8 py-3 border-b border-white/[0.04]">
        {/* Year filter pills */}
        {!yearsLoading && years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterPill
              label={`All (${total})`}
              active={yearFilter === null}
              onClick={() => setYearFilter(null)}
            />
            {years.map((y) => (
              <FilterPill
                key={y.year}
                label={`${y.year} (${y.count})`}
                active={yearFilter === y.year}
                onClick={() => setYearFilter(yearFilter === y.year ? null : y.year)}
              />
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="mb-3">
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search by year or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-neon-cyan/40 focus:bg-white/[0.05] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Sort, Source, & Rating filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.03] border border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-white/15 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
              </svg>
              {currentSortLabel}
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 mt-1 bg-surface border border-white/10 rounded-lg shadow-xl z-20 min-w-[180px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      sort === opt.value
                        ? 'text-neon-cyan bg-neon-cyan/[0.08]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source filter pills */}
          <div className="flex gap-1.5">
            {SOURCE_FILTERS.map((sf) => (
              <button
                key={sf.value}
                onClick={() => setSourceFilter(sourceFilter === sf.value ? '' : sf.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  sourceFilter === sf.value
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-white/[0.03] text-text-muted border border-white/[0.06] hover:text-text-secondary hover:border-white/10'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Rating filter pills */}
          <div className="flex gap-1.5">
            {RATING_FILTERS.map((rf: typeof RATING_FILTERS[number]) => (
              <button
                key={rf.label}
                onClick={() => setRatingFilter(ratingFilter === rf.value ? null : rf.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  ratingFilter === rf.value
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-400/30'
                    : 'bg-white/[0.03] text-text-muted border border-white/[0.06] hover:text-text-secondary hover:border-white/10'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Show list — flows naturally in the scroll */}
      <div className="px-4 md:px-8 pt-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.04]">
                <div className="flex gap-4">
                  <div className="w-[72px] h-[72px] skeleton rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-4 skeleton rounded w-1/3" />
                    <div className="h-3 skeleton rounded w-1/2" />
                    <div className="h-3 skeleton rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredShows.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            }
            title="No shows found"
            subtitle={(() => {
              const filters = []
              if (yearFilter) filters.push(`year ${yearFilter}`)
              if (sourceFilter) filters.push(`${sourceFilter.toUpperCase()} recordings`)
              if (searchQuery.trim()) filters.push(`"${searchQuery.trim()}"`)
              if (ratingFilter) filters.push(`${ratingFilter}+ stars`)
              
              if (filters.length > 0) {
                return `No recordings found for ${filters.join(', ')}.`
              }
              return `No recordings found for ${artistName}.`
            })()}
          />
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([date, dateShows]) => {
              const primary = dateShows[0]
              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ArchiveShowCard
                    show={primary}
                    recordingCount={dateShows.length}
                    hideArtist
                    onClick={() => navigate(`/archive/show/${encodeURIComponent(primary.identifier)}`)}
                  />
                </motion.div>
              )
            })}

            {/* Load more */}
            {shows.length < total && (
              <div className="flex justify-center pt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-white/10 transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load more (${shows.length} of ${total})`}
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
