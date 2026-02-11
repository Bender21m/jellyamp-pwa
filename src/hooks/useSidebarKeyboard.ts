import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
}

interface UseSidebarKeyboardOptions {
  navItems: NavItem[]
  isCollapsed: boolean
}

export function useSidebarKeyboard({ navItems, isCollapsed: _isCollapsed }: UseSidebarKeyboardOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const isActiveRef = useRef(false)
  const containerRef = useRef<HTMLElement>(null)

  // Find currently active item index based on location
  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.to))

  // Track whether sidebar has focus
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleFocusIn() {
      isActiveRef.current = true
    }

    function handleFocusOut(e: FocusEvent) {
      if (!container!.contains(e.relatedTarget as Node)) {
        isActiveRef.current = false
        setFocusedIndex(null)
      }
    }

    function handleClick(e: MouseEvent) {
      // Activate keyboard nav when clicking inside the sidebar
      if (container!.contains(e.target as Node)) {
        isActiveRef.current = true
      }
    }

    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)
    document.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('click', handleClick)
    }
  }, [])

  // Focus the active nav item when focused index changes
  useEffect(() => {
    if (focusedIndex === null || !containerRef.current) return
    
    const navLinks = containerRef.current.querySelectorAll('[role="navigation"] a')
    const targetLink = navLinks[focusedIndex] as HTMLElement
    if (targetLink) {
      targetLink.focus()
    }
  }, [focusedIndex])

  useEffect(() => {
    // Only handle keyboard navigation on desktop
    if (window.matchMedia('(hover: none)').matches) return

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (!isActiveRef.current && focusedIndex === null) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setFocusedIndex(prev => {
            if (prev === null) return activeIndex !== -1 ? activeIndex : 0
            return Math.min(prev + 1, navItems.length - 1)
          })
          isActiveRef.current = true
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setFocusedIndex(prev => {
            if (prev === null) return activeIndex !== -1 ? activeIndex : navItems.length - 1
            return Math.max(prev - 1, 0)
          })
          isActiveRef.current = true
          break
        }
        case 'Home': {
          e.preventDefault()
          setFocusedIndex(0)
          isActiveRef.current = true
          break
        }
        case 'End': {
          e.preventDefault()
          setFocusedIndex(navItems.length - 1)
          isActiveRef.current = true
          break
        }
        case 'Enter': {
          if (focusedIndex !== null && navItems[focusedIndex]) {
            e.preventDefault()
            navigate(navItems[focusedIndex].to)
          }
          break
        }
        case ' ': {
          if (focusedIndex !== null && navItems[focusedIndex]) {
            e.preventDefault()
            navigate(navItems[focusedIndex].to)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navItems, focusedIndex, activeIndex, navigate])

  const handleNavItemFocus = useCallback((index: number) => {
    setFocusedIndex(index)
    isActiveRef.current = true
  }, [])

  return {
    containerRef,
    focusedIndex,
    handleNavItemFocus,
  }
}