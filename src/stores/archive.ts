import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ArchiveArtist {
  name: string
  imageUrl?: string
  showCount?: number
  pinnedAt: number
}

interface ArchiveState {
  enabled: boolean
  pinnedArtists: ArchiveArtist[]
  favoriteShows: string[]     // identifiers
  lastSearch: string

  setEnabled: (enabled: boolean) => void
  pinArtist: (artist: ArchiveArtist) => void
  unpinArtist: (name: string) => void
  toggleFavoriteShow: (identifier: string) => void
  isFavoriteShow: (identifier: string) => boolean
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set, get) => ({
      enabled: false,
      pinnedArtists: [],
      favoriteShows: [],
      lastSearch: '',

      setEnabled: (enabled) => set({ enabled }),

      pinArtist: (artist) => set((s) => ({
        pinnedArtists: s.pinnedArtists.some((a) => a.name === artist.name)
          ? s.pinnedArtists
          : [...s.pinnedArtists, artist],
      })),

      unpinArtist: (name) => set((s) => ({
        pinnedArtists: s.pinnedArtists.filter((a) => a.name !== name),
      })),

      toggleFavoriteShow: (identifier) => set((s) => ({
        favoriteShows: s.favoriteShows.includes(identifier)
          ? s.favoriteShows.filter((id) => id !== identifier)
          : [...s.favoriteShows, identifier],
      })),

      isFavoriteShow: (identifier) => get().favoriteShows.includes(identifier),
    }),
    {
      name: 'jellyamp-archive',
    }
  )
)
