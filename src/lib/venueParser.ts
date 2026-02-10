import type { BaseItemDto } from './jellyfin'

/**
 * Parse venue/location information from Jellyfin album metadata
 * Returns null if no venue data is found (graceful for studio albums)
 */
export function parseVenue(album: BaseItemDto): string | null {
  if (!album) return null

  // 1. Check Studios array (sometimes contains venue names for live recordings)
  if (album.Studios && album.Studios.length > 0) {
    const studio = album.Studios[0].Name
    if (studio && isLikelyVenue(studio)) {
      return studio
    }
  }

  // 2. Check ProductionLocations array
  if (album.ProductionLocations && album.ProductionLocations.length > 0) {
    return album.ProductionLocations[0]
  }

  // 3. Parse venue from Tags array
  if (album.Tags && album.Tags.length > 0) {
    for (const tag of album.Tags) {
      if (isLikelyVenue(tag)) {
        return tag
      }
    }
  }

  // 4. Parse venue from album name patterns
  const albumName = album.Name ?? ''
  const venueFromName = parseVenueFromName(albumName)
  if (venueFromName) {
    return venueFromName
  }

  return null
}

/**
 * Parse venue from album name using common live recording patterns
 */
function parseVenueFromName(albumName: string): string | null {
  if (!albumName) return null

  // Common patterns for live recordings
  const patterns = [
    // "Live at [Venue]"
    /Live\s+at\s+(.+?)(?:\s+\d{4}|\s*$)/i,
    // "@ [Venue]" or "at [Venue]"
    /(?:@|at)\s+(.+?)(?:\s+\d{4}|\s*$)/i,
    // "[Date] - [Venue]" or "[Venue] - [Date]"
    /(?:\d{4}[-./]\d{1,2}[-./]\d{1,2})\s*[-–]\s*(.+)|(.+)\s*[-–]\s*(?:\d{4}[-./]\d{1,2}[-./]\d{1,2})/i,
    // "Live from [Venue]"
    /Live\s+from\s+(.+?)(?:\s+\d{4}|\s*$)/i,
    // "Recorded at [Venue]"
    /Recorded\s+at\s+(.+?)(?:\s+\d{4}|\s*$)/i,
    // "[Venue], [Date]" or "[Date], [Venue]"
    /^(.+?),\s*\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{4}[-./]\d{1,2}[-./]\d{1,2},\s*(.+?)$/i,
    // "Concert at [Venue]"
    /Concert\s+at\s+(.+?)(?:\s+\d{4}|\s*$)/i,
  ]

  for (const pattern of patterns) {
    const match = albumName.match(pattern)
    if (match) {
      // Get the captured group (venue name)
      const venue = match[1] || match[2]
      if (venue && venue.trim()) {
        const cleanVenue = cleanVenueName(venue.trim())
        if (cleanVenue && isLikelyVenue(cleanVenue)) {
          return cleanVenue
        }
      }
    }
  }

  return null
}

/**
 * Clean and normalize venue names
 */
function cleanVenueName(venue: string): string {
  return venue
    // Remove common prefixes/suffixes
    .replace(/^(Live at|at|@|\bon\b)\s+/i, '')
    .replace(/\s+(Live|Concert|Show)$/i, '')
    // Remove extra whitespace and punctuation
    .replace(/[,;]\s*$/, '')
    .trim()
}

/**
 * Check if a string is likely to be a venue name (not just a generic tag)
 */
function isLikelyVenue(text: string): boolean {
  if (!text || text.length < 3) return false
  
  // Skip common non-venue tags
  const skipTags = [
    'live', 'concert', 'performance', 'recording', 'album',
    'music', 'band', 'artist', 'song', 'track', 'audio',
    'rock', 'pop', 'jazz', 'blues', 'folk', 'country',
    'studio', 'original', 'remaster', 'deluxe', 'bonus',
    'bootleg', 'unofficial', 'rare', 'unreleased',
    'compilation', 'collection', 'anthology', 'greatest',
    'best', 'hits', 'singles', 'b-sides', 'demos',
  ]
  
  const lowerText = text.toLowerCase()
  
  // Skip if it's just a generic tag
  if (skipTags.includes(lowerText)) return false
  
  // Skip if it's just a year
  if (/^\d{4}$/.test(text)) return false
  
  // Skip if it's just a date
  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/.test(text)) return false
  
  // Accept if it contains venue-like keywords
  const venueKeywords = [
    'hall', 'theater', 'theatre', 'arena', 'stadium', 'center', 'centre',
    'auditorium', 'pavilion', 'club', 'bar', 'pub', 'cafe', 'restaurant',
    'festival', 'garden', 'park', 'square', 'room', 'stage', 'dome',
    'amphitheatre', 'amphitheater', 'coliseum', 'opera', 'ballroom',
    'casino', 'hotel', 'palace', 'church', 'cathedral', 'abbey',
    'university', 'college', 'school', 'library', 'museum',
  ]
  
  if (venueKeywords.some(keyword => lowerText.includes(keyword))) {
    return true
  }
  
  // Accept if it looks like a proper name (capitalized words)
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*/.test(text)) {
    return true
  }
  
  return false
}