import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** If true, shows a minimal inline error instead of full-page */
  inline?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — catches render errors in children.
 * Use at route level to prevent one page from crashing the whole app,
 * and around Player to keep music playing even if a page crashes.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[JellyAmp] Error boundary caught:', error, errorInfo)

    // Auto-reload on stale chunk errors (happens after new deployments)
    if (
      error.message.includes('dynamically imported module') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk')
    ) {
      const reloadKey = 'jellyamp-chunk-reload'
      const lastReload = sessionStorage.getItem(reloadKey)
      const now = Date.now()

      // Only auto-reload once per 60 seconds to prevent infinite loops
      if (!lastReload || now - parseInt(lastReload, 10) > 60_000) {
        console.info('[JellyAmp] Stale chunk detected, auto-reloading...')
        sessionStorage.setItem(reloadKey, String(now))
        window.location.reload()
        return
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    if (this.props.inline) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
          <span className="text-red-400">Something went wrong</span>
          <button
            onClick={this.handleRetry}
            className="text-xs text-red-300 hover:text-white underline underline-offset-2 transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }

    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-400" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-1.5">Something went wrong</h2>
          <p className="text-sm text-text-muted mb-5">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/20 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-text-secondary text-sm hover:bg-white/10 transition-colors"
            >
              Reload app
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-text-muted/50 cursor-pointer hover:text-text-muted transition-colors">
                Technical details
              </summary>
              <pre className="mt-2 text-[11px] text-text-muted/40 font-mono bg-white/[0.02] rounded-lg p-3 overflow-auto max-h-32">
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
