import { Jellyfin } from '@jellyfin/sdk'
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api'
import { getArtistsApi } from '@jellyfin/sdk/lib/utils/api/artists-api'
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api'
import type { Api } from '@jellyfin/sdk'
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models'
import { BaseItemKind, SortOrder, ItemSortBy, ItemFields } from '@jellyfin/sdk/lib/generated-client/models'

const jellyfin = new Jellyfin({
  clientInfo: { name: 'JellyAmp PWA', version: '0.1.0' },
  deviceInfo: {
    name: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
    id: getDeviceId(),
  },
})

function getDeviceId(): string {
  let id = localStorage.getItem('jellyamp-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('jellyamp-device-id', id)
  }
  return id
}

export function createApi(serverUrl: string) {
  return jellyfin.createApi(serverUrl)
}

export function getImageUrl(serverUrl: string, itemId: string, tag?: string | null, maxWidth = 300): string {
  const params = new URLSearchParams({ maxWidth: maxWidth.toString(), quality: '90' })
  if (tag) params.set('tag', tag)
  return `${serverUrl}/Items/${itemId}/Images/Primary?${params}`
}

export type StreamQuality = 'original' | 'high' | 'medium' | 'low'

const QUALITY_BITRATES: Record<Exclude<StreamQuality, 'original'>, string> = {
  high: '320000',
  medium: '192000',
  low: '128000',
}

export function getStreamUrl(serverUrl: string, itemId: string, token: string, quality: StreamQuality = 'original'): string {
  if (quality === 'original') {
    // Direct stream — no transcoding, original file as-is
    const params = new URLSearchParams({
      static: 'true',
      mediaSourceId: itemId,
      api_key: token,
    })
    return `${serverUrl}/Audio/${itemId}/stream?${params}`
  }

  // Transcoded stream
  const params = new URLSearchParams({
    static: 'false',
    mediaSourceId: itemId,
    api_key: token,
    MaxStreamingBitrate: QUALITY_BITRATES[quality],
    AudioCodec: 'mp3',
    Container: 'mp3',
    TranscodingContainer: 'mp3',
    TranscodingProtocol: 'http',
  })
  return `${serverUrl}/Audio/${itemId}/stream?${params}`
}

export async function getStreamUrlWithCache(serverUrl: string, itemId: string, token: string, quality: StreamQuality = 'original'): Promise<string> {
  // For offline playback, check cache first (only for original quality)
  if (quality === 'original' && 'caches' in window) {
    try {
      const { getCachedTrackUrl } = await import('./offlineCache')
      const cachedUrl = await getCachedTrackUrl(itemId, serverUrl)
      if (cachedUrl) {
        return cachedUrl
      }
    } catch (error) {
      console.debug('Cache check failed:', error)
    }
  }

  // Fall back to regular streaming
  return getStreamUrl(serverUrl, itemId, token, quality)
}

export async function fetchAlbums(api: Api, userId: string, opts?: {
  limit?: number, startIndex?: number, sortBy?: ItemSortBy[], sortOrder?: SortOrder[],
  searchTerm?: string, artistIds?: string[], parentId?: string,
}) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    includeItemTypes: [BaseItemKind.MusicAlbum],
    recursive: true,
    sortBy: opts?.sortBy ?? [ItemSortBy.SortName],
    sortOrder: opts?.sortOrder ?? [SortOrder.Ascending],
    limit: opts?.limit ?? 100,
    startIndex: opts?.startIndex,
    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.MediaSources],
    searchTerm: opts?.searchTerm,
    artistIds: opts?.artistIds,
    parentId: opts?.parentId,
  })
  return data
}

export async function fetchArtists(api: Api, userId: string, opts?: {
  limit?: number, startIndex?: number, searchTerm?: string,
}) {
  const artistsApi = getArtistsApi(api)
  const { data } = await artistsApi.getArtists({
    userId,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [ItemFields.PrimaryImageAspectRatio],
    limit: opts?.limit ?? 100,
    startIndex: opts?.startIndex,
    searchTerm: opts?.searchTerm,
  })
  return data
}

export async function fetchTracks(api: Api, userId: string, parentId: string) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    parentId,
    includeItemTypes: [BaseItemKind.Audio],
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [ItemFields.MediaSources],
  })
  return data
}

// Use the Playlists endpoint — returns PlaylistItemId (needed for remove) and preserves user ordering
export async function fetchPlaylistTracks(api: Api, userId: string, playlistId: string) {
  const { data } = await api.axiosInstance.get(`${api.basePath}/Playlists/${playlistId}/Items`, {
    params: {
      UserId: userId,
      Fields: 'MediaSources',
    },
  })
  return data as { Items?: BaseItemDto[]; TotalRecordCount?: number }
}

export async function fetchArtistTracks(api: Api, userId: string, artistId: string) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    artistIds: [artistId],
    includeItemTypes: [BaseItemKind.Audio],
    sortBy: [ItemSortBy.Album, ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending, SortOrder.Ascending],
    recursive: true,
    fields: [ItemFields.MediaSources],
  })
  return data
}

export async function fetchFavorites(api: Api, userId: string, itemTypes: BaseItemKind[]) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    includeItemTypes: itemTypes,
    recursive: true,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    filters: ['IsFavorite' as never],
    fields: [ItemFields.PrimaryImageAspectRatio],
  })
  return data
}

export async function fetchPlaylists(api: Api, userId: string) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    includeItemTypes: [BaseItemKind.Playlist],
    recursive: true,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.ChildCount],
  })
  return data
}

export async function searchAll(api: Api, userId: string, query: string) {
  const itemsApi = getItemsApi(api)
  const { data } = await itemsApi.getItems({
    userId,
    searchTerm: query,
    includeItemTypes: [BaseItemKind.MusicArtist, BaseItemKind.MusicAlbum, BaseItemKind.Audio],
    recursive: true,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.MediaSources],
    limit: 50,
  })
  return data
}

export async function toggleFavorite(api: Api, userId: string, itemId: string, isFavorite: boolean) {
  const url = `${api.basePath}/Users/${userId}/FavoriteItems/${itemId}`
  await api.axiosInstance({ method: isFavorite ? 'DELETE' : 'POST', url })
}

export async function createPlaylist(api: Api, userId: string, name: string) {
  const { data } = await api.axiosInstance.post(`${api.basePath}/Playlists`, null, {
    params: { Name: name, MediaType: 'Audio', UserId: userId },
  })
  return data as { Id: string }
}

export async function addToPlaylist(api: Api, playlistId: string, trackIds: string[]) {
  await api.axiosInstance.post(`${api.basePath}/Playlists/${playlistId}/Items`, null, {
    params: { Ids: trackIds.join(',') },
  })
}

export async function removeFromPlaylist(api: Api, playlistId: string, entryIds: string[]) {
  await api.axiosInstance.delete(`${api.basePath}/Playlists/${playlistId}/Items`, {
    params: { EntryIds: entryIds.join(',') },
  })
}

export async function deletePlaylist(api: Api, playlistId: string) {
  await api.axiosInstance.delete(`${api.basePath}/Items/${playlistId}`)
}

export interface LyricsLine {
  Start?: number // Start time in ticks (10,000,000 ticks = 1 second)
  Text: string
}

export interface LyricsResponse {
  Lyrics: LyricsLine[]
}

export async function fetchLyrics(api: Api, trackId: string): Promise<LyricsResponse | null> {
  try {
    const { data } = await api.axiosInstance.get(`${api.basePath}/Audio/${trackId}/Lyrics`)
    return data as LyricsResponse
  } catch (error) {
    // Lyrics not available or error
    return null
  }
}

export async function fetchArtistById(api: Api, userId: string, artistId: string): Promise<BaseItemDto | null> {
  // Try multiple approaches — Jellyfin artist items are tricky
  try {
    // First: try direct item lookup
    const { data } = await api.axiosInstance.get(`${api.basePath}/Users/${userId}/Items/${artistId}`)
    if (data?.Id) return data as BaseItemDto
  } catch { /* fall through */ }

  try {
    // Second: try Items endpoint with specific ID filter
    const itemsApi = getItemsApi(api)
    const { data } = await itemsApi.getItems({
      userId,
      ids: [artistId],
      fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview],
    })
    if (data.Items && data.Items.length > 0) return data.Items[0]
  } catch { /* fall through */ }

  try {
    // Third: try the Artists endpoint with search
    const artistsApi = getArtistsApi(api)
    const { data } = await artistsApi.getArtists({
      userId,
      fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview],
    })
    const match = data.Items?.find(a => a.Id === artistId)
    if (match) return match
  } catch { /* fall through */ }

  return null
}

export async function fetchSimilarArtists(api: Api, userId: string, artistId: string): Promise<BaseItemDto[]> {
  try {
    const { data } = await api.axiosInstance.get(`${api.basePath}/Artists/${artistId}/Similar`, {
      params: {
        UserId: userId,
        Limit: 8,
        Fields: 'PrimaryImageAspectRatio'
      }
    })
    return data.Items ?? []
  } catch (error) {
    // Similar artists not available (many Jellyfin servers don't have this data)
    console.debug('Similar artists not available:', error)
    return []
  }
}

export { jellyfin, getItemsApi, getArtistsApi, getImageApi, BaseItemKind, SortOrder, ItemSortBy, ItemFields }
export type { BaseItemDto }
