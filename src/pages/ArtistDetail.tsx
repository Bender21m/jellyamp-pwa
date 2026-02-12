import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import JellyImage from '../components/JellyImage'
import ArtistPlaceholder from '../components/ArtistPlaceholder'
import AlbumPlaceholder from '../components/AlbumPlaceholder'
import { useArtistImage } from '../hooks/useArtistImage'
import { fetchAlbums, fetchArtistTracks, getImageUrl, fetchArtistById, toggleFavorite, fetchSimilarArtists, getInstantMix } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { useAlbumColors } from '../hooks/useAlbumColors'
import { useScrollRestore } from '../hooks/useScrollRestore'
import AlbumCard from '../components/AlbumCard'
import EmptyState from '../components/EmptyState'

type DiscographySort = 'year-newest' | 'year-oldest' | 'name-asc' | 'name-desc'
type ViewMode = 'grid' | 'list'

const sortLabels: Record<DiscographySort, string> = {
  'year-newest': 'Newest First',
  'year-oldest': 'Oldest First',
  'name-asc': 'Name A→Z',
  'name-desc': 'Name Z→A',
}

function sortAlbums(albums: BaseItemDto[], sort: DiscographySort): BaseItemDto[] {
  return [...albums].sort((a, b) => {
    switch (sort) {
      case 'year-newest': return (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0)
      case 'year-oldest': return (a.ProductionYear ?? 0) - (b.ProductionYear ?? 0)
      case 'name-asc': return (a.Name ?? '').localeCompare(b.Name ?? '')
      case 'name-desc': return (b.Name ?? '').localeCompare(a.Name ?? '')
    }
  })
}

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl, accessToken } = useAuthStore()
  const setTrack = usePlayerStore(s => s.setTrack)
  const setRadioMode = usePlayerStore(s => s.setRadioMode)
  const [artist, setArtist] = useState<BaseItemDto | null>(null)
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [totalAlbumCount, setTotalAlbumCount] = useState(0)
  const [similarArtists, setSimilarArtists] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discSort, setDiscSort] = useState<DiscographySort>('year-newest')
  const [showSort, setShowSort] = useState(false)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isFav, setIsFav] = useState(false)

  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollRestore(scrollContainerRef)

  async function loadArtist() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    setError(null)
    try {
      const [artistData, albumsRes, similarRes] = await Promise.all([
        fetchArtistById(api, userId, id),
        fetchAlbums(api, userId, { artistIds: [id], limit: 20 }),
        fetchSimilarArtists(api, userId, id),
      ])
      setArtist(artistData)
      setIsFav(artistData?.UserData?.IsFavorite ?? false)
      setAlbums(albumsRes.Items ?? [])
      setTotalAlbumCount(albumsRes.TotalRecordCount ?? albumsRes.Items?.length ?? 0)
      setSimilarArtists(similarRes)
    } catch (e) {
      console.error('Failed to load artist', e)
      setError('Failed to load artist. Please try again.')
      setArtist(null)
      setAlbums([])
      setSimilarArtists([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!api || !userId || !id) return
    loadArtist()
  }, [id, api, userId, loadArtist])

  const hasMore = albums.length < totalAlbumCount

  // Ref keeps latest load-more fn to avoid stale closures in intersection observer
  const loadMoreFnRef = useRef<() => void>(() => {})
  useEffect(() => {
    loadMoreFnRef.current = async () => {
      if (!api || !userId || !id || loadingMore || !hasMore) return
      setLoadingMore(true)
      try {
        const res = await fetchAlbums(api, userId, { artistIds: [id], limit: 20, startIndex: albums.length })
        setAlbums(prev => [...prev, ...(res.Items ?? [])])
      } catch (e) {
        console.error('Failed to load more albums', e)
      }
      setLoadingMore(false)
    }
  }) // intentionally no deps — updates ref on every render

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreFnRef.current() },
      { rootMargin: '200px' }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, albums.length, loadingMore])

  async function playAll(shuffle = false) {
    if (!api || !userId || !serverUrl || !id || albums.length === 0) return
    try {
      // Fetch all tracks for the artist in a single API call instead of sequential album fetches
      const tracksRes = await fetchArtistTracks(api, userId, id)
      const allTracks: Track[] = (tracksRes.Items ?? []).map((t) => ({
        id: t.Id!,
        name: t.Name ?? 'Unknown',
        albumId: t.AlbumId ?? undefined,
        albumName: t.Album ?? '',
        artistName: t.AlbumArtist ?? artist?.Name ?? '',
        duration: (t.RunTimeTicks ?? 0) / 10000000,
        imageUrl: t.AlbumId 
          ? getImageUrl(serverUrl, t.AlbumId, t.AlbumPrimaryImageTag)
          : undefined,
      }))
      
      if (allTracks.length > 0) {
        if (shuffle) {
          const shuffled = [...allTracks].sort(() => Math.random() - 0.5)
          setTrack(shuffled[0], shuffled, 0)
        } else {
          setTrack(allTracks[0], allTracks, 0)
        }
      }
    } catch (e) {
      console.error('Play all failed', e)
    }
  }

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const jellyfinArtistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 400)
    : null
  const wikiArtistImage = useArtistImage(artist?.Name ?? '', !!jellyfinArtistImage)
  const artistImage = jellyfinArtistImage || wikiArtistImage

  const backdropUrl = albums.length > 0 && serverUrl
    ? getImageUrl(serverUrl, albums[0].Id!, albums[0].ImageTags?.Primary, 600)
    : null

  // Extract unique years for filter
  const years = [...new Set(albums.map(a => a.ProductionYear).filter((y): y is number => y != null))].sort((a, b) => b - a)

  const filteredAlbums = yearFilter ? albums.filter(a => a.ProductionYear === yearFilter) : albums
  const sortedAlbums = sortAlbums(filteredAlbums, discSort)
  
  // Extract colors from artist image or first album
  const colorSourceUrl = artistImage || backdropUrl
  const { colors: artistColors } = useAlbumColors(colorSourceUrl || undefined)

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-48 md:pb-28 px-4 md:px-8 pt-6">
        <div className="flex flex-col items-center md:flex-row md:items-start gap-5 md:gap-8 mb-8">
          <div className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] skeleton rounded-xl shrink-0" />
          <div className="flex flex-col items-center md:items-start gap-3 flex-1 w-full">
            <div className="h-4 skeleton rounded w-16" />
            <div className="h-10 skeleton rounded w-2/3" />
            <div className="h-4 skeleton rounded w-24" />
            <div className="flex gap-3 mt-1">
              <div className="h-10 skeleton rounded-full w-32" />
              <div className="h-10 skeleton rounded-full w-28" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square skeleton rounded-xl mb-3" />
              <div className="h-4 skeleton rounded w-3/4 mb-2" />
              <div className="h-3.5 skeleton rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
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
              onClick: () => loadArtist()
            }}
          />
        </div>
      </div>
    )
  }

  if (!artist) return <div className="p-6 text-text-muted">Artist not found</div>

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto pb-48 md:pb-28">
      {/* Artist header */}
      <div className="relative overflow-hidden">
        {backdropUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover scale-150 blur-[80px] opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-b from-deep-black/40 to-deep-black" />
          </div>
        )}
        
        {/* Color gradient overlay */}
        {artistColors && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${artistColors.primary}35 0%, ${artistColors.secondary}25 50%, transparent 100%)`
            }}
          />
        )}

        <div className="relative px-4 md:px-8 py-8 md:py-10">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back
          </button>

          {/* Mobile: centered layout. Desktop: side by side */}
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-5 md:gap-8">
            {/* Artist image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10"
            >
              {artistImage ? (
                <img src={artistImage} alt={artist.Name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <ArtistPlaceholder name={artist.Name ?? ''} className="w-full h-full rounded-xl" textSize="text-5xl" />
              )}
            </motion.div>

            {/* Info */}
            <div className="flex flex-col items-center md:items-start flex-1 min-w-0 gap-1">
              <h1 className="text-2xl md:text-4xl lg:text-[42px] font-black tracking-[-0.03em] leading-tight">
                {artist.Name}
              </h1>
              <p className="text-sm text-text-secondary">
                {albums.length} album{albums.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start self-stretch">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playAll(false)}
                  className="h-11 inline-flex items-center gap-2 rounded-full bg-gradient-primary text-deep-black font-bold text-sm whitespace-nowrap shrink-0"
                  style={{ paddingLeft: '1.75rem', paddingRight: '1.75rem' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  <span>Play All</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playAll(true)}
                  className="h-11 inline-flex items-center gap-2.5 px-6 rounded-full border border-white/10 text-sm text-text-secondary whitespace-nowrap hover:text-text-primary hover:border-white/20 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                  Shuffle
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    if (!id || !serverUrl || !accessToken || !userId) return
                    try {
                      const items = await getInstantMix(serverUrl, id, accessToken, userId, 20)
                      if (items.length > 0) {
                        const mapped: Track[] = items.map(t => ({
                          id: t.Id!,
                          name: t.Name ?? 'Unknown',
                          albumId: t.AlbumId ?? undefined,
                          albumName: t.Album ?? '',
                          artistName: t.AlbumArtist ?? t.Artists?.[0] ?? '',
                          artistId: t.AlbumArtists?.[0]?.Id ?? undefined,
                          duration: (t.RunTimeTicks ?? 0) / 10_000_000,
                          imageUrl: (t.ImageTags?.Primary || t.AlbumPrimaryImageTag)
                            ? getImageUrl(serverUrl, t.ImageTags?.Primary ? t.Id! : (t.AlbumId ?? t.Id!), t.ImageTags?.Primary ?? t.AlbumPrimaryImageTag)
                            : undefined,
                          isFavorite: t.UserData?.IsFavorite ?? false,
                        }))
                        setTrack(mapped[0], mapped, 0)
                        setRadioMode(true, id)
                      }
                    } catch (err) { console.error('Start radio failed:', err) }
                  }}
                  className="h-11 inline-flex items-center gap-2.5 px-6 rounded-full border border-white/10 text-sm text-text-secondary whitespace-nowrap hover:text-text-primary hover:border-white/20 transition-all"
                >
                  <span className="text-base leading-none">∞</span>
                  Radio
                </motion.button>
                {/* Random Show button - only show if artist has more than 1 album */}
                {albums.length > 1 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      // Pick a random album from the artist's discography
                      const randomIndex = Math.floor(Math.random() * albums.length)
                      const randomAlbum = albums[randomIndex]
                      // Navigate to the album and auto-play
                      navigate(`/album/${randomAlbum.Id}`)
                      // Small delay to let navigation complete, then play
                      setTimeout(() => {
                        playAll(false)
                      }, 100)
                    }}
                    className="h-11 inline-flex items-center gap-2.5 px-6 rounded-full border border-white/10 text-sm text-text-secondary whitespace-nowrap hover:text-text-primary hover:border-white/20 transition-all"
                  >
                    <span className="text-base">🎲</span>
                    Random Show
                  </motion.button>
                )}
                <button
                  onClick={async () => {
                    if (!api || !userId || !id) return
                    try {
                      await toggleFavorite(api, userId, id, isFav)
                      setIsFav(!isFav)
                    } catch { /* ignore */ }
                  }}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    isFav
                      ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink'
                      : 'border-white/10 text-text-muted hover:text-neon-pink hover:border-neon-pink/30'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFav ? 0 : 2}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discography */}
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold tracking-[-0.02em]">Discography</h2>

          {/* Sort dropdown + View toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-white/5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
                </svg>
                {sortLabels[discSort]}
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSort(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-1 bg-card border border-white/10 rounded-lg shadow-2xl py-1 z-30 min-w-[160px]"
                  >
                    {(Object.keys(sortLabels) as DiscographySort[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setDiscSort(opt); setShowSort(false) }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          discSort === opt ? 'text-neon-cyan bg-neon-cyan/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        {sortLabels[opt]}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Year filter pills */}
        {years.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-5 mb-5 border-b border-white/5 scrollbar-hide">
            <button
              onClick={() => setYearFilter(null)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                yearFilter === null
                  ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                  : 'bg-surface text-text-muted hover:text-text-primary border border-white/5'
              }`}
            >
              All ({albums.length})
            </button>
            {years.map((year) => {
              const count = albums.filter(a => a.ProductionYear === year).length
              return (
                <button
                  key={year}
                  onClick={() => setYearFilter(yearFilter === year ? null : year)}
                  className={`shrink-0 px-5 py-2 rounded-full text-sm font-mono font-medium transition-all whitespace-nowrap ${
                    yearFilter === year
                      ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                      : 'bg-surface text-text-muted hover:text-text-primary border border-white/5'
                  }`}
                >
                  {year} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Grid or List View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7">
            {sortedAlbums.map((a, i) => (
              <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <AlbumCard
                  id={a.Id!}
                  name={a.Name ?? 'Unknown'}
                  artistName={a.AlbumArtist ?? artist.Name ?? ''}
                  imageUrl={a.ImageTags?.Primary ? imgUrl(a) : ''}
                  year={a.ProductionYear ?? undefined}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-px">
            {sortedAlbums.map((a, i) => (
              <motion.div 
                key={a.Id} 
                initial={{ opacity: 0, y: 4 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
              >
                <Link
                  to={`/album/${a.Id}`}
                  className="flex items-center gap-4 px-3 md:px-4 h-[60px] rounded-lg cursor-pointer group transition-colors hover:bg-white/[0.03] odd:bg-white/[0.015]"
                >
                  {/* Album art */}
                  {a.ImageTags?.Primary ? (
                    <JellyImage src={imgUrl(a, 48)} width={48} height={48} maxWidth={80} alt={a.Name ?? ''} className="w-12 h-12 rounded-lg shrink-0 ring-1 ring-white/10" />
                  ) : (
                    <AlbumPlaceholder albumName={a.Name ?? ''} artistName={a.AlbumArtist ?? ''} className="w-12 h-12 rounded-lg shrink-0 ring-1 ring-white/10" />
                  )}
                  
                  {/* Album info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-[15px] font-semibold truncate text-text-primary group-hover:text-neon-cyan transition-colors">
                      {a.Name ?? 'Unknown'}
                    </p>
                    <div className="text-[13px] text-text-muted truncate flex items-center gap-1">
                      {a.ProductionYear && <span>{a.ProductionYear}</span>}
                      {a.ProductionYear && a.ChildCount && <span className="text-text-muted/60">•</span>}
                      {a.ChildCount && <span>{a.ChildCount} tracks</span>}
                    </div>
                  </div>
                  
                  {/* Arrow icon */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted/40 group-hover:text-neon-cyan transition-colors shrink-0" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          {loadingMore ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neon-cyan animate-spin" fill="currentColor">
              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
            </svg>
          ) : (
            <span className="text-xs text-text-muted font-mono">Scroll for more</span>
          )}
        </div>
      )}

      {/* Similar Artists */}
      {similarArtists.length > 0 && (
        <div className="px-4 md:px-8 pt-8 md:pt-10 pb-4">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Similar Artists</h2>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
            {similarArtists.map((similar, i) => {
              const similarImageUrl = similar.ImageTags?.Primary && serverUrl
                ? getImageUrl(serverUrl, similar.Id!, similar.ImageTags.Primary, 80)
                : null
              
              return (
                <motion.div 
                  key={similar.Id} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  className="shrink-0"
                >
                  <Link
                    to={`/artist/${similar.Id}`}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors min-w-[100px]"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-card ring-1 ring-white/5 hover:ring-neon-cyan/40 transition-all">
                      <JellyImage src={similarImageUrl ?? undefined} width={80} height={80} maxWidth={300} alt={similar.Name ?? ''} className="w-full h-full" />
                    </div>
                    <span className="text-xs text-center font-medium text-text-secondary hover:text-neon-cyan transition-colors max-w-[90px] truncate">
                      {similar.Name ?? 'Unknown Artist'}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
