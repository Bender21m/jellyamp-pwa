import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { fetchAlbums, fetchArtistById, fetchSimilarArtists } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { useAlbumColors } from '../hooks/useAlbumColors'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useArtistImage } from '../hooks/useArtistImage'
import { getImageUrl } from '../lib/jellyfin'
import EmptyState from '../components/EmptyState'
import ArtistHeader from './ArtistHeader'
import ArtistAlbumGrid from './ArtistAlbumGrid'
import SimilarArtists from './SimilarArtists'

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { api, userId, serverUrl } = useAuthStore()
  const [artist, setArtist] = useState<BaseItemDto | null>(null)
  const [albums, setAlbums] = useState<BaseItemDto[]>([])
  const [totalAlbumCount, setTotalAlbumCount] = useState(0)
  const [similarArtists, setSimilarArtists] = useState<BaseItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFav, setIsFav] = useState(false)

  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollRestore(scrollContainerRef)

  const loadArtist = useCallback(async () => {
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
  }, [api, userId, id, serverUrl])

  useEffect(() => {
    if (!api || !userId || !id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadArtist()
  }, [id, api, userId, loadArtist])

  const hasMore = albums.length < totalAlbumCount

  const loadMore = useCallback(async () => {
    if (!api || !userId || !id || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetchAlbums(api, userId, { artistIds: [id], limit: 20, startIndex: albums.length })
      setAlbums(prev => [...prev, ...(res.Items ?? [])])
    } catch (e) {
      console.error('Failed to load more albums', e)
    }
    setLoadingMore(false)
  }, [api, userId, id, loadingMore, hasMore, albums.length])

  // Extract colors from artist image or first album  
  const jellyfinArtistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 400)
    : null
  const wikiArtistImage = useArtistImage(artist?.Name ?? '', !!jellyfinArtistImage)
  const artistImage = jellyfinArtistImage || wikiArtistImage

  const backdropUrl = albums.length > 0 && serverUrl
    ? getImageUrl(serverUrl, albums[0].Id!, albums[0].ImageTags?.Primary, 600)
    : null

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
      <ArtistHeader 
        artist={artist} 
        albums={albums}
        artistColors={artistColors}
        isFav={isFav}
        setIsFav={setIsFav}
      />
      
      <ArtistAlbumGrid 
        artist={artist}
        albums={albums}
        serverUrl={serverUrl}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
      
      <SimilarArtists 
        similarArtists={similarArtists}
        serverUrl={serverUrl}
      />
    </div>
  )
}
