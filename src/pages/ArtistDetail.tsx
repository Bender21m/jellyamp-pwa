import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchAlbums, fetchTracks, getImageUrl, fetchArtistById } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import AlbumCard from '../components/AlbumCard'

type DiscographySort = 'year-newest' | 'year-oldest' | 'name-asc' | 'name-desc'

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
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [artist, setArtist] = useState<BaseItemDto | null>(null)
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [discSort, setDiscSort] = useState<DiscographySort>('year-newest')
  const [showSort, setShowSort] = useState(false)
  const [yearFilter, setYearFilter] = useState<number | null>(null)

  useEffect(() => {
    if (!api || !userId || !id) return
    loadArtist()
  }, [id, api, userId])

  async function loadArtist() {
    if (!api || !userId || !id || !serverUrl) return
    setLoading(true)
    try {
      const [artistData, albumsRes] = await Promise.all([
        fetchArtistById(api, userId, id),
        fetchAlbums(api, userId, { artistIds: [id], limit: 200 }),
      ])
      setArtist(artistData)
      setAlbums(albumsRes.Items ?? [])
    } catch (e) {
      console.error('Failed to load artist', e)
    }
    setLoading(false)
  }

  async function playAll(shuffle = false) {
    if (!api || !userId || !serverUrl || albums.length === 0) return
    try {
      const allTracks: Track[] = []
      for (const album of sortedAlbums) {
        const tracksRes = await fetchTracks(api, userId, album.Id!)
        const mapped = (tracksRes.Items ?? []).map((t) => ({
          id: t.Id!,
          name: t.Name ?? 'Unknown',
          albumId: album.Id!,
          albumName: album.Name ?? '',
          artistName: artist?.Name ?? '',
          duration: (t.RunTimeTicks ?? 0) / 10000000,
          imageUrl: getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary),
        }))
        allTracks.push(...mapped)
      }
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

  const artistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 400)
    : null

  const backdropUrl = albums.length > 0 && serverUrl
    ? getImageUrl(serverUrl, albums[0].Id!, albums[0].ImageTags?.Primary, 600)
    : null

  // Extract unique years for filter
  const years = [...new Set(albums.map(a => a.ProductionYear).filter((y): y is number => y != null))].sort((a, b) => b - a)

  const filteredAlbums = yearFilter ? albums.filter(a => a.ProductionYear === yearFilter) : albums
  const sortedAlbums = sortAlbums(filteredAlbums, discSort)

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

  if (!artist) return <div className="p-6 text-text-muted">Artist not found</div>

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      {/* Artist header */}
      <div className="relative overflow-hidden">
        {backdropUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover scale-150 blur-[80px] opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-b from-deep-black/40 to-deep-black" />
          </div>
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
                <div className="w-full h-full bg-gradient-to-br from-neon-cyan/20 via-purple/20 to-neon-pink/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-text-muted/30" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex flex-col items-center md:items-start min-w-0 gap-1">
              <h1 className="text-2xl md:text-4xl lg:text-[42px] font-black tracking-[-0.03em] leading-tight">
                {artist.Name}
              </h1>
              <p className="text-sm text-text-secondary">
                {albums.length} album{albums.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playAll(false)}
                  className="h-11 inline-flex items-center gap-2 px-8 rounded-full bg-gradient-primary text-deep-black font-bold text-sm whitespace-nowrap shrink-0"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discography */}
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold tracking-[-0.02em]">Discography</h2>

          {/* Sort dropdown */}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7">
          {sortedAlbums.map((a, i) => (
            <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <AlbumCard
                id={a.Id!}
                name={a.Name ?? 'Unknown'}
                artistName={a.AlbumArtist ?? artist.Name ?? ''}
                imageUrl={imgUrl(a)}
                year={a.ProductionYear ?? undefined}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
