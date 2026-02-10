import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchArtists } from '../lib/archive'
import { useArchiveStore } from '../stores/archive'
import EmptyState from '../components/EmptyState'

export default function ArchiveHome() {
  const navigate = useNavigate()
  const { pinnedArtists } = useArchiveStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; showCount: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchArtists(q.trim())
      setResults(res)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {/* Tape reel icon */}
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-neon-cyan" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="8" cy="12" r="3" />
            <circle cx="16" cy="12" r="3" />
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M11 12h2" />
          </svg>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Live Archive</h1>
        </div>
        <p className="text-sm text-text-secondary font-mono">200,000+ live recordings</p>

        {/* Search */}
        <div className="relative mt-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists..."
            className="w-full pl-10 pr-4 py-3 bg-surface border border-white/5 rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10 focus:shadow-[0_0_16px_rgba(0,255,221,0.08)] transition-all"
          />
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-5 ring-1 ring-white/5">
                <div className="h-5 skeleton rounded w-2/3 mb-2" />
                <div className="h-4 skeleton rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((artist, i) => (
                <motion.button
                  key={artist.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => navigate(`/archive/artist/${encodeURIComponent(artist.name)}`)}
                  className="text-left bg-surface hover:bg-surface-hover rounded-xl p-5 transition-all duration-200 group ring-1 ring-white/5 hover:ring-neon-cyan/20"
                >
                  <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
                    {artist.name}
                  </p>
                  <p className="text-xs text-text-muted font-mono mt-1">
                    {artist.showCount} show{artist.showCount !== 1 ? 's' : ''}
                  </p>
                </motion.button>
              ))}
            </div>
          ) : searched ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              }
              title="No artists found"
              subtitle={`No results for "${query}". Try a different search.`}
            />
          ) : null
        ) : pinnedArtists.length > 0 ? (
          <div>
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Pinned Artists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedArtists.map((artist, i) => (
                <motion.button
                  key={artist.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => navigate(`/archive/artist/${encodeURIComponent(artist.name)}`)}
                  className="text-left bg-surface hover:bg-surface-hover rounded-xl p-5 transition-all duration-200 group ring-1 ring-white/5 hover:ring-neon-cyan/20"
                >
                  <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
                    {artist.name}
                  </p>
                  {artist.showCount != null && (
                    <p className="text-xs text-text-muted font-mono mt-1">
                      {artist.showCount} show{artist.showCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1}>
                <circle cx="8" cy="12" r="3" />
                <circle cx="16" cy="12" r="3" />
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M11 12h2" />
              </svg>
            }
            title="Discover live music"
            subtitle="Search for your favorite artists to explore thousands of live concert recordings from the Internet Archive."
          />
        )}
      </div>
    </div>
  )
}
