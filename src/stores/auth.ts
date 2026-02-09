import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Api } from '@jellyfin/sdk'
import { createApi } from '../lib/jellyfin'

interface AuthState {
  serverUrl: string | null
  userId: string | null
  username: string | null
  accessToken: string | null
  serverName: string | null
  api: Api | null
  isConnecting: boolean
  error: string | null

  connect: (serverUrl: string) => Promise<boolean>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  restore: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      serverUrl: null,
      userId: null,
      username: null,
      accessToken: null,
      serverName: null,
      api: null,
      isConnecting: false,
      error: null,

      connect: async (serverUrl: string) => {
        set({ isConnecting: true, error: null })
        try {
          const url = serverUrl.replace(/\/+$/, '')
          const api = createApi(url)
          const { data } = await api.axiosInstance.get(`${url}/System/Info/Public`)
          if (data?.ServerName) {
            set({ serverUrl: url, serverName: data.ServerName, api, isConnecting: false })
            return true
          }
          set({ error: 'Invalid Jellyfin server', isConnecting: false })
          return false
        } catch {
          set({ error: 'Could not connect to server', isConnecting: false })
          return false
        }
      },

      login: async (username: string, password: string) => {
        const { api } = get()
        if (!api) return false
        set({ isConnecting: true, error: null })
        try {
          const auth = await api.authenticateUserByName(username, password)
          if (auth.data?.AccessToken && auth.data?.User?.Id) {
            set({
              accessToken: auth.data.AccessToken,
              userId: auth.data.User.Id,
              username: auth.data.User.Name ?? username,
              isConnecting: false,
            })
            return true
          }
          set({ error: 'Invalid credentials', isConnecting: false })
          return false
        } catch {
          set({ error: 'Login failed', isConnecting: false })
          return false
        }
      },

      logout: () => {
        set({
          serverUrl: null, userId: null, username: null, accessToken: null,
          serverName: null, api: null, error: null,
        })
      },

      restore: () => {
        const { serverUrl, accessToken } = get()
        if (serverUrl && accessToken) {
          const api = createApi(serverUrl)
          api.accessToken = accessToken
          set({ api })
        }
      },
    }),
    {
      name: 'jellyamp-auth',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        userId: state.userId,
        username: state.username,
        accessToken: state.accessToken,
        serverName: state.serverName,
      }),
    }
  )
)
