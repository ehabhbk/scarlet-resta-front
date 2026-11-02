import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUiStore()
  const loadSettings = useSettingsStore((state) => state.load)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
