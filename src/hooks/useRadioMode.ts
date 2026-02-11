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
  const lastFailureRef = useRef<number>(0)
  const retryCountRef = useRef<number>(0)

  const radioMode = usePlayerStore(s => s.radioMode)
  const queueLength = usePlayerStore(s => s.queue.length)
  const queueIndex = usePlayerStore(s => s.queueIndex)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const addToQueue = usePlayerStore(s => s.addToQueue)

  const { serverUrl, accessToken, userId } = useAuthStore()

  useEffect(() => {
    if (!radioMode || !serverUrl || !accessToken || !userId || !currentTrack) return
    if (fetchingRef.current) return

    const remaining = queueLength - queueIndex - 1
    if (remaining > 2) return // still have enough tracks

    // Cooldown period: don't retry for 30 seconds after a failure
    const now = Date.now()
    const timeSinceFailure = now - lastFailureRef.current
    if (timeSinceFailure < 30000 && retryCountRef.current >= 3) return

    // Reset retry count if enough time has passed
    if (timeSinceFailure > 60000) {
      retryCountRef.current = 0
    }

    fetchingRef.current = true
    const seedId = currentTrack.id

    getInstantMix(serverUrl, seedId, accessToken, userId, 20)
      .then(items => {
        // Get fresh queue data to avoid stale closure
        const currentQueue = usePlayerStore.getState().queue
        const existingIds = new Set(currentQueue.map(t => t.id))
        const newTracks = items
          .filter(item => item.Id && !existingIds.has(item.Id))
          .map(item => mapToTrack(item, serverUrl))

        if (newTracks.length > 0) {
          addToQueue(newTracks)
          retryCountRef.current = 0 // Reset on success
        } else {
          // No new tracks found (all duplicates), increment retry count
          retryCountRef.current++
          lastFailureRef.current = now
        }
      })
      .catch(err => {
        console.error('[Radio] InstantMix failed:', err)
        retryCountRef.current++
        lastFailureRef.current = now
      })
      .finally(() => { 
        fetchingRef.current = false 
      })
  }, [radioMode, queueIndex, queueLength, currentTrack?.id, serverUrl, accessToken, userId, addToQueue])
}
