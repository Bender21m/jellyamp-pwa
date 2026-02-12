import { useState, useEffect } from 'react'

const CACHE_KEY_PREFIX = 'jellyamp-wiki-img-'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const REJECTED_KEY = 'jellyamp-wiki-img-rejected'

interface CacheEntry {
  url: string | null // null = no image found
  fetchedAt: number
}

function getCached(name: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + name.toLowerCase())
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt > CACHE_TTL) return null
    return entry
  } catch {
    return null
  }
}

function setCache(name: string, url: string | null) {
  try {
    const entry: CacheEntry = { url, fetchedAt: Date.now() }
    localStorage.setItem(CACHE_KEY_PREFIX + name.toLowerCase(), JSON.stringify(entry))
  } catch { /* quota exceeded, ignore */ }
}

function isRejected(name: string): boolean {
  try {
    const rejected: string[] = JSON.parse(localStorage.getItem(REJECTED_KEY) || '[]')
    return rejected.includes(name.toLowerCase())
  } catch {
    return false
  }
}

// In-flight request dedup
const pending = new Map<string, Promise<string | null>>()

async function fetchWikiImage(name: string): Promise<string | null> {
  const key = name.toLowerCase()
  if (pending.has(key)) return pending.get(key)!

  const promise = (async () => {
    try {
      const slug = name.replace(/\s+/g, '_')
      const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`)
      if (!resp.ok) return null
      const data = await resp.json()

      // Confidence check: title should roughly match
      const title = (data.title || '').toLowerCase()
      const search = name.toLowerCase().replace(/^the\s+/, '')
      if (!title.includes(search) && !search.includes(title.replace(/\s*\(.*\)/, ''))) {
        return null
      }

      // Prefer thumbnail (smaller, faster) over original
      return data.thumbnail?.source || null
    } catch {
      return null
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, promise)
  return promise
}

/**
 * Returns a Wikipedia image URL for an artist, with caching and lazy loading.
 * Only fetches when no Jellyfin image exists.
 */
export function useArtistImage(name: string, hasJellyfinImage: boolean): string | null {
  const [wikiImage, setWikiImage] = useState<string | null>(() => {
    if (hasJellyfinImage) return null
    const cached = getCached(name)
    return cached?.url || null
  })

  useEffect(() => {
    if (hasJellyfinImage || !name) return
    if (isRejected(name)) return

    const cached = getCached(name)
    if (cached) {
      // Setting cached result is legitimate data loading pattern
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWikiImage(cached.url)
      return
    }

    let cancelled = false
    fetchWikiImage(name).then(url => {
      if (cancelled) return
      setCache(name, url)
      setWikiImage(url)
    })

    return () => { cancelled = true }
  }, [name, hasJellyfinImage])

  return wikiImage
}
