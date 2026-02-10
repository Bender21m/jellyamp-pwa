import { useState, useEffect, useRef } from 'react'
import type { Track } from '../stores/player'
import type { UseTrackSelection } from './useTrackSelection'

interface UseTrackKeyboardOptions {
  tracks: Track[]
  containerRef: React.RefObject<HTMLElement | null>
  selection?: UseTrackSelection
  onPlay: (track: Track, index: number) => void
}

export function useTrackKeyboard({ tracks, containerRef, selection, onPlay }: UseTrackKeyboardOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const isActiveRef = useRef(false)

  // Track whether container has focus
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleFocusIn() { isActiveRef.current = true }
    function handleFocusOut(e: FocusEvent) {
      if (!container!.contains(e.relatedTarget as Node)) {
        isActiveRef.current = false
        setFocusedIndex(null)
      }
    }
    function handleClick(e: MouseEvent) {
      // Activate keyboard nav when clicking inside the track list
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
  }, [containerRef])

  // Scroll focused track into view
  useEffect(() => {
    if (focusedIndex === null || !containerRef.current) return
    const el = containerRef.current.querySelector(`[data-track-index="${focusedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex, containerRef])

  useEffect(() => {
    // Only on desktop
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
            if (prev === null) return 0
            return Math.min(prev + 1, tracks.length - 1)
          })
          isActiveRef.current = true
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setFocusedIndex(prev => {
            if (prev === null) return tracks.length - 1
            return Math.max(prev - 1, 0)
          })
          isActiveRef.current = true
          break
        }
        case 'Home': {
          e.preventDefault()
          setFocusedIndex(0)
          break
        }
        case 'End': {
          e.preventDefault()
          setFocusedIndex(tracks.length - 1)
          break
        }
        case 'Enter': {
          if (focusedIndex !== null && tracks[focusedIndex]) {
            e.preventDefault()
            onPlay(tracks[focusedIndex], focusedIndex)
          }
          break
        }
        case ' ': {
          if (focusedIndex !== null && selection && tracks[focusedIndex]) {
            e.preventDefault()
            // Toggle selection via a synthetic click with ctrl
            const id = tracks[focusedIndex].id
            const newSelected = new Set(selection.selectedIds)
            if (newSelected.has(id)) {
              newSelected.delete(id)
            } else {
              newSelected.add(id)
            }
            // We need to use selectAll since we can't directly set
            selection.selectAll([...newSelected])
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tracks, focusedIndex, selection, onPlay])

  return { focusedIndex, setFocusedIndex }
}
