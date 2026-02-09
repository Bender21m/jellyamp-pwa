import { create } from 'zustand'

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
  showNowPlaying: boolean
  showQueue: boolean

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
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: parseFloat(localStorage.getItem('jellyamp-volume') ?? '0.8'),
  muted: false,
  shuffle: false,
  repeat: 'off',
  showNowPlaying: false,
  showQueue: false,

  setTrack: (track, queue, index) => {
    set({
      currentTrack: track,
      queue: queue ?? [track],
      queueIndex: index ?? 0,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration,
    })
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
    if (track) set({ currentTrack: track, queueIndex: nextIndex, currentTime: 0, duration: track.duration, isPlaying: true })
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get()
    if (currentTime > 3) return set({ currentTime: 0 })
    const prevIndex = queueIndex - 1
    if (prevIndex >= 0 && queue[prevIndex]) {
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, currentTime: 0, duration: queue[prevIndex].duration, isPlaying: true })
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

  addToQueue: (tracks) => {
    const { queue, currentTrack } = get()
    const newQueue = [...queue, ...tracks]
    if (!currentTrack && tracks.length > 0) {
      set({ queue: newQueue, currentTrack: tracks[0], queueIndex: queue.length, isPlaying: true, currentTime: 0, duration: tracks[0].duration })
    } else {
      set({ queue: newQueue })
    }
  },

  playNext: (track) => {
    const { queue, queueIndex } = get()
    const newQueue = [...queue]
    newQueue.splice(queueIndex + 1, 0, track)
    set({ queue: newQueue })
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get()
    if (index < 0 || index >= queue.length) return
    const newQueue = [...queue]
    newQueue.splice(index, 1)
    if (index === queueIndex) {
      if (newQueue.length === 0) {
        set({ queue: [], currentTrack: null, queueIndex: -1, isPlaying: false })
      } else {
        const ni = Math.min(index, newQueue.length - 1)
        set({ queue: newQueue, currentTrack: newQueue[ni], queueIndex: ni, currentTime: 0 })
      }
    } else {
      set({ queue: newQueue, queueIndex: index < queueIndex ? queueIndex - 1 : queueIndex })
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
  },

  jumpToTrack: (index) => {
    const { queue } = get()
    if (index >= 0 && index < queue.length) {
      set({ currentTrack: queue[index], queueIndex: index, currentTime: 0, duration: queue[index].duration, isPlaying: true })
    }
  },

  clearQueue: () => set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false, currentTime: 0, duration: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (time) => set({ duration: time }),
  setShowNowPlaying: (show) => set({ showNowPlaying: show }),
  setShowQueue: (show) => set({ showQueue: show }),
}))
