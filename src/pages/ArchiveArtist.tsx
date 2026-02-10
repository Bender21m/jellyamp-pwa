import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchShows, groupShowsByDate, getArtistYears } from '../lib/archive'
import type { ArchiveShow } from '../lib/archive'
import { useArchiveStore } from '../stores/archive'
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
  const sortRef = useRef<HTMLDivElement>(null)

  const isPinned = pinnedArtists.some((a) => a.name === artistName)

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

  // Apply client-side source filter
  const filteredShows = sourceFilter
    ? shows.filter((s) => s.source.toLowerCase().includes(sourceFilter))
    : shows

  // Group shows by date
  const grouped = groupShowsByDate(filteredShows)

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        {/* Back */}
        <button
          onClick={() => navigate('/archive')}
          className="mb-3 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-[-0.04em]">{artistName}</h1>
            {!loading && (
              <p className="text-[13px] text-text-muted font-mono mt-1.5 tracking-wide">
                {total.toLocaleString()} recording{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {/* Pin/Unpin */}
          <button
            onClick={() => {
              if (isPinned) unpinArtist(artistName)
              else pinArtist({ name: artistName, showCount: total, pinnedAt: Date.now(), imageUrl: shows[0]?.imageUrl })
            }}
            className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
              isPinned
                ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                : 'border-white/10 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/30'
            }`}
            title={isPinned ? 'Unpin artist' : 'Pin artist'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </button>
        </div>

        {/* Year filter pills */}
        {!yearsLoading && years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-4 scrollbar-hide">
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

        {/* Sort & Source filter row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-white/15 transition-all"
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
                    : 'bg-surface text-text-muted border border-white/[0.06] hover:text-text-secondary hover:border-white/10'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-4 ring-1 ring-white/5">
                <div className="flex gap-3">
                  <div className="w-14 h-14 skeleton rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
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
            subtitle={yearFilter ? `No recordings found for ${yearFilter}.` : sourceFilter ? `No ${sourceFilter.toUpperCase()} recordings found.` : `No recordings found for ${artistName}.`}
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
                  className="px-6 py-2.5 bg-surface border border-white/5 rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-white/10 transition-all disabled:opacity-50"
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
