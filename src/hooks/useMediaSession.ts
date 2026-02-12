import { useEffect } from 'react'
import type { Track } from '../stores/player'

interface UseMediaSessionOptions {
  track: Track | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (time: number) => void
}

export function useMediaSession(options: UseMediaSessionOptions) {
  const { track, audioRef, onPlay, onPause, onNext, onPrevious, onSeek } = options

  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artistName ?? '',
      album: track.albumName ?? '',
      artwork: track.imageUrl
        ? [{ src: track.imageUrl, sizes: '300x300', type: 'image/jpeg' }]
        : [],
    })
    navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); onPlay() })
    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); onPause() })
    navigator.mediaSession.setActionHandler('previoustrack', onPrevious)
    navigator.mediaSession.setActionHandler('nexttrack', onNext)
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = details.seekTime
        onSeek(details.seekTime)
      }
    })
  }, [track, audioRef, onPlay, onPause, onNext, onPrevious, onSeek])
}
