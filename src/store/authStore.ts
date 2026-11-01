import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { User, AuthState } from '@/types'
import api from '@/services/api'

export const useAuthStore = create<AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: async (email: string, password: string) => {
          set({ isLoading: true })
          const res = await api.post('/auth/login', { email, password })
          localStorage.setItem('token', res.data.token)
          localStorage.setItem('user', JSON.stringify(res.data.user))
          set({
            user: res.data.user,
            token: res.data.token,
            isAuthenticated: true,
            isLoading: false,
          })
        },
        logout: () => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          set({ user: null, token: null, isAuthenticated: false })
        },
        setUser: (user: User) => set({ user }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      }
    )
  )
)
