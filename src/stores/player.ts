import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const QUEUE_STORAGE_KEY = 'jellyamp-queue-v2'
const MAX_QUEUE_PERSISTENCE = 200

// Convert full track to lightweight representation
function trackToLightweight(track: Track): LightweightTrack {
  return {
    id: track.id,
    name: track.name,
    artistName: track.artistName,
    albumId: track.albumId,
    duration: track.duration,
  }
}

// Convert lightweight track to basic full track (missing imageUrl etc.)
function lightweightToTrack(lightweight: LightweightTrack): Track {
  return {
    id: lightweight.id,
    name: lightweight.name,
    artistName: lightweight.artistName,
    albumId: lightweight.albumId,
    duration: lightweight.duration,
    // imageUrl will be filled in lazily when needed
    imageUrl: undefined,
  }
}

// Save queue to localStorage
function saveQueueToStorage(queue: Track[], queueIndex: number) {
  try {
    const lightweightQueue = queue.slice(0, MAX_QUEUE_PERSISTENCE).map(trackToLightweight)
    const queueData = {
      queue: lightweightQueue,
      queueIndex: Math.min(queueIndex, lightweightQueue.length - 1),
      timestamp: Date.now(),
    }
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueData))
  } catch (error) {
    console.error('[Player Store] Failed to save queue:', error)
  }
}

// Load queue from localStorage
function loadQueueFromStorage(): { queue: Track[]; queueIndex: number } | null {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!stored) return null
    
    const queueData = JSON.parse(stored)
    const { queue, queueIndex, timestamp } = queueData
    
    // Ignore old queue data (older than 7 days)
    if (!timestamp || Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(QUEUE_STORAGE_KEY)
      return null
    }
    
    if (Array.isArray(queue) && typeof queueIndex === 'number') {
      return {
        queue: queue.map(lightweightToTrack),
        queueIndex: Math.max(0, Math.min(queueIndex, queue.length - 1)),
      }
    }
  } catch (error) {
    console.error('[Player Store] Failed to load queue:', error)
    localStorage.removeItem(QUEUE_STORAGE_KEY)
  }
  return null
}

// Clear queue from localStorage
function clearQueueFromStorage() {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY)
  } catch (error) {
    console.error('[Player Store] Failed to clear queue:', error)
  }
}

export interface Track {
  id: string
  name: string
  indexNumber?: number
  albumId?: string
  albumName?: string
  artistName?: string
  artistId?: string
  duration: number // seconds
  imageUrl?: string
  isFavorite?: boolean
  playlistItemId?: string // for playlist entry removal
  normalizationGain?: number // ReplayGain/LUFS normalization gain in dB
  streamUrl?: string // direct audio URL (bypasses Jellyfin, used for Archive streams)
}

// Lightweight queue representation for persistence
interface LightweightTrack {
  id: string
  name: string
  artistName?: string
  albumId?: string
  duration: number
}

type RepeatMode = 'off' | 'one' | 'all'

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  playbackRate: number // 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
  showNowPlaying: boolean
  showQueue: boolean
  queueOpenedFromNowPlaying: boolean // Track if queue was opened from Now Playing
  radioMode: boolean
  radioSeedId: string | null // the item ID used to seed radio mode
  sleepTimer: {
    active: boolean
    endTime: number | null // timestamp when timer should end
    mode: 'time' | 'track' // time-based or end-of-track
    originalVolume: number // to restore volume if timer is cancelled
  }

  setRadioMode: (enabled: boolean, seedId?: string | null) => void
  setTrack: (track: Track, queue?: Track[], index?: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setPlaybackRate: (rate: number) => void
  addToQueue: (tracks: Track[]) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  moveInQueue: (from: number, to: number) => void
  jumpToTrack: (index: number) => void
  clearQueue: () => void
  setCurrentTime: (time: number) => void
  setDuration: (time: number) => void
  setShowNowPlaying: (show: boolean) => void
  setShowQueue: (show: boolean) => void
  setShowQueueFromNowPlaying: (show: boolean) => void // New action to open queue from Now Playing
  setSleepTimer: (minutes: number) => void
  setSleepTimerEndOfTrack: () => void
  clearSleepTimer: () => void
  getSleepTimerRemaining: () => number
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
      // Load queue from storage on initialization
      const savedQueue = loadQueueFromStorage()
      
      return {
        currentTrack: savedQueue?.queue[savedQueue.queueIndex] ?? null,
        queue: savedQueue?.queue ?? [],
        queueIndex: savedQueue?.queueIndex ?? -1,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: parseFloat(localStorage.getItem('jellyamp-volume') ?? '0.8'),
        muted: false,
        shuffle: false,
        repeat: 'off',
        playbackRate: 1.0,
        radioMode: false,
        radioSeedId: null,
        showNowPlaying: false,
        showQueue: false,
        queueOpenedFromNowPlaying: false,
        sleepTimer: {
          active: false,
          endTime: null,
          mode: 'time',
          originalVolume: 0.8,
        },

  setRadioMode: (enabled, seedId) => set({
    radioMode: enabled,
    radioSeedId: seedId ?? (enabled ? get().currentTrack?.id ?? null : null),
  }),

  setTrack: (track, queue, index) => {
    const newQueue = queue ?? [track]
    const newIndex = index ?? 0
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: newIndex,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration,
    })
    saveQueueToStorage(newQueue, newIndex)
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => {
    const { currentTrack, isPlaying } = get()
    if (currentTrack) set({ isPlaying: !isPlaying })
  },

  next: () => {
    const { queue, queueIndex, repeat, shuffle } = get()
    if (queue.length === 0) return
    let nextIndex: number
    if (repeat === 'one') {
      nextIndex = queueIndex
    } else if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = queueIndex + 1
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0
        else return set({ isPlaying: false })
      }
    }
    const track = queue[nextIndex]
    if (track) {
      set({ currentTrack: track, queueIndex: nextIndex, currentTime: 0, duration: track.duration, isPlaying: true })
      saveQueueToStorage(queue, nextIndex)
    }
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get()
    if (currentTime > 3) return set({ currentTime: 0 })
    const prevIndex = queueIndex - 1
    if (prevIndex >= 0 && queue[prevIndex]) {
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, currentTime: 0, duration: queue[prevIndex].duration, isPlaying: true })
      saveQueueToStorage(queue, prevIndex)
    }
  },

  seek: (time) => set({ currentTime: time }),
  setVolume: (vol) => {
    localStorage.setItem('jellyamp-volume', vol.toString())
    set({ volume: vol, muted: vol === 0 })
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
  })),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  addToQueue: (tracks) => {
    const { queue, currentTrack, queueIndex } = get()
    const newQueue = [...queue, ...tracks]
    if (!currentTrack && tracks.length > 0) {
      const newIndex = queue.length
      set({ queue: newQueue, currentTrack: tracks[0], queueIndex: newIndex, isPlaying: true, currentTime: 0, duration: tracks[0].duration })
      saveQueueToStorage(newQueue, newIndex)
    } else {
      set({ queue: newQueue })
      saveQueueToStorage(newQueue, queueIndex)
    }
  },

  playNext: (track) => {
    const { queue, queueIndex } = get()
    const newQueue = [...queue]
    newQueue.splice(queueIndex + 1, 0, track)
    set({ queue: newQueue })
    saveQueueToStorage(newQueue, queueIndex)
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get()
    if (index < 0 || index >= queue.length) return
    const newQueue = [...queue]
    newQueue.splice(index, 1)
    if (index === queueIndex) {
      if (newQueue.length === 0) {
        set({ queue: [], currentTrack: null, queueIndex: -1, isPlaying: false })
        clearQueueFromStorage()
      } else {
        const ni = Math.min(index, newQueue.length - 1)
        set({ queue: newQueue, currentTrack: newQueue[ni], queueIndex: ni, currentTime: 0 })
        saveQueueToStorage(newQueue, ni)
      }
    } else {
      const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex
      set({ queue: newQueue, queueIndex: newIndex })
      saveQueueToStorage(newQueue, newIndex)
    }
  },

  moveInQueue: (from, to) => {
    const { queue, queueIndex } = get()
    const newQueue = [...queue]
    const [item] = newQueue.splice(from, 1)
    newQueue.splice(to, 0, item)
    let newIndex = queueIndex
    if (from === queueIndex) newIndex = to
    else if (from < queueIndex && to >= queueIndex) newIndex--
    else if (from > queueIndex && to <= queueIndex) newIndex++
    set({ queue: newQueue, queueIndex: newIndex })
    saveQueueToStorage(newQueue, newIndex)
  },

  jumpToTrack: (index) => {
    const { queue } = get()
    if (index >= 0 && index < queue.length) {
      set({ currentTrack: queue[index], queueIndex: index, currentTime: 0, duration: queue[index].duration, isPlaying: true })
      saveQueueToStorage(queue, index)
    }
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false, currentTime: 0, duration: 0 })
    clearQueueFromStorage()
  },
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (time) => set({ duration: time }),
  setShowNowPlaying: (show) => set({ showNowPlaying: show }),
  setShowQueue: (show) => {
    const state = get()
    // If closing queue and it was opened from Now Playing, restore Now Playing
    if (!show && state.queueOpenedFromNowPlaying) {
      set({ showQueue: false, queueOpenedFromNowPlaying: false, showNowPlaying: true })
    } else {
      set({ showQueue: show })
      // Reset flag when opening queue from elsewhere
      if (show) set({ queueOpenedFromNowPlaying: false })
    }
  },
  setShowQueueFromNowPlaying: (show) => set({ 
    showQueue: show, 
    showNowPlaying: !show, // Close Now Playing when opening queue
    queueOpenedFromNowPlaying: show // Remember it was opened from Now Playing
  }),

  setSleepTimer: (minutes) => {
    const { volume } = get()
    set({
      sleepTimer: {
        active: true,
        endTime: Date.now() + (minutes * 60 * 1000),
        mode: 'time',
        originalVolume: volume,
      }
    })
  },

  setSleepTimerEndOfTrack: () => {
    const { volume } = get()
    set({
      sleepTimer: {
        active: true,
        endTime: null,
        mode: 'track',
        originalVolume: volume,
      }
    })
  },

  clearSleepTimer: () => set({
    sleepTimer: {
      active: false,
      endTime: null,
      mode: 'time',
      originalVolume: 0.8,
    }
  }),

  getSleepTimerRemaining: () => {
    const { sleepTimer } = get()
    if (!sleepTimer.active || !sleepTimer.endTime) return 0
    return Math.max(0, sleepTimer.endTime - Date.now())
  },
      }
    },
    {
      name: 'jellyamp-player',
      partialize: (state) => ({
        // Exclude queue to prevent localStorage overflow with large queues
        // Only persist current track and playback settings
        currentTrack: state.currentTrack,
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        playbackRate: state.playbackRate,
        radioMode: state.radioMode,
        radioSeedId: state.radioSeedId,
      }),
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.error('[Player Store] Failed to read from localStorage:', error)
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.error('[Player Store] Failed to write to localStorage:', error)
            // Try to clear some space and retry once
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              try {
                localStorage.removeItem(name)
                localStorage.setItem(name, JSON.stringify(value))
              } catch (retryError) {
                console.error('[Player Store] Failed to write even after cleanup:', retryError)
              }
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name)
          } catch (error) {
            console.error('[Player Store] Failed to remove from localStorage:', error)
          }
        },
      },
    }
  )
)
