import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import type { AudioQuality } from '../stores/ui'

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
  { value: 'original', label: 'Original', desc: 'Lossless / Direct stream' },
  { value: 'high', label: 'High', desc: '320 kbps MP3' },
  { value: 'medium', label: 'Medium', desc: '192 kbps MP3' },
  { value: 'low', label: 'Low', desc: '128 kbps MP3' },
]

export default function Settings() {
  const { serverUrl, serverName, username, logout } = useAuthStore()
  const { audioQuality, setAudioQuality } = useUIStore()

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Settings</h1>
      </div>

      <div className="px-4 md:px-8 space-y-6 max-w-2xl">
        {/* Server Info */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Server</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">Server Name</span>
              <span className="text-sm font-mono">{serverName ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">URL</span>
              <span className="text-sm font-mono text-text-muted truncate max-w-[200px]">{serverUrl}</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">User</span>
              <span className="text-sm font-mono">{username}</span>
            </div>
          </div>
        </section>

        {/* Audio Quality */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Streaming Quality</h2>
          <div className="space-y-1.5">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAudioQuality(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left ${
                  audioQuality === opt.value
                    ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold ${audioQuality === opt.value ? 'text-neon-cyan' : 'text-text-primary'}`}>
                    {opt.label}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                </div>
                {audioQuality === opt.value && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-cyan shrink-0" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted/60 mt-3 px-1">
            Original streams the file as-is (FLAC, WAV, etc). Lower quality saves bandwidth but transcodes on the server.
          </p>
        </section>

        {/* About */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">About</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">App</span>
              <span className="text-sm font-mono text-gradient">JellyAmp PWA</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">Version</span>
              <span className="text-sm font-mono text-text-muted">0.1.0</span>
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <div className="p-px rounded-xl bg-gradient-primary hover:shadow-[0_0_20px_rgba(0,255,221,0.15)] transition-shadow">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-[11px] font-semibold text-sm transition-colors min-h-[48px]"
            style={{ backgroundColor: '#050508', color: '#f0f0f5' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
