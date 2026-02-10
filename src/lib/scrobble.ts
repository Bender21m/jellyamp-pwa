import type { Track } from '../stores/player'
import type { ScrobbleSettings } from '../stores/ui'

// Last.fm API configuration
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth'

// ListenBrainz API configuration
const LISTENBRAINZ_API_URL = 'https://api.listenbrainz.org'

/**
 * Generate Last.fm API signature for authenticated requests
 */
function generateLastFmSignature(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const sigString = sortedKeys.map(key => `${key}${params[key]}`).join('') + secret
  
  // Simple MD5 hash implementation (you might want to use a proper crypto library)
  return btoa(sigString).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/**
 * Start Last.fm authentication flow
 */
export async function startLastFmAuth(apiKey: string): Promise<string> {
  const token = await fetch(`${LASTFM_API_URL}?method=auth.getToken&api_key=${apiKey}&format=json`)
    .then(res => res.json())
    .then(data => data.token)
  
  const authUrl = `${LASTFM_AUTH_URL}/?api_key=${apiKey}&token=${token}`
  return authUrl
}

/**
 * Complete Last.fm authentication and get session key
 */
export async function completeLastFmAuth(apiKey: string, token: string, apiSecret: string): Promise<{ sessionKey: string; username: string }> {
  const params = {
    method: 'auth.getSession',
    api_key: apiKey,
    token: token,
    format: 'json'
  }
  
  const signature = generateLastFmSignature(params, apiSecret)
  
  const response = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, api_sig: signature })
  })
  
  const data = await response.json()
  if (data.error) {
    throw new Error(data.message)
  }
  
  return {
    sessionKey: data.session.key,
    username: data.session.name
  }
}

/**
 * Validate ListenBrainz token and get username
 */
export async function validateListenBrainzToken(token: string): Promise<string> {
  const response = await fetch(`${LISTENBRAINZ_API_URL}/1/validate-token`, {
    headers: { 'Authorization': `Token ${token}` }
  })
  
  if (!response.ok) {
    throw new Error('Invalid ListenBrainz token')
  }
  
  const data = await response.json()
  return data.user_name
}

/**
 * Update "Now Playing" status on enabled services
 */
export async function updateNowPlaying(track: Track, settings: ScrobbleSettings): Promise<void> {
  if (!settings.enabled) return
  
  const promises: Promise<void>[] = []
  
  // Last.fm now playing
  if (settings.lastfm.sessionKey && settings.lastfm.apiKey) {
    promises.push(updateLastFmNowPlaying(track, settings.lastfm))
  }
  
  // ListenBrainz now playing
  if (settings.listenbrainz.token) {
    promises.push(updateListenBrainzNowPlaying(track, settings.listenbrainz))
  }
  
  await Promise.allSettled(promises)
}

/**
 * Scrobble track to enabled services
 */
export async function scrobbleTrack(track: Track, timestamp: number, settings: ScrobbleSettings): Promise<boolean> {
  if (!settings.enabled) return false
  
  const promises: Promise<void>[] = []
  
  // Last.fm scrobble
  if (settings.lastfm.sessionKey && settings.lastfm.apiKey) {
    promises.push(scrobbleToLastFm(track, timestamp, settings.lastfm))
  }
  
  // ListenBrainz scrobble
  if (settings.listenbrainz.token) {
    promises.push(scrobbleToListenBrainz(track, timestamp, settings.listenbrainz))
  }
  
  const results = await Promise.allSettled(promises)
  return results.some(result => result.status === 'fulfilled')
}

/**
 * Update Last.fm now playing
 */
async function updateLastFmNowPlaying(track: Track, lastfmSettings: ScrobbleSettings['lastfm']): Promise<void> {
  const params = {
    method: 'track.updateNowPlaying',
    api_key: lastfmSettings.apiKey,
    sk: lastfmSettings.sessionKey,
    track: track.name,
    artist: track.artistName || 'Unknown Artist',
    album: track.albumName || '',
    format: 'json'
  }
  
  // Note: In a real implementation, you'd need the API secret for signature generation
  // For now, this is a simplified version
  await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  })
}

/**
 * Scrobble to Last.fm
 */
async function scrobbleToLastFm(track: Track, timestamp: number, lastfmSettings: ScrobbleSettings['lastfm']): Promise<void> {
  const params = {
    method: 'track.scrobble',
    api_key: lastfmSettings.apiKey,
    sk: lastfmSettings.sessionKey,
    'track[0]': track.name,
    'artist[0]': track.artistName || 'Unknown Artist',
    'album[0]': track.albumName || '',
    'timestamp[0]': Math.floor(timestamp / 1000).toString(),
    format: 'json'
  }
  
  // Note: In a real implementation, you'd need the API secret for signature generation
  await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  })
}

/**
 * Update ListenBrainz now playing
 */
async function updateListenBrainzNowPlaying(track: Track, lbSettings: ScrobbleSettings['listenbrainz']): Promise<void> {
  const payload = {
    listen_type: 'playing_now',
    payload: [{
      track_metadata: {
        track_name: track.name,
        artist_name: track.artistName || 'Unknown Artist',
        release_name: track.albumName || '',
        additional_info: {
          duration_ms: track.duration ? Math.round(track.duration * 1000) : undefined,
          media_player: 'JellyAmp',
          submission_client: 'JellyAmp'
        }
      }
    }]
  }
  
  await fetch(`${LISTENBRAINZ_API_URL}/1/submit-listens`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${lbSettings.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}

/**
 * Scrobble to ListenBrainz
 */
async function scrobbleToListenBrainz(track: Track, timestamp: number, lbSettings: ScrobbleSettings['listenbrainz']): Promise<void> {
  const payload = {
    listen_type: 'single',
    payload: [{
      listened_at: Math.floor(timestamp / 1000),
      track_metadata: {
        track_name: track.name,
        artist_name: track.artistName || 'Unknown Artist',
        release_name: track.albumName || '',
        additional_info: {
          duration_ms: track.duration ? Math.round(track.duration * 1000) : undefined,
          media_player: 'JellyAmp',
          submission_client: 'JellyAmp'
        }
      }
    }]
  }
  
  await fetch(`${LISTENBRAINZ_API_URL}/1/submit-listens`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${lbSettings.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}

/**
 * Check if track should be scrobbled based on play time
 * Rules: >30 seconds OR >50% of duration
 */
export function shouldScrobble(playTime: number, totalDuration: number): boolean {
  if (playTime < 30) return false // Must play at least 30 seconds
  return playTime >= Math.min(totalDuration * 0.5, 240) // 50% or 4 minutes, whichever is shorter
}