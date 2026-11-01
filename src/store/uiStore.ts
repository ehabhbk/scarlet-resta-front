import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UiState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      darkMode: false,
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode
        if (next) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        return { darkMode: next }
      }),
      setDarkMode: (value) => {
        if (value) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        set({ darkMode: value })
      },
    }),
    { name: 'ui-storage' }
  )
)