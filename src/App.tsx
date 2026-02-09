import { useEffect } from 'react'
import { useAuthStore } from './stores/auth'
import Connect from './pages/Connect'
import Library from './pages/Library'
import Player from './components/Player'

export default function App() {
  const { accessToken, restore } = useAuthStore()

  useEffect(() => {
    restore()
  }, [])

  return (
    <div className="h-full">
      {accessToken ? <Library /> : <Connect />}
      <Player />
    </div>
  )
}
