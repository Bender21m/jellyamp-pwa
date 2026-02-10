import type { Track } from '../stores/player'

interface SetBreak {
  position: number // Insert before this track index
  label: string
}

/**
 * Detect set breaks in a track listing based on track names and patterns
 * Returns array of positions where set break indicators should be inserted
 */
export function detectSetBreaks(tracks: Track[]): SetBreak[] {
  const breaks: SetBreak[] = []

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    const trackName = track.name.toLowerCase().trim()
    
    // Common set break patterns
    const setPatterns = [
      { regex: /^set\s*2/i, label: 'SET 2' },
      { regex: /^set\s*ii/i, label: 'SET 2' },
      { regex: /^set\s*3/i, label: 'SET 3' },
      { regex: /^set\s*iii/i, label: 'SET 3' },
      { regex: /^set\s*4/i, label: 'SET 4' },
      { regex: /^set\s*iv/i, label: 'SET 4' },
      { regex: /^encore/i, label: 'ENCORE' },
      { regex: /^e:/i, label: 'ENCORE' },
      { regex: /^intermission/i, label: 'INTERMISSION' },
      { regex: /^set\s*break/i, label: 'SET BREAK' },
      { regex: /^second\s*set/i, label: 'SET 2' },
      { regex: /^third\s*set/i, label: 'SET 3' },
    ]

    // Check for explicit set markers in track names
    for (const pattern of setPatterns) {
      if (pattern.regex.test(trackName)) {
        // Only add if this isn't the first track and we haven't already added a break here
        if (i > 0 && !breaks.some(b => b.position === i)) {
          breaks.push({
            position: i,
            label: pattern.label
          })
        }
        break // Found a match, don't check other patterns
      }
    }

    // Check for significant gaps in track numbering (suggests set breaks)
    if (i > 0 && track.indexNumber && tracks[i - 1].indexNumber) {
      const currentIndex = track.indexNumber
      const prevIndex = tracks[i - 1].indexNumber!
      
      // If there's a gap of 10+ in track numbering, suggest a set break
      if (currentIndex - prevIndex >= 10) {
        // Only add if we haven't already added a break at this position
        if (!breaks.some(b => b.position === i)) {
          // Try to determine which set this might be based on track number
          let setLabel = 'SET 2'
          if (currentIndex >= 200) setLabel = 'SET 3'
          else if (currentIndex >= 300) setLabel = 'SET 4'
          
          breaks.push({
            position: i,
            label: setLabel
          })
        }
      }
    }
  }

  // Sort breaks by position to ensure they're in order
  return breaks.sort((a, b) => a.position - b.position)
}

/**
 * Check if any set breaks exist in the track listing
 * Used to determine if set break features should be enabled
 */
export function hasSetBreaks(tracks: Track[]): boolean {
  return detectSetBreaks(tracks).length > 0
}