import type { Track } from '../stores/player'

/**
 * Offline Playback Cache using Cache API
 * Allows caching audio tracks for offline playback
 */

const CACHE_NAME = 'jellyamp-audio-cache'
const CACHE_METADATA_KEY = 'jellyamp-cache-metadata'

interface CacheMetadata {
  [albumId: string]: {
    trackIds: string[]
    cachedAt: number
    totalSize: number
  }
}

interface CacheProgress {
  completed: number
  total: number
  currentTrack: string
  status: 'downloading' | 'completed' | 'error'
}

/**
 * Cache all tracks from an album for offline playback
 */
export async function cacheAlbumTracks(
  tracks: Track[], 
  serverUrl: string,
  albumId: string,
  onProgress?: (progress: CacheProgress) => void
): Promise<void> {
  if (!('caches' in window)) {
    throw new Error('Cache API not supported')
  }

  const cache = await caches.open(CACHE_NAME)
  const metadata = await getCacheMetadata()
  let totalSize = 0
  const cachedTrackIds: string[] = []

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    
    try {
      onProgress?.({
        completed: i,
        total: tracks.length,
        currentTrack: track.name,
        status: 'downloading'
      })

      // Create the audio URL (using original quality for offline caching)
      const audioUrl = `${serverUrl}/Audio/${track.id}/stream?static=true&mediaSourceId=${track.id}`
      
      // Check if already cached
      const cachedResponse = await cache.match(audioUrl)
      if (cachedResponse) {
        cachedTrackIds.push(track.id)
        continue
      }

      // Fetch and cache the audio file
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.statusText}`)
      }

      // Clone response to get size before caching
      const responseClone = response.clone()
      const buffer = await responseClone.arrayBuffer()
      totalSize += buffer.byteLength

      // Cache the response
      await cache.put(audioUrl, response)
      cachedTrackIds.push(track.id)

    } catch (error) {
      console.error(`Failed to cache track ${track.name}:`, error)
      onProgress?.({
        completed: i,
        total: tracks.length,
        currentTrack: track.name,
        status: 'error'
      })
      throw error
    }
  }

  // Update metadata
  metadata[albumId] = {
    trackIds: cachedTrackIds,
    cachedAt: Date.now(),
    totalSize
  }
  await saveCacheMetadata(metadata)

  onProgress?.({
    completed: tracks.length,
    total: tracks.length,
    currentTrack: '',
    status: 'completed'
  })
}

/**
 * Check if a track is cached for offline playback
 */
export async function isTrackCached(trackId: string): Promise<boolean> {
  if (!('caches' in window)) return false
  
  const metadata = await getCacheMetadata()
  
  // Check if track is in any cached album
  for (const albumData of Object.values(metadata)) {
    if (albumData.trackIds.includes(trackId)) {
      return true
    }
  }
  
  return false
}

/**
 * Check if an entire album is cached
 */
export async function isAlbumCached(albumId: string): Promise<boolean> {
  const metadata = await getCacheMetadata()
  return albumId in metadata
}

/**
 * Get cached URL for a track (if available)
 */
export async function getCachedTrackUrl(trackId: string, serverUrl: string): Promise<string | null> {
  if (!('caches' in window)) return null
  
  const cache = await caches.open(CACHE_NAME)
  const audioUrl = `${serverUrl}/Audio/${trackId}/stream?static=true&mediaSourceId=${trackId}`
  
  const cachedResponse = await cache.match(audioUrl)
  if (cachedResponse) {
    return audioUrl // Return the same URL - the cache will serve it
  }
  
  return null
}

/**
 * Remove an album from the cache
 */
export async function removeAlbumFromCache(albumId: string, serverUrl: string): Promise<void> {
  if (!('caches' in window)) return
  
  const cache = await caches.open(CACHE_NAME)
  const metadata = await getCacheMetadata()
  
  const albumData = metadata[albumId]
  if (!albumData) return
  
  // Remove all track responses from cache
  for (const trackId of albumData.trackIds) {
    const audioUrl = `${serverUrl}/Audio/${trackId}/stream?static=true&mediaSourceId=${trackId}`
    await cache.delete(audioUrl)
  }
  
  // Remove from metadata
  delete metadata[albumId]
  await saveCacheMetadata(metadata)
}

/**
 * Get total size of cached audio files
 */
export async function getCacheSize(): Promise<number> {
  const metadata = await getCacheMetadata()
  let totalSize = 0
  
  for (const albumData of Object.values(metadata)) {
    totalSize += albumData.totalSize
  }
  
  return totalSize
}

/**
 * Clear all cached audio files
 */
export async function clearAllCache(): Promise<void> {
  if (!('caches' in window)) return
  
  await caches.delete(CACHE_NAME)
  localStorage.removeItem(CACHE_METADATA_KEY)
}

/**
 * Get list of cached albums
 */
export async function getCachedAlbums(): Promise<string[]> {
  const metadata = await getCacheMetadata()
  return Object.keys(metadata)
}

/**
 * Get cache metadata from localStorage
 */
async function getCacheMetadata(): Promise<CacheMetadata> {
  try {
    const stored = localStorage.getItem(CACHE_METADATA_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save cache metadata to localStorage
 */
async function saveCacheMetadata(metadata: CacheMetadata): Promise<void> {
  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error('Failed to save cache metadata:', error)
  }
}

/**
 * Format cache size for display
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
}

export type { CacheProgress }