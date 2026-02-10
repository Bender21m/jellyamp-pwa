# Live Music Archive — MVP Spec

## Overview

A fully isolated add-on for JellyAmp that lets users search, browse, and stream live concert recordings from the Internet Archive's Live Music Archive (etree collection). Zero integration with the user's Jellyfin server.

## Principles

- **100% isolated** — own routes, own store, own API layer. Does not touch Jellyfin.
- **Off by default** — enabled via Settings toggle. Zero impact when disabled.
- **Shared player** — Archive tracks use the same player/queue as Jellyfin (either/or, not mixed). Tracks carry a `streamUrl` field; the audio engine plays it directly.
- **Client-side only** — no accounts, no database. Favorites/pins stored in localStorage via Zustand persist.
- **Beautiful UX** — the Archive's data is rich but their UI is terrible. We make it gorgeous.

---

## Navigation

### Desktop
- Sidebar gets a new section below Library: **"Live Archive"** with a tape/mic icon
- Only visible when feature is enabled in Settings
- Clicking opens `/archive` route

### Mobile
- Accessible from Settings page as a prominent link/card (not in bottom nav)
- Settings → "Live Archive" → opens `/archive`
- Future: consider replacing a nav tab or nesting in Library

---

## Routes

```
/archive                → Archive home (search + pinned artists)
/archive/artist/:id     → Artist page (show listing by year)
/archive/show/:id       → Show detail (setlist, taper info, play)
```

All routes render inside the existing `<main>` area. Player bar works normally.

---

## Internet Archive API

### Search Artists/Shows
```
GET https://archive.org/advancedsearch.php
  ?q=collection:etree AND creator:"{artist}"
  &fl[]=identifier,title,creator,date,venue,avg_rating,num_reviews,source
  &sort[]=date desc
  &rows=50
  &page={page}
  &output=json
```

Optional year filter: add `AND date:{year}*` to query.

### Show Metadata
```
GET https://archive.org/metadata/{identifier}
```

Returns full file listing with track titles, lengths, formats, taper notes.

### Stream Audio
```
https://archive.org/download/{identifier}/{filename}
```

302 redirect to CDN. CORS: `access-control-allow-origin: *`. No auth required.

### Show Thumbnail
```
https://archive.org/services/img/{identifier}
```

Returns the item's thumbnail image.

### No auth, no API keys, no visible rate limits.

---

## Data Model

### ArchiveArtist (pinned/cached locally)
```ts
interface ArchiveArtist {
  name: string           // creator field from API (e.g. "Disco Biscuits")
  imageUrl?: string      // optional, from first show's thumbnail
  showCount?: number     // from search numFound
  pinnedAt: number       // timestamp when pinned
}
```

### ArchiveShow
```ts
interface ArchiveShow {
  identifier: string     // archive.org identifier (e.g. "db2025-12-31.mk4v.cmc1k.r4.flac2496")
  title: string          // full title
  artist: string         // creator
  date: string           // ISO date
  venue: string          // venue name
  source: string         // taper/source info
  rating?: number        // avg_rating
  reviewCount?: number   // num_reviews
  imageUrl: string       // https://archive.org/services/img/{identifier}
}
```

### ArchiveTrack (extends player Track)
```ts
interface ArchiveTrack extends Track {
  streamUrl: string      // direct MP3 URL
  // Track fields:
  // id: identifier + filename
  // name: track title
  // artistName: creator
  // albumName: "date — venue"
  // duration: parsed from length field
  // imageUrl: show thumbnail
}
```

---

## Store: useArchiveStore

Zustand with persist. Completely separate from player/auth/ui stores.

```ts
interface ArchiveState {
  enabled: boolean                    // feature toggle
  pinnedArtists: ArchiveArtist[]      // saved artists for quick access
  favoriteShows: string[]             // show identifiers
  lastSearch: string                  // persist last search query
  
  // Actions
  setEnabled: (enabled: boolean) => void
  pinArtist: (artist: ArchiveArtist) => void
  unpinArtist: (name: string) => void
  toggleFavoriteShow: (identifier: string) => void
  isFavoriteShow: (identifier: string) => boolean
}
```

---

## API Layer: src/lib/archive.ts

```ts
// Search for shows by artist, optional year filter
searchShows(artist: string, options?: { year?: number, page?: number, rows?: number }): Promise<{ shows: ArchiveShow[], total: number }>

// Get full show metadata (tracklist, files, taper info)
getShowMetadata(identifier: string): Promise<ShowMetadata>

// Parse metadata into playable tracks (filter MP3 derivatives, sort by track number)
getShowTracks(identifier: string): Promise<ArchiveTrack[]>

// Get stream URL for a file
getStreamUrl(identifier: string, filename: string): string

// Get all unique artists matching a query (for autocomplete)
searchArtists(query: string): Promise<{ name: string, showCount: number }[]>

// Group shows by date to identify multiple recordings of same show
groupShowsByDate(shows: ArchiveShow[]): Map<string, ArchiveShow[]>
```

### Track Parsing Logic

From metadata `files` array:
1. Filter files where `source === "derivative"` and `format === "VBR MP3"`
2. Sort by `track` number (numeric)
3. Map to ArchiveTrack:
   - `id` = `${identifier}/${filename}`
   - `name` = file's `title` field
   - `duration` = parse `length` field (could be "23:58" or "1438.27")
   - `streamUrl` = `https://archive.org/download/${identifier}/${filename}`
   - `artistName` = file's `creator` or show's creator
   - `albumName` = `${date} — ${venue}`
   - `imageUrl` = `https://archive.org/services/img/${identifier}`

### Multiple Recordings

When multiple shows share the same date:
- Group by date
- Rank by: `avg_rating` (desc), then `num_reviews` (desc), then SBD sources first
- "Best" recording shown by default
- "X other recordings" expandable section

---

## Pages

### Archive Home (`/archive`)

**Layout:**
- Search bar at top (prominent, auto-focus)
- Below search: Pinned Artists grid (if any)
- Search results appear below as artist cards or show list

**Search behavior:**
- Debounced (300ms)
- Searches `collection:etree AND creator:"{query}"`
- Groups results by artist name
- Shows top artists with show count badge

### Artist Page (`/archive/artist/:name`)

**Layout:**
- Artist header: name, total show count, pin/unpin button
- Year filter pills: horizontal scroll of years with show counts
- Show list: cards sorted by date (newest first)
- Each show card: date, venue, source type badge (SBD/AUD/MTX), rating stars, "X recordings" if multiple

**Year filter:**
- Extracted from search results
- Clicking a year filters the list
- "All" pill selected by default

### Show Page (`/archive/show/:identifier`)

**Layout:**
- Header: date, venue, artist, source/taper info
- Show thumbnail (from archive.org/services/img/)
- Quality badge: SBD / AUD / Matrix (parsed from source string)
- Play All button (prominent)
- Setlist: track rows with title + duration
  - `>` in title = segue indicator (visual connector between tracks)
  - Set breaks detected from track naming (s1t01 vs s2t01)
- Favorite show button (heart)
- "Other recordings" expandable (if multiple exist for same date)

**Playing a show:**
- "Play All" calls `setTrack(tracks[0], tracks, 0)` on the player store
- Queue is replaced entirely
- Gapless mode is ideal here (segued jams)

---

## Audio Engine Changes

### Track type extension
Add optional `streamUrl` field to the `Track` interface in `stores/player.ts`:

```ts
export interface Track {
  // ... existing fields ...
  streamUrl?: string  // direct audio URL (for Archive streams, bypasses Jellyfin)
}
```

### Engine change in useAudioEngine.ts
When building the audio source URL:

```ts
// In the track-load effect:
const streamUrl = currentTrack.streamUrl 
  ?? getStreamUrl(serverUrl, trackId, accessToken, audioQuality)
```

That's it. If `streamUrl` exists, use it directly. Otherwise fall back to Jellyfin. One line change.

### Playback reporting
`usePlaybackReporting` should skip reporting when the track has a `streamUrl` (not a Jellyfin track).

---

## Settings Integration

Add to Settings page:

```
Live Music Archive
━━━━━━━━━━━━━━━━━
[Toggle] Enable Live Archive
Stream live concert recordings from the Internet Archive.
Completely separate from your Jellyfin library.

When enabled:
- "Live Archive" appears in the sidebar
- Access 200,000+ live recordings
- Favorites stored locally on this device
```

---

## Design Tokens

Reuse existing JellyAmp design system:
- `bg-deep-black`, `bg-surface`, `bg-card` for backgrounds
- `text-neon-cyan` for active/accent states
- `text-neon-pink` for favorites
- `text-text-primary`, `text-text-secondary`, `text-text-muted` for hierarchy
- Existing TrackRow component for setlist display
- Existing card patterns for show cards
- Waveform component for playback progress

New elements:
- Source badge component: SBD (green), AUD (yellow), MTX (blue)
- Year pill component (reuse FilterPill pattern)
- Segue indicator (`>`) between tracks — subtle connector line

---

## File Structure

```
src/
  lib/
    archive.ts              # API layer
  stores/
    archive.ts              # Zustand store (pinned artists, favorites, settings)
  pages/
    ArchiveHome.tsx          # Search + pinned artists
    ArchiveArtist.tsx        # Artist shows by year
    ArchiveShow.tsx          # Show detail + setlist
  components/
    ArchiveSourceBadge.tsx   # SBD/AUD/MTX badge
    ArchiveShowCard.tsx      # Show card for listings
```

---

## MVP Scope (v1)

**In:**
- Settings toggle
- Search artists/shows
- Artist page with year filtering
- Show page with setlist + play all
- Streaming via shared player
- Pin artists, favorite shows (localStorage)
- Source quality badges
- Multiple recording handling (best + expandable)

**Out (future):**
- Offline caching / download
- Cross-device sync
- Reviews / community features
- FLAC streaming option
- Set break detection from track naming
- Integration with Jellyfin library (import shows)
- Mobile nav integration

---

## Implementation Order

1. **`src/lib/archive.ts`** — API layer + data parsing
2. **`src/stores/archive.ts`** — Zustand store
3. **`Track.streamUrl`** — one-line player store change
4. **`useAudioEngine` streamUrl support** — one-line engine change
5. **`usePlaybackReporting` skip for archive tracks**
6. **`ArchiveHome.tsx`** — search + pinned artists
7. **`ArchiveArtist.tsx`** — show listing with year filter
8. **`ArchiveShow.tsx`** — setlist + play
9. **Sidebar + Settings integration** — nav + toggle
10. **Polish** — loading states, empty states, error handling
