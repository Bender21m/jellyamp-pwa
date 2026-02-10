import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchArtists, searchShows } from '../lib/archive'
import { useArchiveStore } from '../stores/archive'
import type { FavoriteShowDetails } from '../stores/archive'
import type { ArchiveShow } from '../lib/archive'
import ArchiveShowCard from '../components/ArchiveShowCard'
import EmptyState from '../components/EmptyState'

const POPULAR_ARTISTS = [
  'Grateful Dead', 'Phish', 'Disco Biscuits', 'Widespread Panic',
  'String Cheese Incident', 'moe.', "Umphrey's McGee", 'Medeski Martin & Wood',
  'Trey Anastasio', 'STS9', 'Lotus', 'Galactic', "Gov't Mule",
  'Dark Star Orchestra', 'Leftover Salmon',
]

export default function ArchiveHome() {
  const navigate = useNavigate()
  const {
    pinnedArtists, favoriteShows, favoriteShowDetails,
    recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches,
    cacheFavoriteShowDetails,
  } = useArchiveStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; showCount: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [favShows, setFavShows] = useState<ArchiveShow[]>([])
  const [topShows, setTopShows] = useState<ArchiveShow[]>([])
  const [discoverOpen, setDiscoverOpen] = useState(true)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Fetch top-rated shows for Discover section
  useEffect(() => {
    setDiscoverLoading(true)
    searchShows('', { rows: 12, sort: 'avg_rating desc' })
      .then((res) => setTopShows(res.shows.filter(s => s.rating && s.rating >= 4)))
      .catch(() => {})
      .finally(() => setDiscoverLoading(false))
  }, [])

  // Fetch favorite show metadata
  useEffect(() => {
    if (favoriteShows.length === 0) { setFavShows([]); return }

    let cancelled = false
    const fetchFavs = async () => {
      const shows: ArchiveShow[] = []
      for (const id of favoriteShows) {
        const cached = favoriteShowDetails[id]
        if (cached) {
          shows.push({
            identifier: cached.identifier,
            title: `${cached.artist} — ${cached.date}`,
            artist: cached.artist,
            date: cached.date,
            venue: cached.venue,
            source: '',
            imageUrl: cached.imageUrl,
          })
        } else {
          try {
            const resp = await fetch(`https://archive.org/metadata/${id}`)
            const data = await resp.json()
            const m = data.metadata || {}
            const show: ArchiveShow = {
              identifier: id,
              title: m.title || id,
              artist: m.creator || m.artist || '',
              date: m.date?.slice(0, 10) || '',
              venue: m.venue || m.coverage || '',
              source: m.source || '',
              imageUrl: `https://archive.org/services/img/${id}`,
            }
            shows.push(show)
            const details: FavoriteShowDetails = {
              identifier: id,
              artist: show.artist,
              date: show.date,
              venue: show.venue,
              imageUrl: show.imageUrl,
            }
            cacheFavoriteShowDetails(details)
          } catch { /* skip */ }
        }
      }
      if (!cancelled) setFavShows(shows)
    }
    fetchFavs()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteShows.join(',')])

  const handleSelectArtist = (name: string) => {
    addRecentSearch(name)
    navigate(`/archive/artist/${encodeURIComponent(name)}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      addRecentSearch(query.trim())
    }
  }

  const handleRecentClick = (q: string) => {
    setQuery(q)
    addRecentSearch(q)
    inputRef.current?.focus()
  }

  const showRecentSearches = inputFocused && !query.trim() && recentSearches.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
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
        <form onSubmit={handleSearchSubmit} className="relative mt-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            placeholder="Search artists..."
            className="w-full pl-10 pr-4 py-3 bg-surface border border-white/5 rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10 focus:shadow-[0_0_16px_rgba(0,255,221,0.08)] transition-all"
          />
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </form>

        {/* Recent Searches */}
        {showRecentSearches && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted">Recent</span>
              <button onClick={clearRecentSearches} className="text-[11px] text-text-muted hover:text-neon-cyan transition-colors">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((q) => (
                <button
                  key={q}
                  onClick={() => handleRecentClick(q)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface rounded-full text-xs text-text-secondary ring-1 ring-white/5 hover:ring-neon-cyan/20 hover:text-neon-cyan transition-all"
                >
                  <span className="truncate max-w-[140px]">{q}</span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); removeRecentSearch(q) }}
                    className="text-text-muted hover:text-red-400 transition-colors ml-0.5"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
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
                  onClick={() => handleSelectArtist(artist.name)}
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
        ) : (
          <>
            {/* Pinned artists */}
            {pinnedArtists.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Your Artists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {pinnedArtists.map((artist, i) => (
                    <motion.button
                      key={artist.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => navigate(`/archive/artist/${encodeURIComponent(artist.name)}`)}
                      className="text-left bg-surface hover:bg-surface-hover rounded-xl p-4 transition-all duration-200 group ring-1 ring-white/5 hover:ring-neon-cyan/20"
                    >
                      {artist.imageUrl && (
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-card mb-3 ring-1 ring-white/5">
                          <img src={artist.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
                        {artist.name}
                      </p>
                      {artist.showCount != null && (
                        <p className="text-xs text-text-muted font-mono mt-0.5">
                          {artist.showCount.toLocaleString()} shows
                        </p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite shows */}
            {favShows.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Favorite Shows</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favShows.map((show, i) => (
                    <motion.div
                      key={show.identifier}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <ArchiveShowCard
                        show={show}
                        onClick={() => navigate(`/archive/show/${show.identifier}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Discover — top rated shows, collapsible */}
            {topShows.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setDiscoverOpen(!discoverOpen)}
                  className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors mb-3"
                >
                  <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${discoverOpen ? 'rotate-90' : ''}`} fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                  Top Rated Shows
                </button>
                {discoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {topShows.map((show, i) => (
                      <motion.div
                        key={show.identifier}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      >
                        <ArchiveShowCard
                          show={show}
                          onClick={() => navigate(`/archive/show/${encodeURIComponent(show.identifier)}`)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
            {discoverLoading && (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Top Rated Shows</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 ring-1 ring-white/5">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 skeleton rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 skeleton rounded w-2/3" />
                          <div className="h-3 skeleton rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular artists — show when no pinned artists */}
            {pinnedArtists.length === 0 && (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Popular Artists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {POPULAR_ARTISTS.map((name, i) => (
                    <motion.button
                      key={name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => handleSelectArtist(name)}
                      className="text-left bg-surface hover:bg-surface-hover rounded-xl p-4 transition-all duration-200 group ring-1 ring-white/5 hover:ring-neon-cyan/20"
                    >
                      <div className="w-10 h-10 rounded-lg bg-neon-cyan/5 flex items-center justify-center mb-3 ring-1 ring-neon-cyan/10">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-cyan/60" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
                        {name}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state — only when truly empty: no pinned, no recent, no popular (which always shows), so this is dead code now but keep for edge cases */}
        {!query.trim() && pinnedArtists.length === 0 && recentSearches.length > 0 && favShows.length === 0 && (
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
