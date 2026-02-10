/**
 * Extract dominant colors from album art using canvas-based color analysis
 * No external dependencies - uses k-means clustering for color extraction
 */

export interface AlbumColors {
  primary: string
  secondary: string
  isDark: boolean
}

export async function extractColorsFromImage(imageUrl: string): Promise<AlbumColors> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')
        
        // Scale down for performance
        const size = 100
        canvas.width = size
        canvas.height = size
        
        ctx.drawImage(img, 0, 0, size, size)
        const imageData = ctx.getImageData(0, 0, size, size)
        const pixels = imageData.data
        
        // Sample pixels (every 4th pixel to reduce processing)
        const colors: [number, number, number][] = []
        for (let i = 0; i < pixels.length; i += 16) { // every 4th pixel
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]
          
          // Skip transparent/very dark pixels
          if (a < 128 || (r + g + b) < 30) continue
          
          colors.push([r, g, b])
        }
        
        if (colors.length === 0) {
          resolve({ primary: '#8B5CF6', secondary: '#00FFDD', isDark: true })
          return
        }
        
        // Simple k-means to find dominant colors
        const dominantColors = kMeans(colors, 3) // get top 3 colors
        
        // Select the two most vibrant colors
        const sortedColors = dominantColors
          .map(color => ({
            rgb: color,
            saturation: getSaturation(color),
            brightness: getBrightness(color),
            vibrance: getSaturation(color) * getBrightness(color)
          }))
          .sort((a, b) => b.vibrance - a.vibrance)
        
        const primary = rgbToHex(sortedColors[0].rgb)
        const secondary = rgbToHex(sortedColors[1]?.rgb || sortedColors[0].rgb)
        const isDark = sortedColors[0].brightness < 0.5
        
        resolve({ primary, secondary, isDark })
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      resolve({ primary: '#8B5CF6', secondary: '#00FFDD', isDark: true })
    }
    
    img.src = imageUrl
  })
}

// Simple k-means clustering to find dominant colors
function kMeans(colors: [number, number, number][], k: number): [number, number, number][] {
  if (colors.length <= k) return colors
  
  // Initialize centroids randomly
  const centroids: [number, number, number][] = []
  for (let i = 0; i < k; i++) {
    centroids.push(colors[Math.floor(Math.random() * colors.length)])
  }
  
  // Run k-means for a few iterations
  for (let iter = 0; iter < 5; iter++) {
    const clusters: [number, number, number][][] = Array(k).fill(0).map(() => [])
    
    // Assign each color to nearest centroid
    colors.forEach(color => {
      let minDist = Infinity
      let bestCluster = 0
      
      centroids.forEach((centroid, i) => {
        const dist = colorDistance(color, centroid)
        if (dist < minDist) {
          minDist = dist
          bestCluster = i
        }
      })
      
      clusters[bestCluster].push(color)
    })
    
    // Update centroids
    clusters.forEach((cluster, i) => {
      if (cluster.length > 0) {
        const avgR = cluster.reduce((sum, c) => sum + c[0], 0) / cluster.length
        const avgG = cluster.reduce((sum, c) => sum + c[1], 0) / cluster.length
        const avgB = cluster.reduce((sum, c) => sum + c[2], 0) / cluster.length
        centroids[i] = [Math.round(avgR), Math.round(avgG), Math.round(avgB)]
      }
    })
  }
  
  return centroids.filter(c => c != null)
}

function colorDistance([r1, g1, b1]: [number, number, number], [r2, g2, b2]: [number, number, number]): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function getSaturation([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const diff = max - min
  return max === 0 ? 0 : diff / max
}

function getBrightness([r, g, b]: [number, number, number]): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}