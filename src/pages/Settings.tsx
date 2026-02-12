import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useArchiveStore } from '../stores/archive'
import { useUIStore } from '../stores/ui'
import type { AudioQuality } from '../stores/ui'
import PlaybackSettings from './settings/PlaybackSettings'
import ScrobbleSettings from './settings/ScrobbleSettings'
import CacheSettings from './settings/CacheSettings'

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
  { value: 'original', label: 'Original', desc: 'Lossless / Direct stream' },
  { value: 'high', label: 'High', desc: '320 kbps MP3' },
  { value: 'medium', label: 'Medium', desc: '192 kbps MP3' },
  { value: 'low', label: 'Low', desc: '128 kbps MP3' },
]

export default function Settings() {
  const { serverUrl, serverName, username, archiveOnly, logout } = useAuthStore()
  const { enabled: archiveEnabled, setEnabled: setArchiveEnabled } = useArchiveStore()
  const { audioQuality, setAudioQuality } = useUIStore()

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Settings</h1>
      </div>

      <div className="px-4 md:px-8 space-y-6 max-w-2xl">
        {/* Server Info — hidden in archive-only mode */}
        {!archiveOnly && (
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
        )}

        {/* Audio Quality — hidden in archive-only mode */}
        {!archiveOnly && (
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
        )}

        {/* Playback Settings */}
        <PlaybackSettings />

        {/* Scrobbling — hidden in archive-only mode */}
        {!archiveOnly && <ScrobbleSettings />}

        {/* Offline Cache — hidden in archive-only mode */}
        {!archiveOnly && <CacheSettings />}

        {/* Live Archive — hide toggle in archive-only mode (always on) */}
        {!archiveOnly && (
          <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted">Live Archive</h2>
              <button
                onClick={() => setArchiveEnabled(!archiveEnabled)}
                aria-label={`Live Archive: ${archiveEnabled ? 'enabled' : 'disabled'}`}
                role="switch"
                aria-checked={archiveEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors min-h-[44px] min-w-[44px] justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  archiveEnabled ? 'bg-neon-cyan' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    archiveEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-text-muted/60 px-1">
              Stream live concert recordings from the Internet Archive. Completely separate from your Jellyfin library.
            </p>
            {archiveEnabled && (
              <Link
                to="/archive"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:underline px-1"
              >
                Open Live Archive
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </Link>
            )}
          </section>
        )}

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

        {/* Sign Out / Connect Server */}
        <div className="p-px rounded-xl bg-gradient-primary hover:shadow-[0_0_20px_rgba(0,255,221,0.15)] transition-shadow">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-[11px] font-semibold text-sm transition-colors min-h-[48px]"
            style={{ backgroundColor: '#050508', color: '#f0f0f5' }}
          >
            {archiveOnly ? 'Connect a Server' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}