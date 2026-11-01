import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import StatCard from '../../components/common/data-display/StatCard'
import Card from '../../components/common/cards/Card'

export default function DashboardPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="مبيعات اليوم"
          value={`${stats?.today_revenue?.toLocaleString() || 0} ر.س`}
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
          value={`${stats?.month_revenue?.toLocaleString() || 0} ر.س`}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
        <StatCard
          label="صافي الربح"
          value={`${stats?.net_profit?.toLocaleString() || 0} ر.س`}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">المبيعات (آخر 7 أيام)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesChart?.data?.map((v: number, i: number) => ({ 
              name: salesChart.labels[i], 
              value: v 
            })) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">أكثر المنتجات مبيعاً</h2>
          <div className="space-y-3">
            {topProducts?.products?.map((product: any, index: number) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <span className="text-gray-500">{product.sales_count} مبيعة</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {stats?.low_stock_alerts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800">
            يوجد {stats.low_stock_alerts} صنف بمخزون منخفض. يرجى التحقق من المخزون.
          </span>
        </div>
      )}
    </div>
  )
}
