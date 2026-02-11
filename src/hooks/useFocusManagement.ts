import { useEffect, useRef, useCallback } from 'react'

interface UseFocusManagementOptions {
  isOpen: boolean
  restoreOnClose?: boolean
  trapFocus?: boolean
}

export function useFocusManagement(options: UseFocusManagementOptions) {
  const { isOpen, restoreOnClose = true, trapFocus = true } = options
  const previousActiveElementRef = useRef<Element | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen && restoreOnClose) {
      previousActiveElementRef.current = document.activeElement
    }
  }, [isOpen, restoreOnClose])

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !trapFocus || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable=true]'
    )
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus first element when modal opens
    firstElement.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: if we're on the first element, wrap to the last
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: if we're on the last element, wrap to the first
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, trapFocus])

  // Restore focus when modal closes
  useEffect(() => {
    return () => {
      if (restoreOnClose && previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isOpen, restoreOnClose])

  // Function to focus the search input specifically
  const focusSearch = useCallback(() => {
    // Find the search input on the page
    const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      // If we're not already on the search page, we might want to navigate there
      // But for now, just focus if it exists
    }
  }, [])

  return {
    containerRef,
    focusSearch,
  }
}