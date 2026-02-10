import { useEffect } from 'react'

interface UsePlayerKeyboardOptions {
  volume: number
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  onMute: () => void
  onVolumeChange: (vol: number) => void
  onShowShortcuts: () => void
}

export function usePlayerKeyboard(options: UsePlayerKeyboardOptions) {
  const { volume, onToggle, onNext, onPrevious, onMute, onVolumeChange, onShowShortcuts } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (true) {
        case e.code === 'Space': e.preventDefault(); onToggle(); break
        case e.code === 'ArrowRight' && e.shiftKey: onNext(); break
        case e.code === 'ArrowLeft' && e.shiftKey: onPrevious(); break
        case e.code === 'KeyM': onMute(); break
        case e.code === 'ArrowUp' && !e.shiftKey: e.preventDefault(); onVolumeChange(Math.min(1, volume + 0.05)); break
        case e.code === 'ArrowDown' && !e.shiftKey: e.preventDefault(); onVolumeChange(Math.max(0, volume - 0.05)); break
        case e.key === '?': e.preventDefault(); onShowShortcuts(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [volume, onToggle, onNext, onPrevious, onMute, onVolumeChange, onShowShortcuts])
}
