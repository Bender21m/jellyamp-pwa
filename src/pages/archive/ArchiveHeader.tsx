import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchiveStore } from '../../stores/archive'
import FeatureHint from '../../components/FeatureHint'

// Only artists verified to have substantial catalogs on archive.org/etree
const POPULAR_ARTISTS = [
  'Grateful Dead', 'Disco Biscuits', 'Widespread Panic',
  'String Cheese Incident', 'moe.', 'Phil Lesh', 'Max Creek',
  'Yonder Mountain String Band', 'Railroad Earth', 'Dark Star Orchestra',
  'Leftover Salmon', 'Keller Williams', 'Tedeschi Trucks Band',
  'Lotus', 'Galactic', 'New Riders of the Purple Sage',
  'Bob Weir', 'Pigeons Playing Ping Pong', 'Assembly of Dust',
]

interface ArchiveHeaderProps {
  query: string
  setQuery: (query: string) => void
  searchMode: 'artists' | 'shows'
  setSearchMode: (mode: 'artists' | 'shows') => void
  inputFocused: boolean
  setInputFocused: (focused: boolean) => void
}

export default function ArchiveHeader({
  query,
  setQuery,
  searchMode,
  setSearchMode,
  inputFocused,
  setInputFocused,
}: ArchiveHeaderProps) {
  const navigate = useNavigate()
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useArchiveStore()
  const inputRef = useRef<HTMLInputElement>(null)

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
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
      <div className="flex items-center gap-2.5 mb-0.5">
        {/* Internet Archive logo */}
        <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8 text-neon-cyan shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M4 21V8l8-5 8 5v13" />
          <path d="M9 21v-6h6v6M9 12h1M14 12h1M9 15h1M14 15h1" />
          <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.04em]">Live Archive</h1>
      </div>
      <p className="text-[13px] text-text-muted tracking-wide">200,000+ live recordings from the Internet Archive</p>

      {/* Feature Hint */}
      <FeatureHint
        hintKey="archive-intro"
        title="Welcome to the Live Archive!"
        description="Discover 250,000+ live recordings from legendary artists like Grateful Dead, Widespread Panic, and more. All free from archive.org."
        className="mt-4"
      />

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative mt-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 200)}
          placeholder={searchMode === 'shows' ? 'Search shows...' : 'Search artists...'}
          className="w-full pl-10 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/25 focus:bg-white/[0.04] focus:shadow-[0_0_24px_rgba(0,255,221,0.06)] transition-all duration-300"
        />
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </form>

      {/* Search Mode Toggle */}
      <div className="flex gap-1 mt-3 bg-white/[0.03] rounded-full p-0.5 w-fit border border-white/[0.04]">
        {(['artists', 'shows'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              searchMode === mode
                ? 'bg-neon-cyan/15 text-neon-cyan'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {mode === 'artists' ? 'Artists' : 'Shows'}
          </button>
        ))}
      </div>

      {/* Suggested Artists */}
      {inputFocused && !query.trim() && recentSearches.length === 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-2 block">Suggested Artists</span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_ARTISTS.map((name) => (
              <button
                key={name}
                onClick={() => handleSelectArtist(name)}
                className="px-3 py-1.5 bg-neon-cyan/5 text-neon-cyan/70 rounded-full text-xs ring-1 ring-neon-cyan/10 hover:ring-neon-cyan/30 hover:text-neon-cyan transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

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
  )
}