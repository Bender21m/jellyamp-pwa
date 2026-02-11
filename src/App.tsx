import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './stores/auth'
import { useArchiveStore } from './stores/archive'
import ErrorBoundary from './components/ErrorBoundary'
import PageSkeleton from './components/PageSkeleton'
import Onboarding, { useOnboarding } from './components/Onboarding'

// Core shell — loaded eagerly (always visible)
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import QueuePanel from './components/QueuePanel'
import NowPlaying from './components/NowPlaying'
import MobileNav from './components/MobileNav'
import MobileSettingsButton from './components/MobileSettingsButton'
import ToastContainer from './components/Toast'
import InstallPrompt from './components/InstallPrompt'
import UpdateNotification from './components/UpdateNotification'
import Connect from './pages/Connect'

// Pages — lazy loaded (only fetched when route is visited)
const Library = lazy(() => import('./pages/Library'))
const Search = lazy(() => import('./pages/Search'))
const Favorites = lazy(() => import('./pages/Favorites'))
const History = lazy(() => import('./pages/History'))
const Playlists = lazy(() => import('./pages/Playlists'))
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'))
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'))
const ArtistDetail = lazy(() => import('./pages/ArtistDetail'))
const Settings = lazy(() => import('./pages/Settings'))

// Archive pages — behind feature flag, good candidates for splitting
const ArchiveHome = lazy(() => import('./pages/ArchiveHome'))
const ArchiveArtist = lazy(() => import('./pages/ArchiveArtist'))
const ArchiveShow = lazy(() => import('./pages/ArchiveShow'))

function AnimatedRoutes() {
  const location = useLocation()
  const archiveEnabled = useArchiveStore((s) => s.enabled)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full"
      >
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes location={location}>
              <Route path="/library" element={<Library />} />
              <Route path="/search" element={<Search />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/history" element={<History />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/playlist/:id" element={<PlaylistDetail />} />
              <Route path="/album/:id" element={<AlbumDetail />} />
              <Route path="/artist/:id" element={<ArtistDetail />} />
              <Route path="/settings" element={<Settings />} />
              {archiveEnabled && (
                <>
                  <Route path="/archive" element={<ArchiveHome />} />
                  <Route path="/archive/artist/:name" element={<ArchiveArtist />} />
                  <Route path="/archive/show/:id" element={<ArchiveShow />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/library" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  )
}

function AppLayout() {
  const { showOnboarding, dismissOnboarding } = useOnboarding()

  return (
    <div className="h-full flex flex-col relative">
      {/* Skip to content link for screen readers */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      
      <div className="noise absolute inset-0 pointer-events-none z-50" />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main id="main-content" className="flex-1 min-w-0 overflow-hidden bg-deep-black">
          <AnimatedRoutes />
        </main>
        <QueuePanel />
      </div>
      {/* Player gets its own error boundary — music should keep playing even if a page crashes */}
      <ErrorBoundary inline>
        <Player />
      </ErrorBoundary>
      <MobileNav />
      <MobileSettingsButton />
      <NowPlaying />
      <ToastContainer />
      <InstallPrompt />
      <UpdateNotification />
      <Onboarding isVisible={showOnboarding} onDismiss={dismissOnboarding} />
    </div>
  )
}

export default function App() {
  const { accessToken, restore } = useAuthStore()

  useEffect(() => { restore() }, [])

  if (!accessToken) {
    return (
      <BrowserRouter>
        <Connect />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </BrowserRouter>
  )
}
