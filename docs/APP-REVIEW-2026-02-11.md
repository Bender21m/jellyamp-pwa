# JellyAmp App Review — 2026-02-11 (Grafton's Voice Notes)

## Issues Found (in order of review)

### 1. jellyamp.com — URL bar covers "Open Web App" button on mobile
- On iPhone 17 Pro, browser URL bar overlaps the CTA button on first load

### 2. Connect screen — no instructions
- Login page says "JellyAmp — Your Music Everywhere" but doesn't tell user what to do
- Needs: "Enter your Jellyfin server URL below to get started"

### 3. Connect screen — requires https:// prefix
- Typing just the URL without `https://` fails
- Should auto-prepend https:// or handle gracefully

### 4. Library grid — adjustable grid density
- Currently 2 columns on mobile
- Would like option for 3 or 4 columns (smaller cards, more visible)

### 5. Artist detail — slow loading / caching issues
- Tapping Disco Biscuits: waited 5+ seconds, had to force refresh
- 81 albums loading all at once causes slowness
- Needs: infinite scroll / lazy loading (load 15-20 at a time, load more on scroll)

### 6. Year filter UX — not obvious you can swipe
- Looks smooth and polished but new users may not know they can swipe left/right
- Needs subtle affordance hint

### 7. List view text too small
- Album names in list view are hard to read on mobile
- (Partly file naming issue but font size could help)

### 8. Three-dot menu — too dim
- Track row three-dot menu needs to be slightly brighter

### 9. Mini player / nav bar separation
- Border between mini player and bottom nav (Library/Search/Favorites/History/Settings) looks off
- Icons bleed into the player area — needs clearer visual separation

### 10. Radio button state in Now Playing — confusing
- Radio button highlighted in cyan when opening Now Playing but unclear what it does
- Toggle on/off doesn't show visible effect — needs explanation or better UX

### 11. Queue drag reorder on mobile
- Can't reorder queue items by dragging on mobile
- Important for non-live-concert listening
- Should be easy to drag but not too sensitive

### 12. Queue close behavior — closes Now Playing too
- Opening queue from Now Playing then closing queue → closes entire Now Playing
- Expected: closing queue should return to Now Playing, not minimize completely

### 13. Favorites — missing images for some artists
- Jerry Garcia Band shows image, Disco Biscuits doesn't
- Inconsistent image loading

### 14. Favorites — needs sort options
- No list/grid view toggle
- No distinction between favorite albums vs favorite artists

### 15. History — viewport/scroll issues on mobile
- Screen isn't locked — feels like moving a webpage
- Easy to accidentally zoom in/out
- Scroll feels finicky, accidentally triggers clicks
- Needs viewport zoom lock

### 16. Live Archive — needs mobile nav access
- Archive is currently only accessible from desktop sidebar or Settings
- Needs to be in the mobile bottom nav bar or easily accessible from Library
