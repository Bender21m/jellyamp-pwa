import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export interface UseTrackSelection {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  handleClick: (id: string, index: number, event: React.MouseEvent) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
}

export function useTrackSelection(trackIds: string[]): UseTrackSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)
  const location = useLocation()

  // Clear selection on navigation - legitimate UI state reset
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set())
     
    setLastClickedIndex(null)
  }, [location.pathname])

  // Clear selection on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
        setLastClickedIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const handleClick = useCallback((id: string, index: number, event: React.MouseEvent) => {
    // Only on desktop (hover devices)
    if (window.matchMedia('(hover: none)').matches) return

    const isMetaKey = event.metaKey || event.ctrlKey
    const isShiftKey = event.shiftKey

    if (!isMetaKey && !isShiftKey) return // No modifier = normal click, don't intercept

    event.preventDefault()
    event.stopPropagation()

    if (isShiftKey && lastClickedIndex !== null) {
      // Range select
      const start = Math.min(lastClickedIndex, index)
      const end = Math.max(lastClickedIndex, index)
      const newSelected = new Set(selectedIds)
      for (let i = start; i <= end; i++) {
        if (trackIds[i]) newSelected.add(trackIds[i])
      }
      setSelectedIds(newSelected)
    } else if (isMetaKey) {
      // Toggle individual
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      setSelectedIds(newSelected)
      setLastClickedIndex(index)
    }
  }, [selectedIds, lastClickedIndex, trackIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastClickedIndex(null)
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  return { selectedIds, isSelected, handleClick, clearSelection, selectAll }
}
