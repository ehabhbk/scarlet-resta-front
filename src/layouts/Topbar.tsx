import { Bell, Moon, Sun, Search, ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
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
  const navigate = useNavigate()

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

  const initial = (user?.name || user?.username || '?').trim().charAt(0).toUpperCase()

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
        <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

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
            {restaurant?.logo ? (
              <img
                src={mediaUrl(restaurant.logo)}
                alt={restaurant.name}
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
                {user?.username ? `@${user.username}` : user?.roles?.[0]?.name}
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
                    {user?.username ? `@${user.username}` : user?.email}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {user?.roles?.[0]?.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Settings className="w-4 h-4" />
                  الإعدادات
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/users')
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <UserIcon className="w-4 h-4" />
                  الملف الشخصي
                </button>

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
