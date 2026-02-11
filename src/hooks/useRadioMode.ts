import { useEffect, useRef } from 'react'
import { usePlayerStore, type Track } from '../stores/player'
import { useAuthStore } from '../stores/auth'
import { getInstantMix, getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'

function mapToTrack(item: BaseItemDto, serverUrl: string): Track {
  const imageTag = item.ImageTags?.Primary ?? item.AlbumPrimaryImageTag
  const imageId = item.ImageTags?.Primary ? item.Id! : item.AlbumId ?? item.Id!
  return {
    id: item.Id!,
    name: item.Name ?? 'Unknown',
    indexNumber: item.IndexNumber ?? undefined,
    albumId: item.AlbumId ?? undefined,
    albumName: item.Album ?? '',
    artistName: item.AlbumArtist ?? item.Artists?.[0] ?? '',
    artistId: item.AlbumArtists?.[0]?.Id ?? undefined,
    duration: (item.RunTimeTicks ?? 0) / 10_000_000,
    imageUrl: imageTag ? getImageUrl(serverUrl, imageId, imageTag) : undefined,
    isFavorite: item.UserData?.IsFavorite ?? false,
    normalizationGain: item.NormalizationGain ?? undefined,
  }
}

/**
 * Watches queue position and auto-fetches more tracks via InstantMix
 * when radio mode is on and the queue is running low.
 */
export function useRadioMode() {
  const fetchingRef = useRef(false)

  const radioMode = usePlayerStore(s => s.radioMode)
  const queue = usePlayerStore(s => s.queue)
  const queueIndex = usePlayerStore(s => s.queueIndex)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const addToQueue = usePlayerStore(s => s.addToQueue)

  const { serverUrl, accessToken, userId } = useAuthStore()

  useEffect(() => {
    if (!radioMode || !serverUrl || !accessToken || !userId || !currentTrack) return
    if (fetchingRef.current) return

    const remaining = queue.length - queueIndex - 1
    if (remaining > 2) return // still have enough tracks

    fetchingRef.current = true
    const seedId = currentTrack.id

    getInstantMix(serverUrl, seedId, accessToken, userId, 20)
      .then(items => {
        const existingIds = new Set(queue.map(t => t.id))
        const newTracks = items
          .filter(item => item.Id && !existingIds.has(item.Id))
          .map(item => mapToTrack(item, serverUrl))

        if (newTracks.length > 0) {
          addToQueue(newTracks)
        }
      })
      .catch(err => console.error('[Radio] InstantMix failed:', err))
      .finally(() => { fetchingRef.current = false })
  }, [radioMode, queueIndex, queue.length, currentTrack?.id, serverUrl, accessToken, userId, addToQueue, queue])
}
