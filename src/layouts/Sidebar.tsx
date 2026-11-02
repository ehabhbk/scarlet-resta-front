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
  Receipt,
  Calendar,
  Activity,
  Bell,
  MapPin,
  Tag,
} from 'lucide-react'
import { useLangStore } from '../store/langStore'
import { useSettingsStore, mediaUrl } from '../store/settingsStore'
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
  const { lang } = useLangStore()
  const { restaurant } = useSettingsStore()

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
  ]

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-20'
      } transition-all duration-300 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-l border-slate-800 flex flex-col shadow-2xl`}
    >
      <div className="px-4 py-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-3">
          {restaurant?.logo ? (
            <img
              src={mediaUrl(restaurant.logo)}
              alt={restaurant.name}
              className="w-11 h-11 rounded-xl object-cover bg-white/10 shrink-0 ring-1 ring-white/15"
            />
          ) : (
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">
              {(restaurant?.name || 'S').trim().charAt(0).toUpperCase()}
            </div>
          )}
          {open && (
            <div className="min-w-0">
              <h1 className="font-bold text-base text-white truncate">
                {restaurant?.name || 'scarlet restaurant'}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">نظام إدارة المطاعم</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const isSectionActive =
            isActive || (item.children || []).some((child) => location.pathname === child.path)

          return (
            <div key={item.path}>
              <Link
                to={item.path}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isSectionActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isSectionActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-primary" />
                )}
                <Icon className={`w-5 h-5 shrink-0 ${isSectionActive ? 'text-primary' : ''}`} />
                {open && <span className="font-medium text-sm truncate">{item.label}</span>}
              </Link>

              {open && isSectionActive && item.children && (
                <div className="mt-1 mr-5 space-y-1 border-r border-white/10 pr-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = location.pathname === child.path
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                          childActive
                            ? 'text-primary bg-primary/10 font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <ChildIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {open && (
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-[11px] text-slate-500">
            {new Date().getFullYear()} © {restaurant?.name || 'Scarlet Restaurant'}
          </p>
        </div>
      )}
    </aside>
  )
}