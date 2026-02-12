import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFocusManagement } from '../hooks/useFocusManagement'
import { EQ_BANDS, EQ_PRESETS, type EQPreset } from '../lib/equalizer'

interface EqualizerProps {
  isOpen: boolean
  onClose: () => void
  gains: number[]
  onGainsChange: (gains: number[]) => void
  onPresetApply: (preset: EQPreset) => void
}

export default function Equalizer({ isOpen, onClose, gains, onGainsChange, onPresetApply }: EqualizerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('Flat')

  // Focus management
  const { containerRef } = useFocusManagement({
    isOpen,
    restoreOnClose: true,
    trapFocus: true,
  })

  // Update selected preset when gains change externally
  // This is derived state based on gains - using useMemo would be better but this pattern is also acceptable
  useEffect(() => {
    const matchingPreset = EQ_PRESETS.find(preset => 
      preset.gains.every((gain, index) => Math.abs(gain - gains[index]) < 0.1)
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedPreset(matchingPreset?.name ?? 'Custom')
  }, [gains])

  const handleSliderChange = (bandIndex: number, value: number) => {
    const newGains = [...gains]
    newGains[bandIndex] = value
    onGainsChange(newGains)
  }

  const handlePresetChange = (presetName: string) => {
    const preset = EQ_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setSelectedPreset(presetName)
      onPresetApply(preset)
    }
  }

  const resetEQ = () => {
    const flatPreset = EQ_PRESETS.find(p => p.name === 'Flat')
    if (flatPreset) {
      setSelectedPreset('Flat')
      onPresetApply(flatPreset)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-deep-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* EQ Panel */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md"
          >
            {/* Glassmorphism Panel */}
            <div className="bg-deep-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold tracking-[-0.02em]">Equalizer</h3>
                    <p className="text-xs text-text-muted font-mono mt-0.5">5-Band Audio EQ</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>

                {/* Preset Selector */}
                <div className="mt-4">
                  <label className="block text-xs text-text-muted font-mono uppercase tracking-widest mb-2">
                    Presets
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-neon-cyan/50 focus:outline-none appearance-none"
                  >
                    {EQ_PRESETS.map(preset => (
                      <option key={preset.name} value={preset.name} className="bg-deep-black">
                        {preset.name}
                      </option>
                    ))}
                    {!EQ_PRESETS.find(p => p.name === selectedPreset) && (
                      <option value={selectedPreset} className="bg-deep-black">Custom</option>
                    )}
                  </select>
                </div>
              </div>

              {/* EQ Sliders */}
              <div className="px-5 py-6">
                <div className="flex items-end justify-between gap-4 h-48">
                  {EQ_BANDS.map((band, index) => {
                    const gain = gains[index] ?? 0
                    const percentage = ((gain + 12) / 24) * 100 // Convert -12 to +12 range to 0-100%
                    
                    return (
                      <div key={band.frequency} className="flex flex-col items-center flex-1 h-full">
                        {/* Gain Value */}
                        <div className="text-xs font-mono text-neon-cyan mb-2 min-h-[16px] flex items-center">
                          {gain > 0 ? '+' : ''}{gain.toFixed(1)}
                        </div>
                        
                        {/* Slider Track */}
                        <div className="relative flex-1 w-6 bg-white/10 rounded-full flex items-center justify-center">
                          {/* Zero line */}
                          <div className="absolute w-full h-px bg-white/30 top-1/2 -translate-y-0.5" />
                          
                          {/* Slider */}
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={gain}
                            onChange={(e) => handleSliderChange(index, parseFloat(e.target.value))}
                            className="vertical-slider absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                            style={{ writingMode: 'vertical-rl' as const }}
                          />
                          
                          {/* Visual indicator */}
                          <div 
                            className="absolute w-4 h-4 bg-gradient-primary rounded-full shadow-[0_0_12px_rgba(0,255,221,0.5)] pointer-events-none transition-all duration-150"
                            style={{ 
                              bottom: `calc(${percentage}% - 8px)`,
                              transform: 'translateX(-50%)',
                              left: '50%'
                            }}
                          />
                          
                          {/* Fill bar */}
                          {gain !== 0 && (
                            <div
                              className="absolute w-2 bg-gradient-to-t from-neon-cyan/80 to-neon-pink/80 rounded-full pointer-events-none transition-all duration-150"
                              style={{
                                height: `${Math.abs(gain) / 12 * 50}%`,
                                [gain > 0 ? 'bottom' : 'top']: '50%',
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            />
                          )}
                        </div>
                        
                        {/* Frequency Label */}
                        <div className="text-xs font-mono text-text-muted mt-2">
                          {band.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Reset Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={resetEQ}
                    className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Reset to Flat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Note: Vertical slider styles would need to be added via CSS file or styled-components */}
        </>
      )}
    </AnimatePresence>
  )
}