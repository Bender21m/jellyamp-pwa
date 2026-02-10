import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchShows, groupShowsByDate } from '../lib/archive'
import type { ArchiveShow } from '../lib/archive'
import { useArchiveStore } from '../stores/archive'
import ArchiveShowCard from '../components/ArchiveShowCard'
import FilterPill from '../components/FilterPill'
import EmptyState from '../components/EmptyState'

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

  const isPinned = pinnedArtists.some((a) => a.name === artistName)

  const loadShows = useCallback(async (pg: number, year: number | null, append: boolean) => {
    if (!artistName) return
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await searchShows(artistName, { year: year ?? undefined, page: pg, rows: 50 })
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
    loadShows(1, yearFilter, false)
  }, [artistName, yearFilter, loadShows])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    loadShows(nextPage, yearFilter, true)
  }

  // Extract years from shows
  const years = [...new Set(shows.map((s) => {
    const y = parseInt(s.date?.slice(0, 4), 10)
    return isNaN(y) ? null : y
  }).filter((y): y is number => y != null))].sort((a, b) => b - a)

  // Group by date
  const grouped = groupShowsByDate(shows)

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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">{artistName}</h1>
            {!loading && (
              <p className="text-sm text-text-secondary font-mono mt-1">
                {total.toLocaleString()} recording{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {/* Pin/Unpin */}
          <button
            onClick={() => {
              if (isPinned) unpinArtist(artistName)
              else pinArtist({ name: artistName, showCount: total, pinnedAt: Date.now() })
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
        {years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-4 scrollbar-hide">
            <FilterPill
              label={`All (${total})`}
              active={yearFilter === null}
              onClick={() => setYearFilter(null)}
            />
            {years.map((year) => (
              <FilterPill
                key={year}
                label={String(year)}
                active={yearFilter === year}
                onClick={() => setYearFilter(yearFilter === year ? null : year)}
              />
            ))}
          </div>
        )}
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
        ) : shows.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            }
            title="No shows found"
            subtitle={yearFilter ? `No recordings found for ${yearFilter}.` : `No recordings found for ${artistName}.`}
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
