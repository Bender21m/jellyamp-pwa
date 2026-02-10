// Internet Archive Live Music Archive API layer
// Completely independent — no imports from jellyfin.ts

import type { Track } from '../stores/player'

// --- Types ---

export interface ArchiveShow {
  identifier: string
  title: string
  artist: string
  date: string        // YYYY-MM-DD
  venue: string
  source: string
  rating?: number
  reviewCount?: number
  imageUrl: string
}

export interface ArchiveTrack extends Track {
  streamUrl: string
}

export interface ShowMetadata {
  identifier: string
  title: string
  creator: string
  date: string
  venue: string
  source: string
  description: string
  notes: string
  taper: string
  rating?: number
  reviewCount?: number
  imageUrl: string
  files: ArchiveFile[]
}

interface ArchiveFile {
  name: string
  source: string
  format: string
  title?: string
  track?: string
  length?: string
  creator?: string
}

// --- URL builders ---

export function getStreamUrl(identifier: string, filename: string): string {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`
}

export function getThumbnailUrl(identifier: string): string {
  return `https://archive.org/services/img/${encodeURIComponent(identifier)}`
}

// --- Duration parsing ---

function parseDuration(length: string | undefined): number {
  if (!length) return 0
  // "mm:ss" or "h:mm:ss" format
  if (length.includes(':')) {
    const parts = length.split(':').map(Number)
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
    if (parts.length === 2) return (parts[0] * 60) + parts[1]
    return 0
  }
  // Seconds as float: "1438.27"
  const secs = parseFloat(length)
  return isNaN(secs) ? 0 : Math.round(secs)
}

// --- API functions ---

export async function searchShows(
  artist: string,
  options?: { year?: number; page?: number; rows?: number }
): Promise<{ shows: ArchiveShow[]; total: number }> {
  const { year, page = 1, rows = 50 } = options ?? {}
  let q = `collection:etree AND creator:"${artist}"`
  if (year) q += ` AND date:${year}*`

  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,creator,date,venue,avg_rating,num_reviews,source',
    'sort[]': 'date desc',
    rows: String(rows),
    page: String(page),
    output: 'json',
  })

  // fl[] and sort[] need multiple values — URLSearchParams handles duplication,
  // but the Archive API accepts comma-separated fl[] too. We use the simple form.
  const url = `https://archive.org/advancedsearch.php?${params.toString()}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Archive search failed: ${res.status}`)
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []
    const total: number = data?.response?.numFound ?? 0

    const shows: ArchiveShow[] = docs.map((doc) => ({
      identifier: String(doc.identifier ?? ''),
      title: String(doc.title ?? ''),
      artist: String(doc.creator ?? artist),
      date: String(doc.date ?? '').slice(0, 10),
      venue: String(doc.venue ?? ''),
      source: String(doc.source ?? ''),
      rating: typeof doc.avg_rating === 'number' ? doc.avg_rating : undefined,
      reviewCount: typeof doc.num_reviews === 'number' ? doc.num_reviews : undefined,
      imageUrl: getThumbnailUrl(String(doc.identifier ?? '')),
    }))

    return { shows, total }
  } catch (err) {
    console.error('[Archive] searchShows error:', err)
    return { shows: [], total: 0 }
  }
}

export async function getShowMetadata(identifier: string): Promise<ShowMetadata> {
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`)
  if (!res.ok) throw new Error(`Archive metadata failed: ${res.status}`)
  const data = await res.json()
  const meta = data?.metadata ?? {}
  const files: ArchiveFile[] = (data?.files ?? []).map((f: Record<string, unknown>) => ({
    name: String(f.name ?? ''),
    source: String(f.source ?? ''),
    format: String(f.format ?? ''),
    title: f.title ? String(f.title) : undefined,
    track: f.track ? String(f.track) : undefined,
    length: f.length ? String(f.length) : undefined,
    creator: f.creator ? String(f.creator) : undefined,
  }))

  return {
    identifier,
    title: String(meta.title ?? ''),
    creator: String(meta.creator ?? ''),
    date: String(meta.date ?? '').slice(0, 10),
    venue: String(meta.venue ?? ''),
    source: String(meta.source ?? ''),
    description: String(meta.description ?? ''),
    notes: String(meta.notes ?? ''),
    taper: String(meta.taper ?? ''),
    rating: typeof meta.avg_rating === 'number' ? meta.avg_rating : undefined,
    reviewCount: typeof meta.num_reviews === 'number' ? meta.num_reviews : undefined,
    imageUrl: getThumbnailUrl(identifier),
    files,
  }
}

export async function getShowTracks(identifier: string): Promise<ArchiveTrack[]> {
  try {
    const metadata = await getShowMetadata(identifier)
    const mp3Files = metadata.files.filter(
      (f) => f.source === 'derivative' && f.format === 'VBR MP3'
    )

    // Sort by track number
    mp3Files.sort((a, b) => {
      const aNum = parseInt(a.track ?? '0', 10) || 0
      const bNum = parseInt(b.track ?? '0', 10) || 0
      return aNum - bNum
    })

    const albumName = [metadata.date, metadata.venue].filter(Boolean).join(' — ')

    return mp3Files.map((f) => ({
      id: `${identifier}/${f.name}`,
      name: f.title ?? f.name.replace(/\.mp3$/i, ''),
      artistName: f.creator ?? metadata.creator,
      albumName,
      duration: parseDuration(f.length),
      imageUrl: metadata.imageUrl,
      streamUrl: getStreamUrl(identifier, f.name),
    }))
  } catch (err) {
    console.error('[Archive] getShowTracks error:', err)
    return []
  }
}

export async function searchArtists(
  query: string
): Promise<{ name: string; showCount: number }[]> {
  // Search etree collection, group by creator
  const params = new URLSearchParams({
    q: `collection:etree AND creator:"${query}"`,
    'fl[]': 'creator',
    'sort[]': 'date desc',
    rows: '200',
    page: '1',
    output: 'json',
  })

  try {
    const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`)
    if (!res.ok) throw new Error(`Archive artist search failed: ${res.status}`)
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []

    // Group by creator name to get counts
    const counts = new Map<string, number>()
    for (const doc of docs) {
      const name = String(doc.creator ?? '').trim()
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([name, showCount]) => ({ name, showCount }))
      .sort((a, b) => b.showCount - a.showCount)
  } catch (err) {
    console.error('[Archive] searchArtists error:', err)
    return []
  }
}

/**
 * Fetch all years an artist has shows, with counts per year.
 * Uses a lightweight query fetching only date fields.
 */
export async function getArtistYears(
  artist: string
): Promise<{ year: number; count: number }[]> {
  // Fetch up to 10000 dates (just the date field, very lightweight)
  const params = new URLSearchParams({
    q: `collection:etree AND creator:"${artist}"`,
    'fl[]': 'date',
    'sort[]': 'date desc',
    rows: '10000',
    output: 'json',
  })

  try {
    const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []

    const yearCounts = new Map<number, number>()
    for (const doc of docs) {
      const dateStr = String(doc.date ?? '')
      const y = parseInt(dateStr.slice(0, 4), 10)
      if (!isNaN(y) && y > 1900) {
        yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
      }
    }

    return Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year)
  } catch (err) {
    console.error('[Archive] getArtistYears error:', err)
    return []
  }
}

export function groupShowsByDate(shows: ArchiveShow[]): Map<string, ArchiveShow[]> {
  const map = new Map<string, ArchiveShow[]>()
  for (const show of shows) {
    const existing = map.get(show.date)
    if (existing) {
      existing.push(show)
    } else {
      map.set(show.date, [show])
    }
  }
  return map
}
