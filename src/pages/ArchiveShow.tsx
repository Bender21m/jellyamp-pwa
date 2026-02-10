import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getShowMetadata, getShowTracks, searchShows, groupShowsByDate } from '../lib/archive'
import type { ShowMetadata, ArchiveTrack, ArchiveShow } from '../lib/archive'
import { usePlayerStore } from '../stores/player'
import { useArchiveStore } from '../stores/archive'
import ArchiveSourceBadge from '../components/ArchiveSourceBadge'
import { StarRating, formatDate } from '../components/ArchiveShowCard'
import EmptyState from '../components/EmptyState'

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTotalDuration(seconds: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Parse set number from track filename. Returns 0 if not detected. */
function getSetNumber(trackId: string): number {
  // trackId is `identifier/filename` — grab filename part
  const filename = trackId.split('/').pop() ?? ''
  const match = filename.match(/s(\d+)t\d+/i)
  return match ? parseInt(match[1], 10) : 0
}

function getSetLabel(setNum: number): string {
  if (setNum >= 3) return 'Encore'
  return `Set ${setNum}`
}

export default function ArchiveShow() {
  const { id } = useParams<{ id: string }>()
  const identifier = decodeURIComponent(id ?? '')
  const navigate = useNavigate()
  const setTrack = usePlayerStore((s) => s.setTrack)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const { isFavoriteShow, toggleFavoriteShow } = useArchiveStore()

  const [metadata, setMetadata] = useState<ShowMetadata | null>(null)
  const [tracks, setTracks] = useState<ArchiveTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<ArchiveShow[]>([])
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [showSourceInfo, setShowSourceInfo] = useState(false)

  const isFav = isFavoriteShow(identifier)

  useEffect(() => {
    if (!identifier) return
    loadShow()
  }, [identifier])

  async function loadShow() {
    setLoading(true)
    setError(null)
    try {
      const [meta, trks] = await Promise.all([
        getShowMetadata(identifier),
        getShowTracks(identifier),
      ])
      setMetadata(meta)
      setTracks(trks)

      // Load alternatives (other recordings of same date)
      if (meta.creator && meta.date) {
        try {
          const res = await searchShows(meta.creator, { rows: 200 })
          const grouped = groupShowsByDate(res.shows)
          const dateShows = grouped.get(meta.date) ?? []
          setAlternatives(dateShows.filter((s) => s.identifier !== identifier))
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Failed to load show', e)
      setError('Failed to load show. Please try again.')
    }
    setLoading(false)
  }

  function playAll() {
    if (tracks.length === 0) return
    setTrack(tracks[0], tracks, 0)
  }

  function playFrom(index: number) {
    if (index < 0 || index >= tracks.length) return
    setTrack(tracks[index], tracks, index)
  }

  // Compute total duration
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)

  // Check if source info is available
  const hasSourceInfo = metadata && (
    metadata.source || metadata.taper || metadata.notes || metadata.description
  )

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-48 md:pb-28 px-4 md:px-8 pt-6">
        <div className="mb-6">
          <div className="h-4 skeleton rounded w-16 mb-4" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-[280px] aspect-square skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-8 skeleton rounded w-2/3" />
              <div className="h-4 skeleton rounded w-1/3" />
              <div className="h-4 skeleton rounded w-1/2" />
              <div className="flex gap-3 mt-4">
                <div className="h-11 skeleton rounded-full w-32" />
                <div className="h-11 skeleton rounded-full w-11" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-3">
              <div className="w-6 h-4 skeleton rounded" />
              <div className="flex-1 h-4 skeleton rounded w-1/2" />
              <div className="w-10 h-4 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 md:px-8 pt-5 shrink-0">
          <button onClick={() => navigate(-1)} className="mb-4 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>}
            title="Something went wrong"
            subtitle={error ?? 'Show not found.'}
            action={{ label: 'Try again', onClick: loadShow }}
          />
        </div>
      </div>
    )
  }

  // Pre-compute set numbers for segue/set-break logic
  const trackSets = tracks.map((t) => getSetNumber(t.id))
  const trackSegues = tracks.map((t) => t.name.endsWith('>'))

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="mb-4 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          Back
        </button>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-[280px] aspect-square rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10 bg-card"
          >
            <img
              src={metadata.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] leading-tight">
              {formatDate(metadata.date)}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {metadata.venue && (
                <p className="text-sm text-text-secondary">{metadata.venue}</p>
              )}
              {totalDuration > 0 && (
                <>
                  {metadata.venue && <span className="text-text-muted text-sm">·</span>}
                  <span className="text-sm text-text-muted font-mono">{formatTotalDuration(totalDuration)}</span>
                </>
              )}
            </div>
            <Link
              to={`/archive/artist/${encodeURIComponent(metadata.creator)}`}
              className="text-sm text-neon-cyan hover:underline mt-1 inline-block"
            >
              {metadata.creator}
            </Link>

            {/* Source info */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <ArchiveSourceBadge source={metadata.source} />
              {metadata.rating != null && <StarRating rating={metadata.rating} />}
              {metadata.reviewCount != null && metadata.reviewCount > 0 && (
                <span className="text-xs text-text-muted font-mono">{metadata.reviewCount} review{metadata.reviewCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={playAll}
                disabled={tracks.length === 0}
                className="h-11 inline-flex items-center gap-2 rounded-full bg-gradient-primary text-deep-black font-bold text-sm whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ paddingLeft: '1.75rem', paddingRight: '1.75rem' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                <span>Play All</span>
              </motion.button>
              <button
                onClick={() => toggleFavoriteShow(identifier)}
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

        {/* Source Info expandable */}
        {hasSourceInfo && (
          <div className="mt-4">
            <button
              onClick={() => setShowSourceInfo(!showSourceInfo)}
              className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-4 h-4 transition-transform ${showSourceInfo ? 'rotate-90' : ''}`}
                fill="currentColor"
              >
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
              Source Info
            </button>
            {showSourceInfo && (
              <div className="mt-2 bg-surface rounded-lg p-3 ring-1 ring-white/5 space-y-1.5">
                {metadata.source && (
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary font-medium">Source:</span> {metadata.source}
                  </p>
                )}
                {metadata.taper && (
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary font-medium">Taper:</span> {metadata.taper}
                  </p>
                )}
                {metadata.notes && (
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary font-medium">Notes:</span> {metadata.notes}
                  </p>
                )}
                {metadata.description && (
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary font-medium">Description:</span> {metadata.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setlist */}
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Setlist</h2>
        {tracks.length === 0 ? (
          <p className="text-sm text-text-muted">No playable tracks found for this recording.</p>
        ) : (
          <div>
            {tracks.map((track, i) => {
              const isCurrentTrack = currentTrack?.id === track.id
              const hasSegue = trackSegues[i]
              const displayName = hasSegue ? track.name.slice(0, -1).trimEnd() : track.name
              const currentSet = trackSets[i]
              const prevSet = i > 0 ? trackSets[i - 1] : 0
              const showSetBreak = currentSet > 0 && prevSet > 0 && currentSet !== prevSet
              // Previous track segues into this one — show connecting line on top
              const prevSegue = i > 0 && trackSegues[i - 1]

              return (
                <div key={track.id}>
                  {/* Set separator */}
                  {showSetBreak && (
                    <div className="flex items-center gap-3 py-3 px-3 md:px-4">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
                        {getSetLabel(currentSet)}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                  )}
                  {/* First set label if sets are detected and this is the first track */}
                  {i === 0 && currentSet > 0 && (
                    <div className="flex items-center gap-3 py-3 px-3 md:px-4">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
                        {getSetLabel(currentSet)}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                  )}
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    onClick={() => playFrom(i)}
                    className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors group text-left ${
                      isCurrentTrack
                        ? 'bg-neon-cyan/[0.08]'
                        : 'hover:bg-white/[0.03] odd:bg-white/[0.015]'
                    }`}
                  >
                    {/* Track number column with segue line */}
                    <span className={`w-6 text-right text-xs font-mono shrink-0 relative ${
                      isCurrentTrack ? 'text-neon-cyan' : 'text-text-muted'
                    }`}>
                      {/* Segue connecting line from previous track */}
                      {prevSegue && (
                        <span className="absolute left-1/2 -top-3 w-0 h-3 border-l-2 border-neon-cyan/30" />
                      )}
                      {isCurrentTrack && isPlaying ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-neon-cyan ml-auto" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1"><animate attributeName="height" values="16;8;16" dur="0.8s" repeatCount="indefinite" /><animate attributeName="y" values="4;8;4" dur="0.8s" repeatCount="indefinite" /></rect>
                          <rect x="14" y="4" width="4" height="16" rx="1"><animate attributeName="height" values="8;16;8" dur="0.8s" repeatCount="indefinite" /><animate attributeName="y" values="8;4;8" dur="0.8s" repeatCount="indefinite" /></rect>
                        </svg>
                      ) : (
                        i + 1
                      )}
                      {/* Segue connecting line to next track */}
                      {hasSegue && (
                        <span className="absolute left-1/2 -bottom-3 w-0 h-3 border-l-2 border-neon-cyan/30" />
                      )}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate block ${
                        isCurrentTrack ? 'text-neon-cyan font-semibold' : 'text-text-primary group-hover:text-neon-cyan transition-colors'
                      }`}>
                        {displayName}
                      </span>
                    </div>

                    {/* Duration */}
                    <span className="text-xs text-text-muted font-mono shrink-0">
                      {formatDuration(track.duration)}
                    </span>
                  </motion.button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Other recordings */}
      {alternatives.length > 0 && (
        <div className="px-4 md:px-8 pt-6 md:pt-8">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors mb-3"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 transition-transform ${showAlternatives ? 'rotate-90' : ''}`}
              fill="currentColor"
            >
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            Other Recordings ({alternatives.length})
          </button>
          {showAlternatives && (
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <button
                  key={alt.identifier}
                  onClick={() => navigate(`/archive/show/${encodeURIComponent(alt.identifier)}`)}
                  className="w-full text-left bg-surface hover:bg-surface-hover rounded-lg p-3 transition-all ring-1 ring-white/5 hover:ring-neon-cyan/20 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{alt.title}</p>
                    {alt.venue && <p className="text-xs text-text-muted truncate">{alt.venue}</p>}
                  </div>
                  <ArchiveSourceBadge source={alt.source} />
                  {alt.rating != null && <StarRating rating={alt.rating} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
