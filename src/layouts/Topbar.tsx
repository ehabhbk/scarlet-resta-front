import { Bell, Moon, Sun, Search, ChevronDown, LogOut, Settings, BarChart3, Users } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { useLangStore } from '../store/langStore'
import { useSettingsStore, mediaUrl } from '../store/settingsStore'
import { api } from '../services/api'
import { t } from '../i18n'

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUiStore()
  const { lang, toggleLang } = useLangStore()
  const { restaurant } = useSettingsStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/admin/roles')
      return res.data.roles || res.data.data || res.data
    },
  })

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications')
      return res.data.data || res.data
    },
    refetchInterval: 30000,
  })

  const notifications = Array.isArray(notifData) ? notifData : (notifData?.data || [])
  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  const userRoleName = user?.roles?.[0]?.name
  const userRole = (Array.isArray(rolesData) ? rolesData : []).find((r: any) => r.name === userRoleName)
  const userPerms = (userRole?.permissions || []).map((p: any) => p.name)
  const isAdmin = ['Super Admin', 'Admin'].includes(userRoleName || '')

  const can = (perm: string) => isAdmin || userPerms.includes(perm)
  const canSettings = can('edit_settings') || isAdmin
  const canReports = can('view_reports') || isAdmin
  const canUsers = can('view_users') || can('create_users') || isAdmin

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      await api.post('/auth/logout')
    } catch {
      // The local session is cleared even if the API call fails.
    }
    logout()
    navigate('/login')
  }

  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`)
      refetchNotifs()
    } catch {
      // ignore
    }
  }

  const initial = (user?.name || user?.username || '?').trim().charAt(0).toUpperCase()
  const avatarSrc = user?.avatar || user?.image

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search', lang)}
            className="pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-64 bg-white dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">الإشعارات</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="text-center py-6 text-sm text-gray-500">لا توجد إشعارات</p>
                  )}
                  {notifications.map((n: any) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markRead(n.id)}
                      className={`w-full text-right px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${n.is_read ? 'opacity-60' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title || n.message}</p>
                      {n.message && n.title && (
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{n.created_at}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleLang}
          className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {lang === 'ar' ? 'EN' : 'AR'}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {avatarSrc || restaurant?.logo ? (
              <img
                src={mediaUrl(avatarSrc || restaurant?.logo || '')}
                alt={user?.name || restaurant?.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                {initial}
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium dark:text-gray-100">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.username ? `@${user?.username}` : user?.roles?.[0]?.name}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.username ? `@${user?.username}` : user?.roles?.[0]?.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {user?.roles?.[0]?.name}
                  </p>
                </div>

                {canUsers && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/users') }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Users className="w-4 h-4" />
                    المستخدمون
                  </button>
                )}

                {canReports && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/reports') }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <BarChart3 className="w-4 h-4" />
                    التقارير
                  </button>
                )}

                {canSettings && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Settings className="w-4 h-4" />
                    الإعدادات
                  </button>
                )}

                <div className="border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}