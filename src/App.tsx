import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from './stores/auth'
import Connect from './pages/Connect'
import Library from './pages/Library'
import Search from './pages/Search'
import Favorites from './pages/Favorites'
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

function AppLayout() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: hidden on mobile, icon-only on tablet, full on desktop */}
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden bg-deep-black">
          <Routes>
            <Route path="/library" element={<PageTransition><Library /></PageTransition>} />
            <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
            <Route path="/favorites" element={<PageTransition><Favorites /></PageTransition>} />
            <Route path="/playlists" element={<PageTransition><Playlists /></PageTransition>} />
            <Route path="/playlist/:id" element={<PageTransition><PlaylistDetail /></PageTransition>} />
            <Route path="/album/:id" element={<PageTransition><AlbumDetail /></PageTransition>} />
            <Route path="/artist/:id" element={<PageTransition><ArtistDetail /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </main>
        <QueuePanel />
      </div>
      <Player />
      {/* Mobile bottom nav - visible only on mobile */}
      <MobileNav />
      <NowPlaying />
    </div>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
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
