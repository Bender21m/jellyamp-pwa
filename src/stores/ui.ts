import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'
type SortOption = 'name-asc' | 'name-desc' | 'artist-asc' | 'artist-desc' | 'year-newest' | 'year-oldest' | 'date-added'

interface UIState {
  viewMode: ViewMode
  sortOption: SortOption
  libraryFilter: string

  setViewMode: (mode: ViewMode) => void
  setSortOption: (option: SortOption) => void
  setLibraryFilter: (filter: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sortOption: 'name-asc',
      libraryFilter: 'Artists',

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortOption: (option) => set({ sortOption: option }),
      setLibraryFilter: (filter) => set({ libraryFilter: filter }),
    }),
    {
      name: 'jellyamp-ui',
    }
  )
)

export type { ViewMode, SortOption }
