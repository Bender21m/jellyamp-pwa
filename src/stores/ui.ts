import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'
type GridDensity = 'normal' | 'compact' | 'dense'
type SortOption = 'name-asc' | 'name-desc' | 'artist-asc' | 'artist-desc' | 'year-newest' | 'year-oldest' | 'date-added'
type AudioQuality = 'original' | 'high' | 'medium' | 'low'
type CrossfadeMode = 'off' | 'gapless' | 'crossfade'

interface ScrobbleSettings {
  enabled: boolean
  lastfm: {
    apiKey: string
    apiSecret: string
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
  gridDensity: GridDensity
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
  volumeNormalization: boolean // Volume normalization on/off

  setViewMode: (mode: ViewMode) => void
  setGridDensity: (density: GridDensity) => void
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
  setVolumeNormalization: (enabled: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      gridDensity: 'normal',
      sortOption: 'name-asc',
      libraryFilter: 'Artists',
      audioQuality: 'original',
      crossfadeMode: 'gapless',
      crossfadeDuration: 3,
      scrobbleSettings: {
        enabled: false,
        lastfm: {
          apiKey: '',
          apiSecret: '',
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
      volumeNormalization: false, // Disabled by default

      setViewMode: (mode) => set({ viewMode: mode }),
      setGridDensity: (density) => set({ gridDensity: density }),
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
      setVolumeNormalization: (enabled) => set({ volumeNormalization: enabled }),
    }),
    {
      name: 'jellyamp-ui',
    }
  )
)

export type { ViewMode, GridDensity, SortOption, AudioQuality, CrossfadeMode, ScrobbleSettings }
