import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ArchiveArtist {
  name: string
  imageUrl?: string
  showCount?: number
  pinnedAt: number
}

export interface FavoriteShowDetails {
  identifier: string
  artist: string
  date: string
  venue: string
  imageUrl: string
}

interface ArchiveState {
  enabled: boolean
  pinnedArtists: ArchiveArtist[]
  favoriteShows: string[]     // identifiers
  favoriteShowDetails: Record<string, FavoriteShowDetails>
  recentSearches: string[]
  lastSearch: string

  setEnabled: (enabled: boolean) => void
  pinArtist: (artist: ArchiveArtist) => void
  unpinArtist: (name: string) => void
  toggleFavoriteShow: (identifier: string) => void
  isFavoriteShow: (identifier: string) => boolean
  cacheFavoriteShowDetails: (details: FavoriteShowDetails) => void
  addRecentSearch: (query: string) => void
  removeRecentSearch: (query: string) => void
  clearRecentSearches: () => void
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set, get) => ({
      enabled: false,
      pinnedArtists: [],
      favoriteShows: [],
      favoriteShowDetails: {},
      recentSearches: [],
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

      toggleFavoriteShow: (identifier) => set((s) => {
        const removing = s.favoriteShows.includes(identifier)
        const newDetails = { ...s.favoriteShowDetails }
        if (removing) delete newDetails[identifier]
        return {
          favoriteShows: removing
            ? s.favoriteShows.filter((id) => id !== identifier)
            : [...s.favoriteShows, identifier],
          favoriteShowDetails: newDetails,
        }
      }),

      isFavoriteShow: (identifier) => get().favoriteShows.includes(identifier),

      cacheFavoriteShowDetails: (details) => set((s) => ({
        favoriteShowDetails: { ...s.favoriteShowDetails, [details.identifier]: details },
      })),

      addRecentSearch: (query) => set((s) => {
        const trimmed = query.trim()
        if (!trimmed) return s
        const filtered = s.recentSearches.filter((q) => q !== trimmed)
        return { recentSearches: [trimmed, ...filtered].slice(0, 10) }
      }),

      removeRecentSearch: (query) => set((s) => ({
        recentSearches: s.recentSearches.filter((q) => q !== query),
      })),

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'jellyamp-archive',
    }
  )
)
