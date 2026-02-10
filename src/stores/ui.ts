import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'
type SortOption = 'name-asc' | 'name-desc' | 'artist-asc' | 'artist-desc' | 'year-newest' | 'year-oldest' | 'date-added'
type AudioQuality = 'original' | 'high' | 'medium' | 'low'
type CrossfadeMode = 'off' | 'gapless' | 'crossfade'

interface UIState {
  viewMode: ViewMode
  sortOption: SortOption
  libraryFilter: string
  audioQuality: AudioQuality
  crossfadeMode: CrossfadeMode
  crossfadeDuration: number // seconds (1-12)

  setViewMode: (mode: ViewMode) => void
  setSortOption: (option: SortOption) => void
  setLibraryFilter: (filter: string) => void
  setAudioQuality: (quality: AudioQuality) => void
  setCrossfadeMode: (mode: CrossfadeMode) => void
  setCrossfadeDuration: (seconds: number) => void
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

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortOption: (option) => set({ sortOption: option }),
      setLibraryFilter: (filter) => set({ libraryFilter: filter }),
      setAudioQuality: (quality) => set({ audioQuality: quality }),
      setCrossfadeMode: (mode) => set({ crossfadeMode: mode }),
      setCrossfadeDuration: (seconds) => set({ crossfadeDuration: seconds }),
    }),
    {
      name: 'jellyamp-ui',
    }
  )
)

export type { ViewMode, SortOption, AudioQuality, CrossfadeMode }
