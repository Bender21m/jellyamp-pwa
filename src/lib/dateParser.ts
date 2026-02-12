/**
 * Parse dates from live recording album names
 * Returns null if no date pattern is found (graceful fallback for studio albums)
 */
export function parseShowDate(albumName: string): Date | null {
  if (!albumName) return null;

  // Common date patterns to match
  const patterns = [
    // ISO format: 2024-03-15, 2024.03.15
    /(\d{4})[-.](\d{1,2})[-.](\d{1,2})/,
    // US format: 03/15/2024, 3/15/2024, 03-15-2024
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    // Short year: 3-15-24, 03-15-24
    /(\d{1,2})[-](\d{1,2})[-](\d{2})/,
    // Month name formats: March 15, 2024; Mar 15, 2024
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
    // Reverse month name: 15 March 2024, 15 Mar 2024
    /(\d{1,2})\s+(\w+)\s+(\d{4})/,
  ];

  const monthNames = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  };

  for (const pattern of patterns) {
    const match = albumName.match(pattern);
    if (match) {
      let year: number = 0, month: number = 0, day: number = 0;

      // ISO format: 2024-03-15
      if (pattern === patterns[0]) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      }
      // US format: 03/15/2024
      else if (pattern === patterns[1]) {
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      // Short year: 3-15-24
      else if (pattern === patterns[2]) {
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
        // Convert 2-digit year to 4-digit (assume 2000s)
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      // Month name format: March 15, 2024
      else if (pattern === patterns[3]) {
        const monthName = match[1].toLowerCase();
        month = monthNames[monthName as keyof typeof monthNames];
        if (!month) continue; // Invalid month name
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      // Reverse month name: 15 March 2024
      else if (pattern === patterns[4]) {
        day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        month = monthNames[monthName as keyof typeof monthNames];
        if (!month) continue; // Invalid month name
        year = parseInt(match[3]);
      }

      // Validate the date
      if (year && month && day && 
          year >= 1900 && year <= new Date().getFullYear() + 1 &&
          month >= 1 && month <= 12 &&
          day >= 1 && day <= 31) {
        
        const date: Date = new Date(year, month - 1, day); // month is 0-indexed
        
        // Verify the date is actually valid (handles Feb 30, etc.)
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date;
        }
      }
    }
  }

  return null;
}

/**
 * Format a show date for display
 */
export function formatShowDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}