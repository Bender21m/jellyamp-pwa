import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '../stores/auth'
import type { Track } from '../stores/player'
import { searchAll, getImageUrl, BaseItemKind } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import TrackRow from '../components/TrackRow'
import TrackContextMenu from '../components/TrackContextMenu'
import EmptyState from '../components/EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

const SEARCH_HISTORY_KEY = 'jellyamp-search-history'
const MAX_HISTORY_ITEMS = 10

// Search history helpers
function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return
  
  const history = getSearchHistory()
  const trimmedQuery = query.trim()
  
  // Remove if already exists
  const filteredHistory = history.filter(item => item !== trimmedQuery)
  
  // Add to beginning
  const newHistory = [trimmedQuery, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS)
  
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  } catch (error) {
    console.error('Failed to save search history:', error)
  }
}

function removeFromSearchHistory(query: string) {
  const history = getSearchHistory()
  const newHistory = history.filter(item => item !== query)
  
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  } catch (error) {
    console.error('Failed to update search history:', error)
  }
}

function clearSearchHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear search history:', error)
  }
}

export default function Search() {
  const { api, userId, serverUrl } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextTrack, setContextTrack] = useState<Track | null>(null)
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory)
  const [showHistory, setShowHistory] = useState(false)

  // Pull to refresh — re-runs current search
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const {
    containerRef: pullContainerRef,
    touchHandlers: pullTouchHandlers,
    isRefreshing: isPullRefreshing,
    isPulling,
    shouldTrigger,
    progress: pullProgress
  } = usePullToRefresh({
    onRefresh: async () => {
      if (!query.trim() || !api || !userId) return
      setLoading(true)
      setError(null)
      try {
        const res = await searchAll(api, userId, query.trim())
        setResults(res.Items ?? [])
      } catch (e) {
        console.error('Search refresh failed', e)
        setError('Search failed. Please try again.')
      }
      setLoading(false)
    },
    disabled: !isTouchDevice
  })

  useEffect(() => {
    if (!query.trim() || !api || !userId) {
      // Clearing search results when query is empty is legitimate
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
       
      setError(null)
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchAll(api, userId, query.trim())
        setResults(res.Items ?? [])
        // Add to history on successful search
        addToSearchHistory(query.trim())
        setSearchHistory(getSearchHistory())
      } catch (e) {
        console.error('Search failed', e)
        setError('Search failed. Please try again.')
        setResults([])
      }
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, api, userId])

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const artists = useMemo(() => results.filter(r => r.Type === BaseItemKind.MusicArtist), [results])
  const albums = useMemo(() => results.filter(r => r.Type === BaseItemKind.MusicAlbum), [results])
  const tracks = useMemo(() => results.filter(r => r.Type === BaseItemKind.Audio), [results])

  const mappedTracks: Track[] = useMemo(() => tracks.map(t => ({
    id: t.Id!,
    name: t.Name ?? 'Unknown',
    albumId: t.AlbumId ?? undefined,
    albumName: t.Album ?? '',
    artistName: t.AlbumArtist ?? t.Artists?.[0] ?? '',
    duration: (t.RunTimeTicks ?? 0) / 10000000,
    imageUrl: t.AlbumId && serverUrl ? getImageUrl(serverUrl, t.AlbumId, t.AlbumPrimaryImageTag, 120) : undefined,
  })), [tracks, serverUrl])

  // Search history handlers
  const handleHistoryClick = useCallback((historyQuery: string) => {
    setQuery(historyQuery)
    setShowHistory(false)
  }, [])

  const handleRemoveHistory = useCallback((historyQuery: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFromSearchHistory(historyQuery)
    setSearchHistory(getSearchHistory())
  }, [])

  const handleClearHistory = useCallback(() => {
    clearSearchHistory()
    setSearchHistory([])
  }, [])

  return (
    <div className="h-full flex flex-col" onClick={() => setShowHistory(false)}>
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 space-y-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Search</h1>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(!query.trim() && searchHistory.length > 0)}
            onBlur={() => setTimeout(() => setShowHistory(false), 150)} // Delay to allow clicks
            placeholder="Search artists, albums, tracks..."
            autoFocus
            className="w-full pl-12 pr-4 py-3.5 bg-surface border border-white/5 rounded-xl text-[15px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10 transition-all focus-ring"
          />
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          
          {/* Search History */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-lg z-10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted/70 uppercase tracking-wider">Recent Searches</span>
                <button 
                  onClick={handleClearHistory}
                  className="text-xs text-text-muted/50 hover:text-text-muted transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {searchHistory.map((historyItem) => (
                  <button
                    key={historyItem}
                    onClick={() => handleHistoryClick(historyItem)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm text-text-primary/80 hover:text-text-primary transition-colors"
                  >
                    <span className="truncate max-w-[120px]">{historyItem}</span>
                    <button
                      onClick={(e) => handleRemoveHistory(historyItem, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded-full transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={(el) => pullContainerRef(el)}
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
        {!query ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 mb-4 text-gradient opacity-60">
              <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <p className="text-[15px] text-text-secondary">Start typing to search your library</p>
          </div>
        ) : loading ? (
          <div className="space-y-8 mt-4">
            <div>
              <div className="h-5 skeleton rounded w-20 mb-4" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}><div className="aspect-square skeleton rounded-xl mb-3" /><div className="h-4 skeleton rounded w-3/4" /></div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            }
            title="Something went wrong"
            subtitle={error}
            action={{
              label: "Try again",
              onClick: async () => {
                if (!api || !userId || !query.trim()) return
                setLoading(true)
                setError(null)
                try {
                  const res = await searchAll(api, userId, query.trim())
                  setResults(res.Items ?? [])
                } catch (e) {
                  console.error('Search retry failed', e)
                  setError('Search failed. Please try again.')
                  setResults([])
                }
                setLoading(false)
              }
            }}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            }
            title="No results found"
            subtitle={`We couldn't find anything for "${query}". Try searching for something else.`}
          />
        ) : (
          <div className="space-y-8">
            {artists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">Artists</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {artists.slice(0, 5).map(a => (
                    <ArtistCard key={a.Id} id={a.Id!} name={a.Name ?? ''} imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined} />
                  ))}
                </div>
              </section>
            )}
            {albums.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
                  {albums.slice(0, 5).map(a => (
                    <AlbumCard key={a.Id} id={a.Id!} name={a.Name ?? ''} artistName={a.AlbumArtist ?? ''} imageUrl={imgUrl(a)} year={a.ProductionYear ?? undefined} />
                  ))}
                </div>
              </section>
            )}
            {tracks.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">Tracks</h2>
                <div className="space-y-0.5">
                  {mappedTracks.slice(0, 10).map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      allTracks={mappedTracks}
                      showIndex={false}
                      showArt
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextTrack(track)
                        setContextPos({ x: e.clientX, y: e.clientY })
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <TrackContextMenu
        track={contextTrack}
        position={contextPos}
        onClose={() => { setContextTrack(null); setContextPos(null) }}
      />
    </div>
  )
}
