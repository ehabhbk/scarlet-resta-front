import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  Table, 
  ChefHat, 
  Package, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface SidebarProps {
  open: boolean
}

export default function Sidebar({ open }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuthStore()
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard' },
    { icon: Utensils, label: 'المنتجات', path: '/products' },
    { icon: ShoppingCart, label: 'نقطة البيع', path: '/pos' },
    { icon: Table, label: 'الطاولات', path: '/tables' },
    { icon: ChefHat, label: 'المطبخ', path: '/kitchen' },
    { icon: Package, label: 'المخزون', path: '/inventory' },
    { icon: Users, label: 'العملاء', path: '/customers' },
    { icon: DollarSign, label: 'المالية', path: '/finance' },
    { icon: BarChart3, label: 'التقارير', path: '/reports' },
    { icon: Settings, label: 'الإعدادات', path: '/settings' },
  ]

  return (
    <aside className={`${open ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-l border-gray-200 flex flex-col`}>
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
          {open && <span className="font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )
}
