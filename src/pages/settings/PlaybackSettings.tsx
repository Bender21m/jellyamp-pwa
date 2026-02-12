import { useUIStore } from '../../stores/ui'
import type { CrossfadeMode } from '../../stores/ui'

const CROSSFADE_OPTIONS: { value: CrossfadeMode; label: string; desc: string }[] = [
  { value: 'gapless', label: 'Gapless', desc: 'Seamless transitions — perfect for live recordings' },
  { value: 'crossfade', label: 'Crossfade', desc: 'Smooth fade between tracks' },
  { value: 'off', label: 'Off', desc: 'Standard playback with natural gaps' },
]

const SPEED_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
]

export default function PlaybackSettings() {
  const { 
    crossfadeMode, 
    setCrossfadeMode, 
    crossfadeDuration, 
    setCrossfadeDuration, 
    playbackSpeed, 
    setPlaybackSpeed, 
    volumeNormalization, 
    setVolumeNormalization 
  } = useUIStore()

  return (
    <>
      {/* Playback Transition */}
      <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Playback Transition</h2>
        <div className="space-y-2">
          {CROSSFADE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCrossfadeMode(opt.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left ${
                crossfadeMode === opt.value
                  ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <div>
                <span className={`text-sm font-semibold ${crossfadeMode === opt.value ? 'text-neon-cyan' : 'text-text-primary'}`}>
                  {opt.label}
                </span>
                <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
              </div>
              {crossfadeMode === opt.value && (
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-cyan shrink-0" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
        {crossfadeMode === 'crossfade' && (
          <div className="mt-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">Crossfade duration</span>
              <span className="text-xs text-neon-cyan font-mono">{crossfadeDuration}s</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
              aria-label={`Crossfade duration: ${crossfadeDuration} seconds`}
              className="w-full accent-neon-cyan focus-visible:ring-2 focus-visible:ring-neon-cyan/50"
            />
          </div>
        )}
      </section>

      {/* Playback Speed */}
      <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Playback Speed</h2>
        <div className="grid grid-cols-3 gap-2">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlaybackSpeed(opt.value)}
              className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all text-sm font-semibold ${
                playbackSpeed === opt.value
                  ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30 text-neon-cyan'
                  : 'hover:bg-white/5 text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted/60 mt-3 px-1">
          Adjust playback speed. Useful for learning music or speeding through spoken content.
        </p>
      </section>

      {/* Volume Normalization */}
      <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted">Volume Normalization</h2>
          <button
            onClick={() => setVolumeNormalization(!volumeNormalization)}
            aria-label={`Volume normalization: ${volumeNormalization ? 'enabled' : 'disabled'}`}
            role="switch"
            aria-checked={volumeNormalization}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors min-h-[44px] min-w-[44px] justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              volumeNormalization ? 'bg-neon-cyan' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                volumeNormalization ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-text-muted/60 px-1">
          Automatically adjusts track volume based on ReplayGain metadata to maintain consistent loudness across songs.
        </p>
      </section>
    </>
  )
}