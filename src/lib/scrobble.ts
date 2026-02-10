import type { Track } from '../stores/player'
import type { ScrobbleSettings } from '../stores/ui'

// Last.fm API configuration
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth'

// ListenBrainz API configuration
const LISTENBRAINZ_API_URL = 'https://api.listenbrainz.org'

/**
 * Simple MD5 implementation for Last.fm API signatures
 */
function md5(str: string): string {
  function RotateLeft(lValue: number, iShiftBits: number): number {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }

  function AddUnsigned(lX: number, lY: number): number {
    const lX4 = (lX & 0x40000000)
    const lY4 = (lY & 0x40000000)
    const lX8 = (lX & 0x80000000)
    const lY8 = (lY & 0x80000000)
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF)
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8)
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8)
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8)
      }
    } else {
      return (lResult ^ lX8 ^ lY8)
    }
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z) }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)) }
  function H(x: number, y: number, z: number): number { return (x ^ y ^ z) }
  function I(x: number, y: number, z: number): number { return (y ^ (x | (~z))) }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function ConvertToWordArray(str: string): number[] {
    let lWordCount: number
    const lMessageLength = str.length
    const lNumberOfWords_temp1 = lMessageLength + 8
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
    const lWordArray = new Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition))
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }

  function WordToHex(lValue: number): string {
    let WordToHexValue = ""
    let WordToHexValue_temp = ""
    let lByte: number
    let lCount: number
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      WordToHexValue_temp = "0" + lByte.toString(16)
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2)
    }
    return WordToHexValue
  }

  let x = ConvertToWordArray(str)
  let a = 0x67452301
  let b = 0xEFCDAB89
  let c = 0x98BADCFE
  let d = 0x10325476

  for (let k = 0; k < x.length; k += 16) {
    const AA = a
    const BB = b
    const CC = c
    const DD = d
    a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478)
    d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756)
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB)
    b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE)
    a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF)
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A)
    c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613)
    b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501)
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8)
    d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF)
    c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1)
    b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE)
    a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122)
    d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193)
    c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E)
    b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821)
    a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562)
    d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340)
    c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51)
    b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA)
    a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D)
    d = GG(d, a, b, c, x[k + 10], 9, 0x2441453)
    c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681)
    b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8)
    a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6)
    d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6)
    c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87)
    b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED)
    a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905)
    d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8)
    c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9)
    b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A)
    a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942)
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681)
    c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122)
    b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C)
    a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44)
    d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9)
    c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60)
    b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70)
    a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6)
    d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA)
    c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085)
    b = HH(b, c, d, a, x[k + 6], 23, 0x4881D05)
    a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039)
    d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5)
    c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8)
    b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665)
    a = II(a, b, c, d, x[k + 0], 6, 0xF4292244)
    d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97)
    c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7)
    b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039)
    a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3)
    d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92)
    c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D)
    b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1)
    a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F)
    d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0)
    c = II(c, d, a, b, x[k + 6], 15, 0xA3014314)
    b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1)
    a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82)
    d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235)
    c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB)
    b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391)
    a = AddUnsigned(a, AA)
    b = AddUnsigned(b, BB)
    c = AddUnsigned(c, CC)
    d = AddUnsigned(d, DD)
  }
  
  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase()
}

/**
 * Generate Last.fm API signature for authenticated requests
 */
function generateLastFmSignature(params: Record<string, string>, secret: string): string {
  // Remove format parameter as it shouldn't be included in signature
  const paramsCopy = { ...params }
  delete paramsCopy.format
  
  const sortedKeys = Object.keys(paramsCopy).sort()
  const sigString = sortedKeys.map(key => `${key}${paramsCopy[key]}`).join('') + secret
  
  return md5(sigString)
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
  }
  
  const signature = generateLastFmSignature(params, apiSecret)
  
  const response = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, api_sig: signature, format: 'json' })
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
  if (!lastfmSettings.apiSecret) return
  
  const params = {
    method: 'track.updateNowPlaying',
    api_key: lastfmSettings.apiKey,
    sk: lastfmSettings.sessionKey,
    track: track.name,
    artist: track.artistName || 'Unknown Artist',
    album: track.albumName || '',
  }
  
  const signature = generateLastFmSignature(params, lastfmSettings.apiSecret)
  
  await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, api_sig: signature, format: 'json' })
  })
}

/**
 * Scrobble to Last.fm
 */
async function scrobbleToLastFm(track: Track, timestamp: number, lastfmSettings: ScrobbleSettings['lastfm']): Promise<void> {
  if (!lastfmSettings.apiSecret) return
  
  const params = {
    method: 'track.scrobble',
    api_key: lastfmSettings.apiKey,
    sk: lastfmSettings.sessionKey,
    'track[0]': track.name,
    'artist[0]': track.artistName || 'Unknown Artist',
    'album[0]': track.albumName || '',
    'timestamp[0]': Math.floor(timestamp / 1000).toString(),
  }
  
  const signature = generateLastFmSignature(params, lastfmSettings.apiSecret)
  
  await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, api_sig: signature, format: 'json' })
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