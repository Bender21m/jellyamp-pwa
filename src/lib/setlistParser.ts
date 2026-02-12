/**
 * Setlist parser for Archive.org show descriptions.
 * Parses HTML descriptions containing setlists and maps them to track files.
 *
 * Handles common formats:
 * - Numbered: "01. Song Name" or "01.Song Name" or "1. Song Name"
 * - Plain lines: one song per line/div
 * - Set markers: "Set 1", "Set1", "Set I", "Set II", "Encore"
 * - Segue markers: ">", "->", "&gt;"
 */

export interface ParsedSong {
  /** Original song name as parsed */
  name: string
  /** Set number (1, 2, 3...) or 0 for encore */
  set: number
  /** Position within the set (1-indexed) */
  position: number
  /** Whether this segues into the next song */
  segue: boolean
}

export interface SetlistMapping {
  /** Parsed songs in order */
  songs: ParsedSong[]
  /** Whether we're confident enough to apply this mapping */
  confident: boolean
  /** Reason if not confident */
  reason?: string
}

// --- HTML to text ---

function stripHtml(html: string): string {
  // Replace <br>, <br/>, <br /> with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n')
  // Replace </div>, </p>, </li> with newlines
  text = text.replace(/<\/(?:div|p|li)>/gi, '\n')
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '')
  // Decode common entities
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&#x27;/g, "'")
  text = text.replace(/&quot;/g, '"')
  return text
}

// --- Set marker detection ---

const SET_PATTERNS = [
  /^set\s*(?:one|1|i)$/i,
  /^set\s*(?:two|2|ii)$/i,
  /^set\s*(?:three|3|iii)$/i,
  /^encore$/i,
  /^e(?:nc)?:?$/i,
]

function detectSetMarker(line: string): { isSet: true; setNum: number } | { isSet: false } {
  const trimmed = line.trim()

  if (/^set\s*(?:one|1|i)\b/i.test(trimmed)) return { isSet: true, setNum: 1 }
  if (/^set\s*(?:two|2|ii)\b/i.test(trimmed)) return { isSet: true, setNum: 2 }
  if (/^set\s*(?:three|3|iii)\b/i.test(trimmed)) return { isSet: true, setNum: 3 }
  if (/^encore\b/i.test(trimmed)) return { isSet: true, setNum: 0 }
  if (/^e(?:nc)?:?\s*$/i.test(trimmed)) return { isSet: true, setNum: 0 }

  return { isSet: false }
}

// --- Song name cleaning ---

function cleanSongName(raw: string): { name: string; segue: boolean } {
  let name = raw.trim()
  let segue = false

  // Remove leading track numbers: "01. ", "1. ", "01 ", "01.", etc.
  name = name.replace(/^\d{1,2}[\.\)]\s*/, '')
  name = name.replace(/^\d{1,2}\s+(?=[A-Z])/, '')

  // Detect and remove trailing segue markers
  if (/\s*-?>?\s*$/.test(name) && name.replace(/\s*-?>?\s*$/, '').length > 0) {
    // Only strip if there's actual content before the >
    const stripped = name.replace(/\s*-?>+\s*$/, '')
    if (stripped.length > 0 && stripped.length < name.length) {
      segue = true
      name = stripped
    }
  }

  // Also check for leading > from previous segue
  name = name.replace(/^>\s*/, '')

  name = name.trim()
  return { name, segue }
}

// --- Lines that are NOT songs ---

function isNoiseLine(line: string): boolean {
  const l = line.trim().toLowerCase()
  if (l.length === 0) return true
  if (l.length > 120) return true // Too long to be a song name

  // Source/taper info patterns
  if (/^source/i.test(l)) return true
  if (/^recorded/i.test(l)) return true
  if (/^taper/i.test(l)) return true
  if (/^lineage/i.test(l)) return true
  if (/^transfer/i.test(l)) return true
  if (/^location/i.test(l)) return true
  if (/^patron/i.test(l)) return true
  if (/^note/i.test(l)) return true
  if (/^shn/i.test(l)) return true
  if (/^\*\s*=/.test(l)) return true // "* = with guest on guitar"
  if (/^mic/i.test(l) && /position|pattern|config/i.test(l)) return true

  // Technical recording info
  if (/(?:flac|shn|wav|mp3|ogg|16bit|24bit|48k|44\.1k)/i.test(l) && l.length < 80) return true
  if (/(?:audacity|cdwav|tlh|shntool|mkw|sox)/i.test(l)) return true
  if (/(?:akg|neumann|schoeps|dpa|sennheiser|sony ecm|oktava)/i.test(l) && /\d/.test(l)) return true

  // Date/venue lines (often appear before setlist)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(l)) return true

  return false
}

// --- Header/metadata line detection ---

function isHeaderLine(line: string, allLines: string[]): boolean {
  const l = line.trim()

  // Date patterns: "02/07/26", "2026-02-07", "February 7, 2026"
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(l)) return true
  if (/^\d{4}-\d{2}-\d{2}$/.test(l)) return true

  // "Artist - MM/DD/YY" pattern
  if (/\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l)) return true

  // Common venue/location patterns (only at the start of the description)
  const lineIdx = allLines.indexOf(line)
  if (lineIdx >= 0 && lineIdx < 4) {
    // First few lines are often: artist, date, venue, city/state
    if (/^[A-Z][a-z]+,\s*[A-Z]{2}$/.test(l)) return true // "Burlington, VT"
    if (/^(?:So\.|North|South|East|West|Ft\.|St\.|Mt\.)\s/i.test(l) && l.length < 40) return true
  }

  return false
}

// --- Main parser ---

export function parseSetlist(description: string): SetlistMapping {
  if (!description || description.trim().length === 0) {
    return { songs: [], confident: false, reason: 'empty description' }
  }

  const text = stripHtml(description)
  const rawLines = text.split('\n').map((l) => l.trim())

  // First pass: find set markers and blank-line groups
  // If no explicit set markers, use blank lines as set separators
  const hasExplicitSets = rawLines.some((l) => detectSetMarker(l).isSet)

  const songs: ParsedSong[] = []
  let currentSet = 1
  let positionInSet = 0
  let foundAnySong = false
  let consecutiveBlanks = 0
  let songsSinceLastBreak = 0

  for (const line of rawLines) {
    // Track blank lines for implicit set breaks
    if (line.length === 0) {
      consecutiveBlanks++
      // If we've found songs and hit a blank line, this might be a set break
      if (!hasExplicitSets && songsSinceLastBreak > 0 && consecutiveBlanks >= 1) {
        // Will be applied on next song
      }
      continue
    }

    if (isNoiseLine(line)) { consecutiveBlanks = 0; continue }
    if (isHeaderLine(line, rawLines)) { consecutiveBlanks = 0; continue }

    // Check for set markers
    const setCheck = detectSetMarker(line)
    if (setCheck.isSet) {
      currentSet = setCheck.setNum
      positionInSet = 0
      consecutiveBlanks = 0
      songsSinceLastBreak = 0
      continue
    }

    // Try to parse as a song
    const { name, segue } = cleanSongName(line)
    if (name.length === 0 || name.length < 2) { consecutiveBlanks = 0; continue }

    // Implicit set break: blank line(s) between song groups (no explicit markers)
    if (!hasExplicitSets && consecutiveBlanks > 0 && songsSinceLastBreak > 2) {
      currentSet++
      positionInSet = 0
      songsSinceLastBreak = 0
    }

    positionInSet++
    foundAnySong = true
    songsSinceLastBreak++
    consecutiveBlanks = 0

    songs.push({
      name,
      set: currentSet,
      position: positionInSet,
      segue,
    })
  }

  if (!foundAnySong) {
    return { songs: [], confident: false, reason: 'no songs found in description' }
  }

  return { songs, confident: true }
}

// --- Track number extraction from filenames ---

interface TrackId {
  /** Set number (0 if not specified) */
  set: number
  /** Track number within the set */
  track: number
}

function extractTrackNumber(filename: string): TrackId | null {
  const name = filename.replace(/\.[^.]+$/, '') // Remove extension

  // Pattern: "s1 t01" or "s1t01" or "s1_t01"
  const setTrack = name.match(/s(\d+)\s*[_-]?\s*t(\d+)/i)
  if (setTrack) return { set: parseInt(setTrack[1], 10), track: parseInt(setTrack[2], 10) }

  // Pattern: "set101" "set102" "set201" (set + 2-digit track)
  const setConcat = name.match(/set(\d)(\d{2})/i)
  if (setConcat) return { set: parseInt(setConcat[1], 10), track: parseInt(setConcat[2], 10) }

  // Pattern: "d1t01" or "d2t03" (disc/set + track)
  const discTrack = name.match(/d(\d+)\s*t(\d+)/i)
  if (discTrack) return { set: parseInt(discTrack[1], 10), track: parseInt(discTrack[2], 10) }

  // Pattern: just "t01" or "-t01"
  const justTrack = name.match(/[^a-z]t(\d+)/i)
  if (justTrack) return { set: 0, track: parseInt(justTrack[1], 10) }

  // Pattern: leading number "01 " or "01." (but NOT dates like "2026-02-10")
  const leadNum = name.match(/^(\d{1,2})[\s.\-_]/)
  if (leadNum) {
    const num = parseInt(leadNum[1], 10)
    if (num > 0 && num < 50) return { set: 0, track: num }
  }

  return null
}

// --- Map tracks to songs ---

export interface MappedTrack {
  /** Original filename */
  filename: string
  /** Mapped song name (or null if no mapping) */
  songName: string | null
  /** Whether this segues into next track */
  segue: boolean
}

export function mapTracksToSetlist(
  filenames: string[],
  setlist: SetlistMapping
): MappedTrack[] {
  if (!setlist.confident || setlist.songs.length === 0) {
    return filenames.map((f) => ({ filename: f, songName: null, segue: false }))
  }

  // Extract track IDs from filenames
  const trackIds = filenames.map((f) => ({
    filename: f,
    id: extractTrackNumber(f),
  }))

  // Check if files have set info
  const hasSetInfo = trackIds.some((t) => t.id && t.id.set > 0)

  // Build a flat ordered song list
  const flatSongs = [...setlist.songs]

  if (hasSetInfo) {
    // Figure out how many sets exist in files vs setlist
    const fileSets = new Set(trackIds.filter((t) => t.id).map((t) => t.id!.set))
    const songSets = new Set(flatSongs.map((s) => s.set))
    const maxFileSet = Math.max(...fileSets)

    // Map by set + position
    return trackIds.map(({ filename, id }) => {
      if (!id) return { filename, songName: null, segue: false }

      // Direct match
      let song = flatSongs.find(
        (s) => s.set === id.set && s.position === id.track
      )
      if (song) return { filename, songName: song.name, segue: song.segue }

      // Encore handling: if setlist has more sets than files,
      // extra setlist sets (encore) might be appended to the last file set
      // e.g., files have s1+s2, setlist has set1+set2+set3(encore)
      if (id.set === maxFileSet) {
        // Count tracks in this file set
        const tracksInFileSet = trackIds.filter((t) => t.id?.set === id.set).length
        // Count songs in matching setlist set
        const songsInSet = flatSongs.filter((s) => s.set === id.set).length
        // If track number exceeds songs in this set, overflow into next set(s)
        if (id.track > songsInSet) {
          let overflow = id.track - songsInSet
          for (const nextSet of [...songSets].sort((a, b) => a - b)) {
            if (nextSet <= id.set) continue
            const nextSongs = flatSongs.filter((s) => s.set === nextSet)
            if (overflow <= nextSongs.length) {
              song = nextSongs[overflow - 1]
              if (song) return { filename, songName: song.name, segue: song.segue }
            }
            overflow -= nextSongs.length
          }
        }
      }

      return { filename, songName: null, segue: false }
    })
  }

  // No set info — map sequentially by track number
  // First, sort by track number
  const sorted = [...trackIds].sort((a, b) => {
    const aTrack = a.id?.track ?? 999
    const bTrack = b.id?.track ?? 999
    return aTrack - bTrack
  })

  // Check if track count roughly matches song count
  const trackCount = sorted.filter((t) => t.id !== null).length
  const songCount = flatSongs.length

  // Allow some slack: tracks might have extra files (tuning, crowd noise, etc.)
  // But if the difference is too large, don't map
  if (trackCount > 0 && Math.abs(trackCount - songCount) > Math.max(3, songCount * 0.3)) {
    return filenames.map((f) => ({ filename: f, songName: null, segue: false }))
  }

  // Build mapping: track number -> song index (0-based)
  // If tracks are numbered 1-N, map directly to song index
  const result: Map<string, MappedTrack> = new Map()

  for (const { filename, id } of sorted) {
    if (!id) {
      result.set(filename, { filename, songName: null, segue: false })
      continue
    }

    const songIdx = id.track - 1
    if (songIdx >= 0 && songIdx < flatSongs.length) {
      const song = flatSongs[songIdx]
      result.set(filename, { filename, songName: song.name, segue: song.segue })
    } else {
      result.set(filename, { filename, songName: null, segue: false })
    }
  }

  // Return in original order
  return filenames.map((f) => result.get(f) ?? { filename: f, songName: null, segue: false })
}

/**
 * Check if a filename already contains a meaningful song name
 * (i.e., it's NOT a garbled taper filename)
 */
export function filenameHasSongName(filename: string): boolean {
  const name = filename.replace(/\.[^.]+$/, '') // Remove extension

  // If it's mostly alphanumeric codes, dates, or taper info — it's garbled
  // Garbled patterns: "moe2014-02-12.mk241.cmmt30.vms5u.sd744.16bit-t01"
  // Good patterns: "02 Foolish Heart" or "Foolish Heart"

  // Check if it's mostly dots and codes
  if (/^[a-z]+\d{4}[-.]/.test(name)) return false // starts with "artist+date"
  if (/\.\w{3,8}\.\w{3,8}\./.test(name)) return false // multiple dot-separated codes

  // Check if removing numbers/punctuation leaves a reasonable word
  const words = name.replace(/[\d._\-]/g, ' ').trim().split(/\s+/).filter((w) => w.length > 2)
  return words.length >= 1
}
