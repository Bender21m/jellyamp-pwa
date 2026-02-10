import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchArtists, searchShows, getShowsOnThisDay, getRecentlyAdded } from '../lib/archive'
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

// Generate a consistent color from artist name for avatar gradients
function artistColor(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors: [string, string][] = [
    ['from-cyan-500/20', 'to-teal-500/10'],
    ['from-violet-500/20', 'to-purple-500/10'],
    ['from-amber-500/20', 'to-orange-500/10'],
    ['from-emerald-500/20', 'to-green-500/10'],
    ['from-rose-500/20', 'to-pink-500/10'],
    ['from-sky-500/20', 'to-blue-500/10'],
    ['from-fuchsia-500/20', 'to-purple-500/10'],
  ]
  return colors[Math.abs(hash) % colors.length]
}

function SectionHeader({ title, count, defaultOpen = true, children }: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-4 group"
      >
        <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-all ${open ? 'rotate-90' : ''}`} fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
        <span className="text-[13px] font-bold text-text-secondary group-hover:text-text-primary tracking-tight transition-colors">
          {title}
        </span>
        {count != null && (
          <span className="text-[11px] font-mono text-text-muted/60">{count.toLocaleString()}</span>
        )}
      </button>
      {open && children}
    </div>
  )
}

function ShowGrid({ shows, navigate, hideArtist }: {
  shows: ArchiveShow[]
  navigate: ReturnType<typeof useNavigate>
  hideArtist?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {shows.map((show, i) => (
        <motion.div
          key={show.identifier}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
        >
          <ArchiveShowCard
            show={show}
            hideArtist={hideArtist}
            onClick={() => navigate(`/archive/show/${encodeURIComponent(show.identifier)}`)}
          />
        </motion.div>
      ))}
    </div>
  )
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.04]">
          <div className="flex gap-4">
            <div className="w-[72px] h-[72px] skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-3 skeleton rounded w-2/5" />
              <div className="h-4 skeleton rounded w-3/5" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatMonthDay(month: number, day: number): string {
  const d = new Date(2000, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

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
  const [onThisDayShows, setOnThisDayShows] = useState<ArchiveShow[]>([])
  const [onThisDayTotal, setOnThisDayTotal] = useState(0)
  const [recentlyAdded, setRecentlyAdded] = useState<ArchiveShow[]>([])
  const [sectionsLoading, setSectionsLoading] = useState({ topRated: false, onThisDay: false, recentlyAdded: false })
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

  // Fetch discovery sections in parallel
  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    setSectionsLoading({ topRated: true, onThisDay: true, recentlyAdded: true })

    // Top rated
    searchShows('', { rows: 12, sort: 'avg_rating desc' })
      .then((res) => setTopShows(res.shows.filter(s => s.rating && s.rating >= 4)))
      .catch(() => {})
      .finally(() => setSectionsLoading(prev => ({ ...prev, topRated: false })))

    // On This Day
    getShowsOnThisDay(month, day, { rows: 12 })
      .then((res) => {
        setOnThisDayShows(res.shows)
        setOnThisDayTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setSectionsLoading(prev => ({ ...prev, onThisDay: false })))

    // Recently Added
    getRecentlyAdded({ rows: 12 })
      .then((shows) => setRecentlyAdded(shows))
      .catch(() => {})
      .finally(() => setSectionsLoading(prev => ({ ...prev, recentlyAdded: false })))
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
  const today = new Date()
  const todayLabel = formatMonthDay(today.getMonth() + 1, today.getDate())

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
        <div className="flex items-baseline gap-3 mb-0.5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.04em]">Live Archive</h1>
        </div>
        <p className="text-[13px] text-text-muted tracking-wide">200,000+ live recordings from the Internet Archive</p>

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
            className="w-full pl-10 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/25 focus:bg-white/[0.04] focus:shadow-[0_0_24px_rgba(0,255,221,0.06)] transition-all duration-300"
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
          <SkeletonGrid />
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
                  className="text-left bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-5 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
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
                      className="text-left bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-4 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
                    >
                      {artist.imageUrl && (
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/[0.03] mb-3 ring-1 ring-white/[0.06] shadow-lg shadow-black/30 group-hover:ring-white/[0.12] transition-all">
                          <img src={artist.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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

            {/* Popular Artists — always visible, horizontal scroll */}
            <SectionHeader title="🎸 Popular Artists" defaultOpen={pinnedArtists.length === 0}>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {POPULAR_ARTISTS.map((name, i) => {
                  const [from, to] = artistColor(name)
                  return (
                    <motion.button
                      key={name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => handleSelectArtist(name)}
                      className="shrink-0 w-[120px] text-center bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-3.5 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
                    >
                      <div className={`w-16 h-16 rounded-full mx-auto mb-2.5 ring-2 ring-white/10 group-hover:ring-neon-cyan/30 transition-all shadow-lg shadow-black/30 bg-gradient-to-br ${from} ${to} flex items-center justify-center`}>
                        <span className="text-xl font-bold text-white/60 group-hover:text-white/80 transition-colors">{name.charAt(0)}</span>
                      </div>
                      <p className="text-[13px] font-semibold text-text-primary group-hover:text-neon-cyan transition-colors line-clamp-2 leading-tight">
                        {name}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </SectionHeader>

            {/* Favorite shows */}
            {favShows.length > 0 && (
              <SectionHeader title="Favorite Shows" count={favShows.length}>
                <ShowGrid shows={favShows} navigate={navigate} />
              </SectionHeader>
            )}

            {/* On This Day */}
            {sectionsLoading.onThisDay ? (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
                  📅 On This Day — {todayLabel}
                </h2>
                <SkeletonGrid />
              </div>
            ) : onThisDayShows.length > 0 && (
              <SectionHeader title={`📅 On This Day — ${todayLabel}`} count={onThisDayTotal}>
                <ShowGrid shows={onThisDayShows} navigate={navigate} />
              </SectionHeader>
            )}

            {/* Recently Added */}
            {sectionsLoading.recentlyAdded ? (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
                  🆕 Just Added
                </h2>
                <SkeletonGrid />
              </div>
            ) : recentlyAdded.length > 0 && (
              <SectionHeader title="🆕 Just Added">
                <ShowGrid shows={recentlyAdded} navigate={navigate} />
              </SectionHeader>
            )}

            {/* Top Rated */}
            {sectionsLoading.topRated ? (
              <div className="mb-8">
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
                  ⭐ Top Rated Shows
                </h2>
                <SkeletonGrid />
              </div>
            ) : topShows.length > 0 && (
              <SectionHeader title="⭐ Top Rated Shows">
                <ShowGrid shows={topShows} navigate={navigate} />
              </SectionHeader>
            )}

          </>
        )}
      </div>
    </div>
  )
}
