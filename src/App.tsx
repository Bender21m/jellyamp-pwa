import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './stores/auth'
import Connect from './pages/Connect'
import Library from './pages/Library'
import Search from './pages/Search'
import Favorites from './pages/Favorites'
import History from './pages/History'
import Playlists from './pages/Playlists'
import PlaylistDetail from './pages/PlaylistDetail'
import AlbumDetail from './pages/AlbumDetail'
import ArtistDetail from './pages/ArtistDetail'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import QueuePanel from './components/QueuePanel'
import NowPlaying from './components/NowPlaying'
import MobileNav from './components/MobileNav'

function AnimatedRoutes() {
  const location = useLocation()

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
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function AppLayout() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="noise absolute inset-0 pointer-events-none z-50" />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden bg-deep-black">
          <AnimatedRoutes />
        </main>
        <QueuePanel />
      </div>
      <Player />
      <MobileNav />
      <NowPlaying />
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
      <AppLayout />
    </BrowserRouter>
  )
}
