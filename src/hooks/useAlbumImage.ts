import { useState, useEffect } from 'react'

const CACHE_PREFIX = 'jellyamp-cover-'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const USER_AGENT = 'JellyAmp/0.1 (savetherobot.bot@gmail.com)'

interface CacheEntry {
  url: string | null
  fetchedAt: number
}

function getCached(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt > CACHE_TTL) return null
    return entry
  } catch {
    return null
  }
}

function setCache(key: string, url: string | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ url, fetchedAt: Date.now() }))
  } catch { /* quota */ }
}

// Rate limiter: 1 request per second for MusicBrainz
let lastRequestTime = 0
async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now()
  const wait = Math.max(0, 1000 - (now - lastRequestTime))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestTime = Date.now()
  return fetch(url, init)
}

// In-flight dedup
const pending = new Map<string, Promise<string | null>>()

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function fetchCoverArt(albumName: string, artistName: string): Promise<string | null> {
  const key = `${normalize(albumName)}:${normalize(artistName)}`
  if (pending.has(key)) return pending.get(key)!

  const promise = (async () => {
    try {
      const query = `release:${encodeURIComponent(albumName)}+artist:${encodeURIComponent(artistName)}`
      const resp = await rateLimitedFetch(
        `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=3`,
        { headers: { 'User-Agent': USER_AGENT } }
      )
      if (!resp.ok) return null
      const data = await resp.json()
      const releases = data.releases || []

      // Find best match
      const normalizedAlbum = normalize(albumName)
      const match = releases.find((r: { title?: string }) =>
        normalize(r.title || '') === normalizedAlbum
      ) || releases.find((r: { title?: string }) =>
        normalize(r.title || '').includes(normalizedAlbum) || normalizedAlbum.includes(normalize(r.title || ''))
      )

      if (!match?.id) return null

      // Fetch cover art (Cover Art Archive redirects to image)
      const coverResp = await fetch(`https://coverartarchive.org/release/${match.id}/front-250`)
      if (!coverResp.ok) return null
      return coverResp.url
    } catch {
      return null
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, promise)
  return promise
}

export function useAlbumImage(albumName: string, artistName: string, hasJellyfinImage: boolean): string | null {
  const cacheKey = `${normalize(albumName)}:${normalize(artistName)}`

  const [coverUrl, setCoverUrl] = useState<string | null>(() => {
    if (hasJellyfinImage) return null
    return getCached(cacheKey)?.url || null
  })

  useEffect(() => {
    if (hasJellyfinImage || !albumName) return

    const cached = getCached(cacheKey)
    if (cached) {
      setCoverUrl(cached.url)
      return
    }

    let cancelled = false
    fetchCoverArt(albumName, artistName).then(url => {
      if (cancelled) return
      setCache(cacheKey, url)
      setCoverUrl(url)
    })

    return () => { cancelled = true }
  }, [albumName, artistName, hasJellyfinImage, cacheKey])

  return coverUrl
}
