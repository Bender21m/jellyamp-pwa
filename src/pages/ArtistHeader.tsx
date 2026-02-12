import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore, type Track } from '../stores/player'
import ArtistPlaceholder from '../components/ArtistPlaceholder'
import { useArtistImage } from '../hooks/useArtistImage'
import { fetchArtistTracks, getImageUrl, toggleFavorite, getInstantMix } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import type { AlbumColors } from '../lib/colorExtract'

interface ArtistHeaderProps {
  artist: BaseItemDto
  albums: BaseItemDto[]
  artistColors: AlbumColors | null
  isFav: boolean
  setIsFav: (isFav: boolean) => void
}

export default function ArtistHeader({ artist, albums, artistColors, isFav, setIsFav }: ArtistHeaderProps) {
  const navigate = useNavigate()
  const { api, userId, serverUrl, accessToken } = useAuthStore()
  const setTrack = usePlayerStore(s => s.setTrack)
  const setRadioMode = usePlayerStore(s => s.setRadioMode)

  const jellyfinArtistImage = artist?.ImageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, artist.Id!, artist.ImageTags.Primary, 400)
    : null
  const wikiArtistImage = useArtistImage(artist?.Name ?? '', !!jellyfinArtistImage)
  const artistImage = jellyfinArtistImage || wikiArtistImage

  const backdropUrl = albums.length > 0 && serverUrl
    ? getImageUrl(serverUrl, albums[0].Id!, albums[0].ImageTags?.Primary, 600)
    : null

  async function playAll(shuffle = false) {
    if (!api || !userId || !serverUrl || !artist.Id || albums.length === 0) return
    try {
      // Fetch all tracks for the artist in a single API call instead of sequential album fetches
      const tracksRes = await fetchArtistTracks(api, userId, artist.Id)
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

  return (
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
                  if (!artist.Id || !serverUrl || !accessToken || !userId) return
                  try {
                    const items = await getInstantMix(serverUrl, artist.Id, accessToken, userId, 20)
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
                      setRadioMode(true, artist.Id)
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
                  if (!api || !userId || !artist.Id) return
                  try {
                    await toggleFavorite(api, userId, artist.Id, isFav)
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
  )
}