import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'
type SortOption = 'name-asc' | 'name-desc' | 'artist-asc' | 'artist-desc' | 'year-newest' | 'year-oldest'

interface UIState {
  sidebarCollapsed: boolean
  viewMode: ViewMode
  sortOption: SortOption
  libraryFilter: string

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setSortOption: (option: SortOption) => void
  setLibraryFilter: (filter: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      viewMode: 'grid',
      sortOption: 'name-asc',
      libraryFilter: 'Albums',

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
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
