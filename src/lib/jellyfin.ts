import { Jellyfin } from '@jellyfin/sdk'
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api'
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api'
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api'
import { getArtistsApi } from '@jellyfin/sdk/lib/utils/api/artists-api'
import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api'
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api'
import { getUniversalAudioApi } from '@jellyfin/sdk/lib/utils/api/universal-audio-api'

const jellyfin = new Jellyfin({
  clientInfo: {
    name: 'JellyAmp PWA',
    version: '0.1.0',
  },
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

export { jellyfin, getSystemApi, getUserApi, getItemsApi, getArtistsApi, getSearchApi, getImageApi, getUniversalAudioApi }
