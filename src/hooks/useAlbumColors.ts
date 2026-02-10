import { useState, useEffect, useRef } from 'react'
import { extractColorsFromImage, type AlbumColors } from '../lib/colorExtract'

// Simple LRU cache for extracted colors
class ColorCache {
  private cache = new Map<string, AlbumColors>()
  private maxSize = 50

  get(key: string): AlbumColors | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: AlbumColors): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }
}

const colorCache = new ColorCache()

export function useAlbumColors(imageUrl?: string): {
  colors: AlbumColors | null
  isLoading: boolean
  error: string | null
} {
  const [colors, setColors] = useState<AlbumColors | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentImageRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!imageUrl) {
      setColors(null)
      setIsLoading(false)
      setError(null)
      currentImageRef.current = undefined
      return
    }

    // Type guard ensures imageUrl is string from here
    const url = imageUrl as string
    
    // Skip if same image
    if (currentImageRef.current === url) return
    currentImageRef.current = url

    // Check cache first
    const cached = colorCache.get(url)
    if (cached) {
      setColors(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    extractColorsFromImage(url)
      .then((extractedColors) => {
        // Only update if this is still the current image
        if (currentImageRef.current === url) {
          setColors(extractedColors)
          colorCache.set(url, extractedColors)
          setIsLoading(false)
        }
      })
      .catch((err: any) => {
        if (currentImageRef.current === url) {
          setError(err?.message || 'Failed to extract colors')
          setIsLoading(false)
          // Fallback colors
          const fallback: AlbumColors = {
            primary: '#8B5CF6',
            secondary: '#00FFDD',
            isDark: true
          }
          setColors(fallback)
        }
      })
  }, [imageUrl])

  return { colors, isLoading, error }
}