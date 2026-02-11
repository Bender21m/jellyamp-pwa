export interface ArtistInfo {
  name: string
  description?: string
  extract?: string
  imageUrl?: string
  fullImageUrl?: string
  formedYear?: string
  origin?: string
  genres?: string[]
  type?: string
  wikiUrl?: string
  fetchedAt: number
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

function cacheKey(name: string): string {
  return `jellyamp-artist-${name.toLowerCase().replace(/\s+/g, '-')}`
}

function truncateToSentences(text: string, max: number = 2): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text
  return sentences.slice(0, max).join(' ').trim()
}

async function fetchWikipediaInfo(artistName: string): Promise<Partial<ArtistInfo>> {
  try {
    const slug = artistName.replace(/\s+/g, '_')
    const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`)
    if (!resp.ok) return {}
    const data = await resp.json()
    return {
      description: data.description || undefined,
      extract: data.extract ? truncateToSentences(data.extract) : undefined,
      imageUrl: data.thumbnail?.source || undefined,
      fullImageUrl: data.originalimage?.source || undefined,
      wikiUrl: data.content_urls?.desktop?.page || undefined,
    }
  } catch {
    return {}
  }
}

async function fetchMusicBrainzInfo(artistName: string): Promise<Partial<ArtistInfo>> {
  const headers = { 'User-Agent': 'JellyAmp/0.1 (savetherobot.bot@gmail.com)' }
  try {
    const searchResp = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=5`,
      { headers }
    )
    if (!searchResp.ok) return {}
    const searchData = await searchResp.json()
    const artists = searchData.artists
    if (!artists || artists.length === 0) return {}

    // Find best match (exact name match preferred, otherwise first)
    const match = artists.find(
      (a: { name: string }) => a.name.toLowerCase() === artistName.toLowerCase()
    ) || artists[0]

    // Fetch details with tags
    const detailResp = await fetch(
      `https://musicbrainz.org/ws/2/artist/${match.id}?inc=tags&fmt=json`,
      { headers }
    )
    if (!detailResp.ok) {
      return {
        formedYear: match['life-span']?.begin?.slice(0, 4) || undefined,
        origin: match.area?.name || undefined,
        type: match.type || undefined,
      }
    }
    const detail = await detailResp.json()
    const tags = (detail.tags || [])
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 5)
      .map((t: { name: string }) => t.name)

    return {
      formedYear: detail['life-span']?.begin?.slice(0, 4) || undefined,
      origin: detail.area?.name || undefined,
      genres: tags.length > 0 ? tags : undefined,
      type: detail.type || undefined,
    }
  } catch {
    return {}
  }
}

// Queue for managing MusicBrainz requests to respect rate limits
class RequestQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false
  private lastMusicBrainzRequest = 0
  private readonly MUSICBRAINZ_DELAY = 1100 // 1.1 seconds to be safe with 1req/s limit

  async add<T>(task: () => Promise<T>, isMusicBrainz = false): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          if (isMusicBrainz) {
            const now = Date.now()
            const timeSinceLastRequest = now - this.lastMusicBrainzRequest
            if (timeSinceLastRequest < this.MUSICBRAINZ_DELAY) {
              await new Promise(r => setTimeout(r, this.MUSICBRAINZ_DELAY - timeSinceLastRequest))
            }
            this.lastMusicBrainzRequest = Date.now()
          }
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      await task()
    }

    this.processing = false
  }
}

const requestQueue = new RequestQueue()

export async function getArtistInfo(artistName: string): Promise<ArtistInfo | null> {
  try {
    const key = cacheKey(artistName)
    const cached = localStorage.getItem(key)
    if (cached) {
      const parsed: ArtistInfo = JSON.parse(cached)
      if (Date.now() - parsed.fetchedAt < CACHE_TTL) return parsed
    }

    // Fetch Wikipedia first (no rate limit), then MusicBrainz (rate limited)
    const wiki = await fetchWikipediaInfo(artistName)
    const mb = await requestQueue.add(() => fetchMusicBrainzInfo(artistName), true)

    const info: ArtistInfo = {
      name: artistName,
      fetchedAt: Date.now(),
      ...mb,
      ...wiki,
      // Keep MB genres if wiki didn't provide them
      genres: wiki.genres || mb.genres,
    }

    try { localStorage.setItem(key, JSON.stringify(info)) } catch { /* quota */ }
    return info
  } catch {
    return null
  }
}
