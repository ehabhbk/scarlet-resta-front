import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  Table, 
  ChefHat, 
  Package, 
  BookOpen,
  Truck,
  Users, 
  DollarSign, 
  BarChart3, 
  Settings,
  Shield,
  Receipt,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useLangStore } from '../store/langStore'
import { t } from '../i18n'

interface SidebarProps {
  open: boolean
}

export default function Sidebar({ open }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuthStore()
  const { lang } = useLangStore()
  
  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard', lang), path: '/dashboard' },
    { icon: Utensils, label: t('products', lang), path: '/products' },
    { icon: ShoppingCart, label: t('pos', lang), path: '/pos' },
    { icon: Table, label: t('tables', lang), path: '/tables' },
    { icon: ChefHat, label: t('kitchen', lang), path: '/kitchen' },
    { icon: Package, label: t('inventory', lang), path: '/inventory' },
    { icon: BookOpen, label: t('recipes', lang), path: '/recipes' },
    { icon: Truck, label: t('purchases', lang), path: '/purchases' },
    { icon: Users, label: t('customers', lang), path: '/customers' },
    { icon: DollarSign, label: t('finance', lang), path: '/finance' },
    { icon: BarChart3, label: t('reports', lang), path: '/reports' },
    { icon: Settings, label: t('settings', lang), path: '/settings' },
    { icon: Shield, label: t('users', lang), path: '/users' },
    { icon: Receipt, label: 'المصروفات', path: '/expenses' },
  ]

  return (
    <aside className={`${open ? 'w-64' : 'w-20'} transition-all duration-300 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          {open && (
            <div>
              <h1 className="font-bold text-lg">scarlet restaurant</h1>
              <p className="text-xs text-gray-500">نظام إدارة المطاعم</p>
            </div>
          )}
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {open && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {open && <span className="font-medium">{t('logout', lang)}</span>}
        </button>
      </div>
    </aside>
  )
}
