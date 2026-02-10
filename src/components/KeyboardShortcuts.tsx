import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    key: string
    label: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Playback',
    shortcuts: [
      { key: 'Space', label: 'Play/Pause' },
      { key: 'Shift + →', label: 'Next Track' },
      { key: 'Shift + ←', label: 'Previous Track' },
      { key: 'M', label: 'Mute/Unmute' },
      { key: '↑', label: 'Volume Up' },
      { key: '↓', label: 'Volume Down' },
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: '?', label: 'Show Shortcuts' },
      { key: 'Esc', label: 'Close Overlay' },
    ]
  }
]

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-xs font-mono text-white/90 shadow-sm">
      {children}
    </kbd>
  )
}

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-text-primary">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            
            {/* Shortcuts */}
            <div className="p-6 space-y-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 font-mono">
                    {group.title}
                  </h3>
                  <div className="space-y-3">
                    {group.shortcuts.map((shortcut) => (
                      <div key={shortcut.key} className="flex items-center justify-between gap-4">
                        <span className="text-text-primary text-sm">{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.key.includes(' + ') ? (
                            // Multi-key combinations
                            shortcut.key.split(' + ').map((key, i, arr) => (
                              <div key={key} className="flex items-center gap-1">
                                <Keycap>{key}</Keycap>
                                {i < arr.length - 1 && (
                                  <span className="text-text-muted text-xs">+</span>
                                )}
                              </div>
                            ))
                          ) : (
                            // Single key
                            <Keycap>{shortcut.key}</Keycap>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="px-6 pb-6">
              <div className="text-xs text-text-muted bg-white/5 rounded-lg p-3 border border-white/10">
                <p>Press <Keycap>?</Keycap> anytime to show this overlay, or <Keycap>Esc</Keycap> to close it.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}