import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import JellyImage from '../components/JellyImage'
import AlbumPlaceholder from '../components/AlbumPlaceholder'
import AlbumCard from '../components/AlbumCard'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'

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

interface ArtistAlbumGridProps {
  artist: BaseItemDto
  albums: BaseItemDto[]
  serverUrl: string | null
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

export default function ArtistAlbumGrid({ 
  artist, 
  albums, 
  serverUrl, 
  hasMore, 
  loadingMore, 
  onLoadMore 
}: ArtistAlbumGridProps) {
  const [discSort, setDiscSort] = useState<DiscographySort>('year-newest')
  const [showSort, setShowSort] = useState(false)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  const sentinelRef = useInfiniteScroll({ hasMore, loadMore: onLoadMore })

  const imgUrl = (item: BaseItemDto, size = 400) =>
    serverUrl ? getImageUrl(serverUrl, item.Id!, item.ImageTags?.Primary, size) : ''

  // Extract unique years for filter
  const years = [...new Set(albums.map(a => a.ProductionYear).filter((y): y is number => y != null))].sort((a, b) => b - a)

  const filteredAlbums = yearFilter ? albums.filter(a => a.ProductionYear === yearFilter) : albums
  const sortedAlbums = sortAlbums(filteredAlbums, discSort)

  return (
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

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neon-cyan animate-spin" fill="currentColor">
              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
            </svg>
          ) : (
            <span className="text-xs text-text-muted font-mono">Scroll for more</span>
          )}
        </div>
      )}
    </div>
  )
}