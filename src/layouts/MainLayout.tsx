import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUiStore } from '../store/uiStore'
import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUiStore()
  
  return (
    <div className="flex h-screen bg-gray-50">
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
