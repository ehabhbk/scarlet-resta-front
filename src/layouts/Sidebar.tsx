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
  Clock,
  Calendar,
  Activity,
  Bell,
  MapPin,
  Tag,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useLangStore } from '../store/langStore'
import { t } from '../i18n'

interface SidebarProps {
  open: boolean
}

interface NavChild {
  label: string
  path: string
  icon: typeof LayoutDashboard
}

interface NavItem {
  icon: typeof LayoutDashboard
  label: string
  path: string
  children?: NavChild[]
}

export default function Sidebar({ open }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuthStore()
  const { lang } = useLangStore()

  const menuItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: t('dashboard', lang),
      path: '/dashboard',
      children: [{ label: 'الإشعارات', path: '/notifications', icon: Bell }],
    },
    { icon: ShoppingCart, label: t('pos', lang), path: '/pos' },
    {
      icon: Utensils,
      label: t('products', lang),
      path: '/products',
      children: [
        { label: 'التصنيفات', path: '/categories', icon: Tag },
        { label: 'الوصفات', path: '/recipes', icon: BookOpen },
      ],
    },
    {
      icon: Receipt,
      label: 'الطلبات',
      path: '/orders',
      children: [{ label: 'الورديات', path: '/shifts', icon: Calendar }],
    },
    {
      icon: Table,
      label: t('tables', lang),
      path: '/tables',
      children: [
        { label: 'المناطق', path: '/areas', icon: MapPin },
        { label: 'محطات المطبخ', path: '/kitchen-stations', icon: ChefHat },
      ],
    },
    { icon: ChefHat, label: t('kitchen', lang), path: '/kitchen' },
    {
      icon: Package,
      label: t('inventory', lang),
      path: '/inventory',
      children: [
        { label: 'حركات المخزون', path: '/stock-movements', icon: Activity },
        { label: 'المشتريات', path: '/purchases', icon: Truck },
      ],
    },
    { icon: Users, label: t('customers', lang), path: '/customers' },
    {
      icon: Users,
      label: 'الموظفون',
      path: '/employees',
      children: [{ label: 'الحضور', path: '/attendance', icon: Clock }],
    },
    {
      icon: DollarSign,
      label: t('finance', lang),
      path: '/finance',
      children: [{ label: 'المصروفات', path: '/expenses', icon: Receipt }],
    },
    { icon: BarChart3, label: t('reports', lang), path: '/reports' },
    { icon: Settings, label: t('settings', lang), path: '/settings' },
    {
      icon: Shield,
      label: t('users', lang),
      path: '/users',
      children: [{ label: 'الأدوار', path: '/roles', icon: KeyRound }],
    },
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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const isSectionActive =
            isActive || (item.children || []).some((child) => location.pathname === child.path)

          return (
            <div key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isSectionActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {open && <span className="font-medium">{item.label}</span>}
              </Link>

              {open && isSectionActive && item.children && (
                <div className="mt-1 mr-4 space-y-1 border-r-2 border-primary/20 pr-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = location.pathname === child.path
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          childActive
                            ? 'text-primary bg-primary/5 font-medium'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <ChildIcon className="w-4 h-4" />
                        <span>{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
