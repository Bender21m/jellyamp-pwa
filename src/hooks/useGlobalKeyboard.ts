import { useEffect, useCallback } from 'react'

interface UseGlobalKeyboardOptions {
  volume: number
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  onMute: () => void
  onVolumeChange: (vol: number) => void
  onSeekBackward: () => void
  onSeekForward: () => void
  onToggleFullscreen: () => void
  onCloseModal: () => void
  onFocusSearch: () => void
  onShowShortcuts: () => void
}

export function useGlobalKeyboard(options: UseGlobalKeyboardOptions) {
  const {
    volume,
    onToggle,
    onNext,
    onPrevious,
    onMute,
    onVolumeChange,
    onSeekBackward,
    onSeekForward,
    onToggleFullscreen,
    onCloseModal,
    onFocusSearch,
    onShowShortcuts,
  } = options

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement?.getAttribute('contenteditable') === 'true'
    )
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard events when user is typing in an input
      if (isInputFocused()) {
        // Special exception: allow Escape to close modals even when in inputs
        if (e.key === 'Escape') {
          onCloseModal()
        }
        return
      }

      switch (true) {
        // Play/pause
        case e.code === 'Space':
          e.preventDefault()
          onToggle()
          break

        // Seek backward/forward
        case e.code === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey:
          e.preventDefault()
          onSeekBackward()
          break

        case e.code === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey:
          e.preventDefault()
          onSeekForward()
          break

        // Previous/next track
        case e.code === 'ArrowLeft' && e.shiftKey:
          e.preventDefault()
          onPrevious()
          break

        case e.code === 'ArrowRight' && e.shiftKey:
          e.preventDefault()
          onNext()
          break

        // Volume up/down
        case e.code === 'ArrowUp' && !e.shiftKey:
          e.preventDefault()
          onVolumeChange(Math.min(1, volume + 0.05))
          break

        case e.code === 'ArrowDown' && !e.shiftKey:
          e.preventDefault()
          onVolumeChange(Math.max(0, volume - 0.05))
          break

        // Mute/unmute
        case e.code === 'KeyM':
          e.preventDefault()
          onMute()
          break

        // Toggle fullscreen Now Playing
        case e.code === 'KeyF':
          e.preventDefault()
          onToggleFullscreen()
          break

        // Close modals/Now Playing
        case e.code === 'Escape':
          e.preventDefault()
          onCloseModal()
          break

        // Focus search input
        case e.code === 'Slash':
          e.preventDefault()
          onFocusSearch()
          break

        // Show keyboard shortcuts
        case e.key === '?':
          e.preventDefault()
          onShowShortcuts()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    volume,
    onToggle,
    onNext,
    onPrevious,
    onMute,
    onVolumeChange,
    onSeekBackward,
    onSeekForward,
    onToggleFullscreen,
    onCloseModal,
    onFocusSearch,
    onShowShortcuts,
    isInputFocused,
  ])
}