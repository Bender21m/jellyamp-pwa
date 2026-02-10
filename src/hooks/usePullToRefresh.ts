import { useRef, useCallback, useState, useEffect } from 'react'

interface PullToRefreshState {
  startY: number
  currentY: number
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
}

interface PullToRefreshConfig {
  threshold?: number
  onRefresh: () => Promise<void> | void
  disabled?: boolean
}

const DEFAULT_THRESHOLD = 60

export function usePullToRefresh({ threshold = DEFAULT_THRESHOLD, onRefresh, disabled = false }: PullToRefreshConfig) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isAtTop, setIsAtTop] = useState(true)
  
  const pullState = useRef<PullToRefreshState>({
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0
  })

  const containerRef = useRef<HTMLElement | null>(null)

  // Check if we're at the top of the scroll container
  const checkScrollTop = useCallback(() => {
    if (!containerRef.current) return
    const isTop = containerRef.current.scrollTop === 0
    setIsAtTop(isTop)
  }, [])

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollTop)
    checkScrollTop() // Initial check

    return () => {
      container.removeEventListener('scroll', checkScrollTop)
    }
  }, [checkScrollTop])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isAtTop || e.touches.length !== 1) return

    const touch = e.touches[0]
    pullState.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0
    }
  }, [disabled, isAtTop])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isAtTop || e.touches.length !== 1) return
    
    const touch = e.touches[0]
    const deltaY = touch.clientY - pullState.current.startY
    
    // Only pull down
    if (deltaY <= 0) return

    pullState.current.currentY = touch.clientY
    pullState.current.isPulling = true
    
    // Apply resistance to the pull
    const resistance = 0.5
    const adjustedDistance = deltaY * resistance
    
    pullState.current.pullDistance = adjustedDistance
    setPullDistance(adjustedDistance)

    // Prevent default scrolling when pulling
    if (adjustedDistance > 10) {
      e.preventDefault()
    }
  }, [disabled, isAtTop])

  const handleTouchEnd = useCallback(async (_e: React.TouchEvent) => {
    if (!pullState.current.isPulling) return

    const distance = pullState.current.pullDistance

    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    // Reset state
    pullState.current.isPulling = false
    pullState.current.pullDistance = 0
    setPullDistance(0)
  }, [threshold, isRefreshing, onRefresh])

  const handleTouchCancel = useCallback(() => {
    pullState.current.isPulling = false
    pullState.current.pullDistance = 0
    setPullDistance(0)
  }, [])

  const isPulling = pullState.current.isPulling
  const shouldShowIndicator = isPulling && pullDistance > 10
  const shouldTrigger = pullDistance >= threshold

  return {
    containerRef: (element: HTMLElement | null) => {
      containerRef.current = element
    },
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel
    },
    isRefreshing,
    isPulling: shouldShowIndicator,
    pullDistance,
    shouldTrigger,
    progress: Math.min(pullDistance / threshold, 1)
  }
}