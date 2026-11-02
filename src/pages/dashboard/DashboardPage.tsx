import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Users,
  Trophy,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import StatCard from '../../components/common/data-display/StatCard'
import Card from '../../components/common/cards/Card'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { symbol, load } = useSettingsStore()

  useEffect(() => {
    void load()
  }, [load])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats')
      return res.data
    },
  })

  const { data: salesChart } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: async () => {
      const res = await api.get('/dashboard/sales-chart?range=7d')
      return res.data
    },
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const res = await api.get('/dashboard/top-products?limit=5')
      return res.data
    },
  })

  const { data: staffPerformance } = useQuery({
    queryKey: ['staff-performance'],
    queryFn: async () => {
      const res = await api.get('/dashboard/staff-performance')
      return res.data
    },
  })

  const bestCashier = staffPerformance?.staff?.[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">لوحة التحكم</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            نظرة سريعة على مبيعات اليوم وأفضل الأداء
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="مبيعات اليوم"
          value={formatMoney(stats?.today_revenue, symbol)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          label="طلبات اليوم"
          value={stats?.today_orders || 0}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          label="مبيعات الشهر"
          value={formatMoney(stats?.month_revenue, symbol)}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
        <StatCard
          label="صافي الربح"
          value={formatMoney(stats?.net_profit, symbol)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">المبيعات (آخر 7 أيام)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={
                salesChart?.data?.map((v: number, i: number) => ({
                  name: salesChart.labels[i],
                  value: v,
                })) || []
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatMoney(value, symbol)} />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold dark:text-gray-100">أكثر المنتجات مبيعاً</h2>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-3">
              {topProducts?.products?.length ? (
                topProducts.products.map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index === 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatMoney(product.revenue, symbol)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {product.sales_count} مبيعة
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">لا توجد مبيعات بعد</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold dark:text-gray-100">الأكثر مبيعاً للكاشير</h2>
              <Users className="w-5 h-5 text-primary" />
            </div>
            {bestCashier ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    {bestCashier.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {bestCashier.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bestCashier.username ? `@${bestCashier.username}` : bestCashier.role}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">
                    {formatMoney(bestCashier.revenue, symbol)}
                  </p>
                  <p className="text-xs text-gray-500">{bestCashier.orders_completed} طلب</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
            )}
          </Card>
        </div>
      </div>

      {stats?.low_stock_alerts > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800 dark:text-amber-200">
            يوجد {stats.low_stock_alerts} صنف بمخزون منخفض. يرجى التحقق من المخزون.
          </span>
        </div>
      )}
    </div>
  )
}
