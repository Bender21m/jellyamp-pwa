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

export { jellyfin, getItemsApi, getArtistsApi, getImageApi, BaseItemKind, SortOrder, ItemSortBy, ItemFields }
export type { BaseItemDto }
