import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import { fetchRecentlyPlayed, fetchMostPlayed, getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { formatRelativeTime } from '../lib/formatTime'
import TrackRow from '../components/TrackRow'
import TrackContextMenu from '../components/TrackContextMenu'
import EmptyState from '../components/EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

type Tab = 'recent' | 'most-played'

function createTrack(item: BaseItemDto, serverUrl: string, albumName?: string): Track {
  return {
    id: item.Id!,
    name: item.Name ?? 'Unknown',
    albumId: item.AlbumId ?? '',
    albumName: albumName ?? item.Album ?? '',
    artistName: item.ArtistItems?.[0]?.Name ?? item.AlbumArtist ?? 'Unknown Artist',
    artistId: item.ArtistItems?.[0]?.Id,
    duration: (item.RunTimeTicks ?? 0) / 10000000,
    imageUrl: item.AlbumId ? getImageUrl(serverUrl, item.AlbumId, item.AlbumPrimaryImageTag) : undefined,
  }
}

export default function History() {
  const { api, userId, serverUrl } = useAuthStore()
  const { setTrack } = usePlayerStore()
  const [tab, setTab] = useState<Tab>('recent')
  const [recentTracks, setRecentTracks] = useState<(Track & { lastPlayed?: string })[]>([])
  const [mostPlayedTracks, setMostPlayedTracks] = useState<(Track & { playCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ track: Track; position: { x: number; y: number } } | null>(null)

  useEffect(() => {
    if (!api || !userId || !serverUrl) return
    loadHistory()
  }, [api, userId, serverUrl])

  async function loadHistory() {
    if (!api || !userId || !serverUrl) return
    setLoading(true)
    setError(null)
    
    try {
      const [recentRes, mostPlayedRes] = await Promise.all([
        fetchRecentlyPlayed(api, userId),
        fetchMostPlayed(api, userId)
      ])

      // Process recent tracks
      const recentItems = recentRes.Items ?? []
      const recentTracksWithData = recentItems.map(item => {
        const track = createTrack(item, serverUrl)
        const lastPlayed = item.UserData?.LastPlayedDate
        return {
          ...track,
          lastPlayed: lastPlayed || undefined
        }
      }).filter(track => track.lastPlayed) // Only include tracks with play dates

      // Process most played tracks
      const mostPlayedItems = mostPlayedRes.Items ?? []
      const mostPlayedTracksWithData = mostPlayedItems.map(item => {
        const track = createTrack(item, serverUrl)
        const playCount = item.UserData?.PlayCount ?? 0
        return {
          ...track,
          playCount: playCount
        }
      }).filter(track => track.playCount && track.playCount > 0) // Only include tracks with play counts

      setRecentTracks(recentTracksWithData)
      setMostPlayedTracks(mostPlayedTracksWithData)
    } catch (e) {
      console.error('Failed to load history', e)
      setError('Failed to load listening history')
    } finally {
      setLoading(false)
    }
  }

  // Pull to refresh setup
  const containerRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const { 
    containerRef: pullContainerRef, 
    touchHandlers, 
    isRefreshing: isPullRefreshing, 
    isPulling, 
    shouldTrigger, 
    progress 
  } = usePullToRefresh({
    onRefresh: loadHistory,
    disabled: !isTouchDevice
  })

  function handleTrackContextMenu(track: Track, e: React.MouseEvent) {
    e.preventDefault()
    setContextMenu({ track, position: { x: e.clientX, y: e.clientY } })
  }

  function handleTrackPlay(track: Track, allTracks: Track[], index: number) {
    setTrack(track, allTracks, index)
  }

  const currentTracks = tab === 'recent' ? recentTracks : mostPlayedTracks
  const hasContent = currentTracks.length > 0

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-48 md:pb-28 px-4 md:px-8 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 skeleton rounded" />
          <div className="h-8 skeleton rounded w-32" />
        </div>
        <div className="flex gap-1 mb-8">
          <div className="h-10 skeleton rounded-full w-24" />
          <div className="h-10 skeleton rounded-full w-32" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 h-[52px]">
              <div className="w-8 skeleton rounded h-4" />
              <div className="w-10 h-10 skeleton rounded-lg" />
              <div className="flex-1">
                <div className="h-4 skeleton rounded w-2/3 mb-2" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
              <div className="w-12 h-3 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={(el) => {
        containerRef.current = el
        pullContainerRef(el)
      }}
      className="h-full overflow-y-auto pb-48 md:pb-28 relative"
      {...touchHandlers}
    >
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator
        isVisible={isPulling}
        isRefreshing={isPullRefreshing}
        shouldTrigger={shouldTrigger}
        progress={progress}
      />
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 md:pt-8 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 text-neon-cyan">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-[-0.02em]">History</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab('recent')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === 'recent'
                ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                : 'bg-surface text-text-muted hover:text-text-primary border border-white/10'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setTab('most-played')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === 'most-played'
                ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
                : 'bg-surface text-text-muted hover:text-text-primary border border-white/10'
            }`}
          >
            Most Played
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8">
        {error ? (
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
              onClick: () => loadHistory()
            }}
          />
        ) : !hasContent ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            }
            title={tab === 'recent' ? "No recent plays" : "No play count data"}
            subtitle={tab === 'recent' 
              ? "Start listening to build your history"
              : "Your server doesn't track play counts or you haven't played any tracks yet"
            }
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-px"
            >
              {tab === 'recent' ? (
                /* Recent tracks with timestamps */
                recentTracks.map((track, index) => (
                  <div key={`${track.id}-${track.lastPlayed}`} className="flex items-center">
                    <div className="flex-1">
                      <TrackRow
                        track={track}
                        index={index}
                        allTracks={recentTracks}
                        showIndex={false}
                        showArt={true}
                        onPlay={() => handleTrackPlay(track, recentTracks, index)}
                        onContextMenu={(e) => handleTrackContextMenu(track, e)}
                      />
                    </div>
                    <div className="px-4 text-xs text-text-muted font-mono shrink-0 w-20 text-right">
                      {track.lastPlayed ? formatRelativeTime(track.lastPlayed) : ''}
                    </div>
                  </div>
                ))
              ) : (
                /* Most played tracks with play count badges */
                mostPlayedTracks.map((track, index) => (
                  <div key={`${track.id}-${track.playCount}`} className="flex items-center">
                    <div className="flex-1">
                      <TrackRow
                        track={track}
                        index={index}
                        allTracks={mostPlayedTracks}
                        showIndex={false}
                        showArt={true}
                        onPlay={() => handleTrackPlay(track, mostPlayedTracks, index)}
                        onContextMenu={(e) => handleTrackContextMenu(track, e)}
                      />
                    </div>
                    <div className="px-4 shrink-0">
                      <div className="bg-neon-cyan/20 text-neon-cyan text-xs font-bold px-2 py-1 rounded-full min-w-[40px] text-center">
                        {track.playCount}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Context Menu */}
      <TrackContextMenu
        track={contextMenu?.track || null}
        position={contextMenu?.position || null}
        onClose={() => setContextMenu(null)}
      />
    </div>
  )
}