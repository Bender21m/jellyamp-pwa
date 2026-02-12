import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'

export default function Connect() {
  const { connect, login, isConnecting, error, enterArchiveOnly } = useAuthStore()
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'server' | 'login'>('server')

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    let serverUrl = url.trim()
    if (serverUrl && !serverUrl.match(/^https?:\/\//)) {
      serverUrl = `https://${serverUrl}`
    }
    if (await connect(serverUrl)) {
      setStep('login')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(username, password)
  }

  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-deep-black">
        <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-neon-cyan/[0.03] blur-[160px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple/[0.04] blur-[140px]" />
      </div>
      <div className="noise absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
        >
          <div className="w-20 h-20 mb-5" style={{ filter: 'drop-shadow(0 0 24px rgba(0, 255, 221, 0.15))' }}>
            <img src="/logo-animated.svg" alt="JellyAmp" className="w-full h-full" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-[var(--font-display)]">
            <span className="text-gradient">JellyAmp</span>
          </h1>
          <p className="text-text-muted mt-2 text-xs tracking-[0.2em] font-mono uppercase">
            Your music. Everywhere.
          </p>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          {step === 'server' ? (
            <motion.form
              key="server"
              onSubmit={handleConnect}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <p className="text-text-secondary text-sm text-center mb-6 leading-relaxed">
                  Connect to your Jellyfin server by entering the URL below.
                </p>
                <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2 ml-1">
                  Server URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-server.com"
                  required
                  className="w-full px-4 py-3.5 bg-surface/60 border border-white/[0.06] rounded-2xl text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/30 focus:bg-surface/80 transition-all duration-200 font-body text-[15px]"
                  autoFocus
                />
              </div>
              <ConnectButton loading={isConnecting} text="Connect" />

              {/* Divider */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-text-muted text-[10px] font-mono uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Archive-only CTA */}
              <button
                type="button"
                onClick={enterArchiveOnly}
                className="w-full group"
              >
                <div className="px-4 py-3.5 rounded-2xl border border-white/[0.06] bg-surface/30 hover:bg-surface/50 hover:border-white/[0.1] transition-all duration-200">
                  <div className="text-sm font-medium text-text-primary group-hover:text-neon-cyan transition-colors">
                    Explore Live Music Archive
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    200,000+ free live recordings — no server needed
                  </div>
                </div>
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="login"
              onSubmit={handleLogin}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <p className="text-text-secondary text-sm text-center mb-6 leading-relaxed">
                Sign in to your Jellyfin account to access your library.
              </p>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2 ml-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full px-4 py-3.5 bg-surface/60 border border-white/[0.06] rounded-2xl text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/30 focus:bg-surface/80 transition-all duration-200 font-body text-[15px]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2 ml-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3.5 bg-surface/60 border border-white/[0.06] rounded-2xl text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan/30 focus:bg-surface/80 transition-all duration-200 font-body text-[15px]"
                />
              </div>
              <div className="pt-1">
                <ConnectButton loading={isConnecting} text="Sign In" />
              </div>
              <button
                type="button"
                onClick={() => setStep('server')}
                className="w-full text-center text-text-muted text-xs hover:text-text-secondary transition-colors pt-1"
              >
                ← Different server
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-5 px-4 py-3 rounded-2xl bg-neon-pink/[0.06] border border-neon-pink/10 text-neon-pink text-sm text-center"
            >
              <div>{error}</div>
              {error.includes('Could not connect') && (
                <div className="text-xs text-neon-pink/60 mt-1.5">
                  Check the URL is correct. If you're using http://, try https:// instead.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ConnectButton({ loading, text }: { loading: boolean; text: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full py-3.5 rounded-2xl font-semibold text-sm tracking-wide text-text-primary bg-neon-cyan/[0.08] border border-neon-cyan/20 hover:bg-neon-cyan/[0.14] hover:border-neon-cyan/30 hover:shadow-[0_0_40px_rgba(0,255,221,0.08)] active:bg-neon-cyan/[0.18] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <motion.div
          className="w-5 h-5 border-2 border-neon-cyan/20 border-t-neon-cyan/70 rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        text
      )}
    </motion.button>
  )
}
