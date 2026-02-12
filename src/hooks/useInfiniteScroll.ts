import { useRef, useEffect } from 'react'

interface UseInfiniteScrollOptions {
  hasMore: boolean
  loadMore: () => void
  rootMargin?: string
}

export function useInfiniteScroll({ hasMore, loadMore, rootMargin = '200px' }: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin }
    )
    
    observer.observe(sentinelRef.current)
    
    return () => observer.disconnect()
  }, [hasMore, loadMore, rootMargin])
  
  return sentinelRef
}