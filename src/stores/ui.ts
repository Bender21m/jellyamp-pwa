import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'
type SortOption = 'name-asc' | 'name-desc' | 'artist-asc' | 'artist-desc' | 'year-newest' | 'year-oldest' | 'date-added'
type AudioQuality = 'original' | 'high' | 'medium' | 'low'
type CrossfadeMode = 'off' | 'gapless' | 'crossfade'

interface ScrobbleSettings {
  enabled: boolean
  lastfm: {
    apiKey: string
    sessionKey: string
    username: string
  }
  listenbrainz: {
    token: string
    username: string
  }
}

interface UIState {
  viewMode: ViewMode
  sortOption: SortOption
  libraryFilter: string
  audioQuality: AudioQuality
  crossfadeMode: CrossfadeMode
  crossfadeDuration: number // seconds (1-12)
  scrobbleSettings: ScrobbleSettings
  eqGains: number[] // 5-band EQ gains (-12 to +12dB)
  eqEnabled: boolean
  showMiniPlayer: boolean
  playbackSpeed: number // 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

  setViewMode: (mode: ViewMode) => void
  setSortOption: (option: SortOption) => void
  setLibraryFilter: (filter: string) => void
  setAudioQuality: (quality: AudioQuality) => void
  setCrossfadeMode: (mode: CrossfadeMode) => void
  setCrossfadeDuration: (seconds: number) => void
  updateScrobbleSettings: (settings: Partial<ScrobbleSettings>) => void
  setEQGains: (gains: number[]) => void
  setEQEnabled: (enabled: boolean) => void
  setShowMiniPlayer: (show: boolean) => void
  setPlaybackSpeed: (speed: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sortOption: 'name-asc',
      libraryFilter: 'Artists',
      audioQuality: 'original',
      crossfadeMode: 'gapless',
      crossfadeDuration: 3,
      scrobbleSettings: {
        enabled: false,
        lastfm: {
          apiKey: '',
          sessionKey: '',
          username: ''
        },
        listenbrainz: {
          token: '',
          username: ''
        }
      },
      eqGains: [0, 0, 0, 0, 0], // Flat EQ by default
      eqEnabled: false,
      showMiniPlayer: false,
      playbackSpeed: 1,

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortOption: (option) => set({ sortOption: option }),
      setLibraryFilter: (filter) => set({ libraryFilter: filter }),
      setAudioQuality: (quality) => set({ audioQuality: quality }),
      setCrossfadeMode: (mode) => set({ crossfadeMode: mode }),
      setCrossfadeDuration: (seconds) => set({ crossfadeDuration: seconds }),
      updateScrobbleSettings: (newSettings) => set((state) => ({
        scrobbleSettings: { ...state.scrobbleSettings, ...newSettings }
      })),
      setEQGains: (gains) => set({ eqGains: gains }),
      setEQEnabled: (enabled) => set({ eqEnabled: enabled }),
      setShowMiniPlayer: (show) => set({ showMiniPlayer: show }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    }),
    {
      name: 'jellyamp-ui',
    }
  )
)

export type { ViewMode, SortOption, AudioQuality, CrossfadeMode, ScrobbleSettings }
