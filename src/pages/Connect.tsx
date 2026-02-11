import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'

export default function Connect() {
  const { connect, login, isConnecting, error } = useAuthStore()
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'server' | 'login'>('server')

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Auto-prepend https:// if no protocol is provided
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
      {/* Animated background */}
      <div className="absolute inset-0 bg-deep-black">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-neon-cyan/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-neon-pink/5 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple/3 blur-[150px]" />
      </div>

      {/* Noise overlay */}
      <div className="noise absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="w-24 h-24 mb-6" style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 221, 0.3))' }}>
            <img src="/logo-animated.svg" alt="JellyAmp" className="w-full h-full" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight font-[var(--font-display)]">
            <span className="text-gradient">JellyAmp</span>
          </h1>
          <p className="text-text-secondary mt-2 text-sm tracking-wide font-mono uppercase">
            Your music. Everywhere.
          </p>
          <p className="text-text-muted mt-6 text-sm text-center">
            Enter your Jellyfin server URL below to get started
          </p>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          {step === 'server' ? (
            <motion.form
              key="server"
              onSubmit={handleConnect}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-2">
                  Server URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-server.com"
                  required
                  className="w-full px-4 py-3 bg-card border border-text-muted/20 rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all font-body"
                  autoFocus
                />
              </div>
              <ConnectButton loading={isConnecting} text="Connect" />
            </motion.form>
          ) : (
            <motion.form
              key="login"
              onSubmit={handleLogin}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full px-4 py-3 bg-card border border-text-muted/20 rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all font-body"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-card border border-text-muted/20 rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all font-body"
                />
              </div>
              <ConnectButton loading={isConnecting} text="Sign In" />
              <button
                type="button"
                onClick={() => setStep('server')}
                className="w-full text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 px-4 py-3 rounded-xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-sm text-center"
            >
              <div className="mb-1">{error}</div>
              {error.includes('Could not connect') && (
                <div className="text-xs text-neon-pink/80 mt-2">
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full py-3 rounded-xl font-semibold text-deep-black bg-gradient-primary hover:shadow-[0_0_30px_rgba(0,255,221,0.3)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <motion.div
          className="w-5 h-5 border-2 border-deep-black/30 border-t-deep-black rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        text
      )}
    </motion.button>
  )
}
