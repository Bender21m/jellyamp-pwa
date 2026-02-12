import { useState, useEffect } from 'react'
import { getCacheSize, clearAllCache, formatCacheSize } from '../../lib/offlineCache'

export default function CacheSettings() {
  const [cacheSize, setCacheSize] = useState(0)
  const [clearingCache, setClearingCache] = useState(false)

  // Load cache size on component mount
  useEffect(() => {
    loadCacheSize()
  }, [])

  async function loadCacheSize() {
    try {
      const size = await getCacheSize()
      setCacheSize(size)
    } catch (error) {
      console.error('Failed to get cache size:', error)
    }
  }

  async function handleClearCache() {
    setClearingCache(true)
    try {
      await clearAllCache()
      setCacheSize(0)
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setClearingCache(false)
    }
  }

  return (
    <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
      <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Offline Cache</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center min-h-[44px]">
          <span className="text-text-secondary text-sm">Cache Size</span>
          <span className="text-sm font-mono text-neon-cyan">{formatCacheSize(cacheSize)}</span>
        </div>
        <button
          onClick={handleClearCache}
          disabled={clearingCache || cacheSize === 0}
          className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearingCache ? 'Clearing...' : 'Clear Cache'}
        </button>
      </div>
      <p className="text-xs text-text-muted/60 mt-3 px-1">
        Albums downloaded for offline playback are cached locally. Use "Available Offline" on album pages to download tracks.
      </p>
    </section>
  )
}