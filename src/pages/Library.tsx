import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import type { SortOption } from '../stores/ui'
import { fetchAlbums, fetchArtists, fetchPlaylists, getImageUrl, SortOrder, ItemSortBy } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import FilterPill from '../components/FilterPill'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import PlaylistCard from '../components/PlaylistCard'

const filters = ['Albums', 'Artists', 'Playlists', 'Recent']

const sortLabels: Record<SortOption, string> = {
  'name-asc': 'Name A→Z',
  'name-desc': 'Name Z→A',
  'artist-asc': 'Artist A→Z',
  'artist-desc': 'Artist Z→A',
  'year-newest': 'Year ↓',
  'year-oldest': 'Year ↑',
}

const sortOptions: SortOption[] = ['name-asc', 'name-desc', 'artist-asc', 'artist-desc', 'year-newest', 'year-oldest']

export default function Library() {
  const { api, userId, serverUrl } = useAuthStore()
  const { viewMode, setViewMode, sortOption, setSortOption, libraryFilter, setLibraryFilter } = useUIStore()
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [artists, setArtists] = useState<BaseItemDto[]>([])
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSort, setShowSort] = useState(false)

  const loadData = useCallback(async () => {
    if (!api || !userId) return
    setLoading(true)
    try {
      const sortMap: Record<SortOption, { sortBy: ItemSortBy[], sortOrder: SortOrder[] }> = {
        'name-asc': { sortBy: [ItemSortBy.SortName], sortOrder: [SortOrder.Ascending] },
        'name-desc': { sortBy: [ItemSortBy.SortName], sortOrder: [SortOrder.Descending] },
        'artist-asc': { sortBy: [ItemSortBy.AlbumArtist, ItemSortBy.SortName], sortOrder: [SortOrder.Ascending, SortOrder.Ascending] },
        'artist-desc': { sortBy: [ItemSortBy.AlbumArtist, ItemSortBy.SortName], sortOrder: [SortOrder.Descending, SortOrder.Ascending] },
        'year-newest': { sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName], sortOrder: [SortOrder.Descending, SortOrder.Ascending] },
        'year-oldest': { sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName], sortOrder: [SortOrder.Ascending, SortOrder.Ascending] },
      }
      const sort = sortMap[sortOption]

      const [albumsRes, artistsRes, playlistsRes] = await Promise.all([
        fetchAlbums(api, userId, { limit: 200, ...sort, searchTerm: search || undefined }),
        fetchArtists(api, userId, { limit: 200, searchTerm: search || undefined }),
        fetchPlaylists(api, userId),
      ])
      setAlbums(albumsRes.Items ?? [])
      setArtists(artistsRes.Items ?? [])
      setPlaylists(playlistsRes.Items ?? [])
    } catch (e) {
      console.error('Library fetch error', e)
    }
    setLoading(false)
  }, [api, userId, sortOption, search])

  useEffect(() => { loadData() }, [loadData])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [search])

  const imgUrl = (item: BaseItemDto, size = 300) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  const gridCols = viewMode === 'grid'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Library</h1>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library..."
                className="pl-9 pr-4 py-2 bg-surface border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/30 focus:ring-1 focus:ring-neon-cyan/10 w-48 transition-all focus:w-64"
              />
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {filters.map((f) => (
            <FilterPill key={f} label={f} active={libraryFilter === f} onClick={() => setLibraryFilter(f)} />
          ))}
          <div className="flex-1" />
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-white/5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
              </svg>
              {sortLabels[sortOption]}
            </button>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 bg-card border border-white/10 rounded-lg shadow-2xl py-1 z-30 min-w-[160px]"
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortOption(opt); setShowSort(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      sortOption === opt ? 'text-neon-cyan bg-neon-cyan/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : libraryFilter === 'Albums' || libraryFilter === 'Recent' ? (
          albums.length === 0 ? (
            <EmptyState text="No albums found" />
          ) : (
            <div className={gridCols}>
              {albums.map((a, i) => (
                <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                  <AlbumCard
                    id={a.Id!}
                    name={a.Name ?? 'Unknown'}
                    artistName={a.AlbumArtist ?? 'Unknown Artist'}
                    imageUrl={imgUrl(a)}
                    year={a.ProductionYear ?? undefined}
                  />
                </motion.div>
              ))}
            </div>
          )
        ) : libraryFilter === 'Artists' ? (
          artists.length === 0 ? (
            <EmptyState text="No artists found" />
          ) : (
            <div className={gridCols}>
              {artists.map((a, i) => (
                <motion.div key={a.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                  <ArtistCard
                    id={a.Id!}
                    name={a.Name ?? 'Unknown'}
                    imageUrl={a.ImageTags?.Primary ? imgUrl(a) : undefined}
                  />
                </motion.div>
              ))}
            </div>
          )
        ) : libraryFilter === 'Playlists' ? (
          playlists.length === 0 ? (
            <EmptyState text="No playlists yet" />
          ) : (
            <div className={gridCols}>
              {playlists.map((p, i) => (
                <motion.div key={p.Id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                  <PlaylistCard
                    id={p.Id!}
                    name={p.Name ?? 'Untitled'}
                    imageUrl={p.ImageTags?.Primary ? imgUrl(p) : undefined}
                    trackCount={p.ChildCount ?? undefined}
                  />
                </motion.div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-text-muted">
      <svg viewBox="0 0 24 24" className="w-12 h-12 mb-3 opacity-30" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
      <p className="text-sm">{text}</p>
    </div>
  )
}
