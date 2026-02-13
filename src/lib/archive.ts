// Internet Archive Live Music Archive API layer
// Completely independent — no imports from jellyfin.ts

import type { Track } from '../stores/player'
import { parseSetlist, mapTracksToSetlist } from './setlistParser'

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
  original?: string
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
  options?: { year?: number; page?: number; rows?: number; sort?: string }
): Promise<{ shows: ArchiveShow[]; total: number }> {
  const { year, page = 1, rows = 50, sort = 'date desc' } = options ?? {}
  let q = `collection:etree`
  if (artist) q += ` AND creator:"${artist}"`
  if (year) q += ` AND date:${year}*`

  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,creator,date,venue,avg_rating,num_reviews,source',
    'sort[]': sort,
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
    original: f.original ? String(f.original) : undefined,
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

/**
 * Resolve track names using a waterfall of data sources:
 *
 * 1. MP3 file's own `title` tag (best, but often missing)
 * 2. Original source file's `title` tag (FLAC/SHN — often has tags the MP3 lost)
 * 3. Setlist parsed from the show description (works for many formats)
 * 4. Cleaned-up filename (last resort)
 *
 * Each source is tried in order; the first non-empty result wins.
 */
export async function getShowTracks(identifier: string): Promise<ArchiveTrack[]> {
  try {
    const metadata = await getShowMetadata(identifier)
    const mp3Files = metadata.files.filter(
      (f) => f.source === 'derivative' && f.format === 'VBR MP3'
    )

    // Sort by track number or filename
    mp3Files.sort((a, b) => {
      const aNum = parseInt(a.track ?? '0', 10) || 0
      const bNum = parseInt(b.track ?? '0', 10) || 0
      if (aNum !== bNum) return aNum - bNum
      return a.name.localeCompare(b.name)
    })

    const albumName = [metadata.date, metadata.venue].filter(Boolean).join(' — ')

    // --- Source 2: Build original file title map ---
    // MP3 derivatives have an `original` field pointing to their source FLAC/SHN.
    // The original files often have title tags that got lost during MP3 derivation.
    const originalTitleMap = new Map<string, string>()
    const originalFiles = metadata.files.filter((f) => f.source === 'original')
    for (const orig of originalFiles) {
      if (orig.title) {
        originalTitleMap.set(orig.name, orig.title)
      }
    }

    // --- Source 3: Parse setlist from description ---
    // Only attempt if some files lack titles
    const needsSetlistFallback = mp3Files.some((f) => {
      if (f.title) return false
      // Check if original has a title via `original` field or extension swap
      if (f.original && originalTitleMap.has(f.original)) return false
      for (const ext of ['.flac', '.shn', '.wav']) {
        if (originalTitleMap.has(f.name.replace(/\.mp3$/i, ext))) return false
      }
      return true
    })

    let trackMapping: Map<string, { songName: string | null; segue: boolean }> | null = null
    if (needsSetlistFallback && metadata.description) {
      const setlist = parseSetlist(metadata.description)
      if (setlist.confident && setlist.songs.length > 0) {
        const filenames = mp3Files.map((f) => f.name)
        const mapped = mapTracksToSetlist(filenames, setlist)
        trackMapping = new Map(
          mapped.map((m) => [m.filename, { songName: m.songName, segue: m.segue }])
        )
      }
    }

    return mp3Files.map((f) => {
      let trackName: string | null = null

      // Source 1: MP3's own title tag
      if (f.title) {
        trackName = f.title
      }

      // Source 2: Original source file's title tag
      if (!trackName) {
        // Try exact original reference first (MP3 derivatives have an `original` field)
        if (f.original && originalTitleMap.has(f.original)) {
          trackName = originalTitleMap.get(f.original)!
        } else {
          // Try matching by replacing extension
          for (const ext of ['.flac', '.shn', '.wav']) {
            const origName = f.name.replace(/\.mp3$/i, ext)
            if (originalTitleMap.has(origName)) {
              trackName = originalTitleMap.get(origName)!
              break
            }
          }
        }
      }

      // Source 3: Setlist parsed from description
      if (!trackName && trackMapping) {
        const mapping = trackMapping.get(f.name)
        if (mapping?.songName) {
          trackName = mapping.songName
          if (mapping.segue) trackName += ' >'
        }
      }

      // Source 4: Filename cleanup (last resort)
      if (!trackName) {
        trackName = cleanFilename(f.name, metadata.creator, metadata.date)
      }

      // Clean up title: remove trailing segue markers for consistent formatting
      // then re-add as " >" if present
      const segueMatch = trackName.match(/^(.+?)\s*>{1,2}\s*$/)
      if (segueMatch) {
        trackName = segueMatch[1].trim() + ' >'
      }

      return {
        id: `${identifier}/${f.name}`,
        name: trackName,
        artistName: f.creator ?? metadata.creator,
        albumName,
        duration: parseDuration(f.length),
        imageUrl: metadata.imageUrl,
        streamUrl: getStreamUrl(identifier, f.name),
      }
    })
  } catch (err) {
    console.error('[Archive] getShowTracks error:', err)
    return []
  }
}

/**
 * Clean up a garbled filename into something more readable.
 * Strips dates, artist codes, taper info, and technical suffixes.
 */
function cleanFilename(filename: string, artist: string, _date: string): string {
  let name = filename.replace(/\.[^.]+$/, '') // Remove extension

  // Remove artist name prefix (case-insensitive)
  if (artist) {
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    name = name.replace(new RegExp(`^${escaped}\\s*[-_.]?\\s*`, 'i'), '')
  }

  // Remove date patterns: "2026-02-10", "02.07.26", "02-07-26"
  name = name.replace(/\d{4}[-_.]\d{2}[-_.]\d{2}/g, '')
  name = name.replace(/\d{2}[-_.]\d{2}[-_.]\d{2,4}/g, '')

  // Remove taper/source codes: ".mk241.cmmt30.vms5u.sd744.16bit"
  name = name.replace(/\.[a-z]{2,8}\d*(?=\.|$)/gi, '')

  // Remove common suffixes: "-16bit", ".flac16", ".sbd", etc.
  name = name.replace(/[-.](?:16bit|24bit|flac\d*|sbd|aud|mtx|shn|matrix)/gi, '')

  // Clean set/track markers into readable form
  name = name.replace(/\bs(\d+)\s*t(\d+)\b/i, 'Set $1 Track $2')
  name = name.replace(/\bset(\d)(\d{2})\b/i, (_, s, t) => `Set ${s} Track ${parseInt(t)}`)
  name = name.replace(/\bd(\d+)t(\d+)\b/i, 'Set $1 Track $2')
  name = name.replace(/[-_]t(\d+)\b/i, (_, t) => `Track ${parseInt(t)}`)

  // Clean up separators and whitespace
  name = name.replace(/[-_.]+/g, ' ')
  name = name.replace(/\s+/g, ' ')
  name = name.trim()

  // If we stripped everything, fall back to original
  if (name.length < 2) {
    name = filename.replace(/\.[^.]+$/, '')
  }

  return name
}

async function searchArtistsSingle(
  query: string
): Promise<{ name: string; showCount: number }[]> {
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

export async function searchArtists(
  query: string
): Promise<{ name: string; showCount: number }[]> {
  const trimmed = query.trim()
  const searches = [searchArtistsSingle(trimmed)]

  // Also search "The {query}" to handle name variations
  if (!/^the\s/i.test(trimmed)) {
    searches.push(searchArtistsSingle(`The ${trimmed}`))
  }

  const allResults = (await Promise.all(searches)).flat()

  // Deduplicate by name, summing show counts
  const merged = new Map<string, number>()
  for (const r of allResults) {
    merged.set(r.name, Math.max(merged.get(r.name) ?? 0, r.showCount))
  }

  return Array.from(merged.entries())
    .map(([name, showCount]) => ({ name, showCount }))
    .sort((a, b) => b.showCount - a.showCount)
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

/**
 * "On This Day" — shows performed on this month+day across all years.
 * Generates OR clauses for each year from startYear to now.
 */
export async function getShowsOnThisDay(
  month: number,
  day: number,
  options?: { rows?: number; startYear?: number }
): Promise<{ shows: ArchiveShow[]; total: number }> {
  const { rows = 12, startYear = 1965 } = options ?? {}
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const currentYear = new Date().getFullYear()

  const dateClauses = []
  for (let y = startYear; y <= currentYear; y++) {
    dateClauses.push(`date:${y}-${mm}-${dd}`)
  }

  const q = `collection:etree AND (${dateClauses.join(' OR ')})`
  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,creator,date,venue,avg_rating,num_reviews,source',
    'sort[]': 'avg_rating desc',
    rows: String(rows),
    output: 'json',
  })

  try {
    const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`)
    if (!res.ok) throw new Error(`Archive on-this-day failed: ${res.status}`)
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []
    const total: number = data?.response?.numFound ?? 0

    const shows: ArchiveShow[] = docs.map((doc) => ({
      identifier: String(doc.identifier ?? ''),
      title: String(doc.title ?? ''),
      artist: String(doc.creator ?? ''),
      date: String(doc.date ?? '').slice(0, 10),
      venue: String(doc.venue ?? ''),
      source: String(doc.source ?? ''),
      rating: typeof doc.avg_rating === 'number' ? doc.avg_rating : undefined,
      reviewCount: typeof doc.num_reviews === 'number' ? doc.num_reviews : undefined,
      imageUrl: getThumbnailUrl(String(doc.identifier ?? '')),
    }))

    return { shows, total }
  } catch (err) {
    console.error('[Archive] getShowsOnThisDay error:', err)
    return { shows: [], total: 0 }
  }
}

/**
 * Recently uploaded shows — sorted by addeddate desc.
 */
export async function getRecentlyAdded(
  options?: { rows?: number }
): Promise<ArchiveShow[]> {
  const { rows = 12 } = options ?? {}
  const params = new URLSearchParams({
    q: 'collection:etree',
    'fl[]': 'identifier,title,creator,date,venue,avg_rating,num_reviews,source',
    'sort[]': 'addeddate desc',
    rows: String(rows),
    output: 'json',
  })

  try {
    const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`)
    if (!res.ok) throw new Error(`Archive recently-added failed: ${res.status}`)
    const data = await res.json()
    const docs: Record<string, unknown>[] = data?.response?.docs ?? []

    return docs.map((doc) => ({
      identifier: String(doc.identifier ?? ''),
      title: String(doc.title ?? ''),
      artist: String(doc.creator ?? ''),
      date: String(doc.date ?? '').slice(0, 10),
      venue: String(doc.venue ?? ''),
      source: String(doc.source ?? ''),
      rating: typeof doc.avg_rating === 'number' ? doc.avg_rating : undefined,
      reviewCount: typeof doc.num_reviews === 'number' ? doc.num_reviews : undefined,
      imageUrl: getThumbnailUrl(String(doc.identifier ?? '')),
    }))
  } catch (err) {
    console.error('[Archive] getRecentlyAdded error:', err)
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
