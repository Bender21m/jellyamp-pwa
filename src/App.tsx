import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function AppLayout() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden bg-deep-black">
          <Routes>
            <Route path="/library" element={<Library />} />
            <Route path="/search" element={<Search />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
            <Route path="/album/:id" element={<AlbumDetail />} />
            <Route path="/artist/:id" element={<ArtistDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </main>
        <QueuePanel />
      </div>
      <Player />
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
