import { create } from 'zustand'

export interface Track {
  id: string
  name: string
  albumId?: string
  albumName?: string
  artistName?: string
  duration: number // ticks
  imageUrl?: string
}

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'off' | 'one' | 'all'
  audio: HTMLAudioElement | null

  setTrack: (track: Track, queue?: Track[], index?: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  addToQueue: (tracks: Track[]) => void
  clearQueue: () => void
  setCurrentTime: (time: number) => void
  setDuration: (time: number) => void
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: parseFloat(localStorage.getItem('jellyamp-volume') ?? '0.8'),
  shuffle: false,
  repeat: 'off',
  audio: null,

  setTrack: (track, queue, index) => {
    const state = get()
    if (state.audio) {
      state.audio.pause()
      state.audio.src = ''
    }
    set({
      currentTrack: track,
      queue: queue ?? [track],
      queueIndex: index ?? 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    })
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, repeat, shuffle } = get()
    if (queue.length === 0) return

    let nextIndex: number
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else if (repeat === 'one') {
      nextIndex = queueIndex
    } else {
      nextIndex = queueIndex + 1
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0
        else return
      }
    }

    const track = queue[nextIndex]
    if (track) {
      set({ currentTrack: track, queueIndex: nextIndex, currentTime: 0, duration: 0 })
    }
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get()
    if (currentTime > 3) {
      set({ currentTime: 0 })
      return
    }
    const prevIndex = queueIndex - 1
    if (prevIndex >= 0 && queue[prevIndex]) {
      set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, currentTime: 0, duration: 0 })
    }
  },

  seek: (time) => set({ currentTime: time }),
  setVolume: (vol) => {
    localStorage.setItem('jellyamp-volume', vol.toString())
    set({ volume: vol })
  },
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
  addToQueue: (tracks) => set((s) => ({ queue: [...s.queue, ...tracks] })),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (time) => set({ duration: time }),
}))
