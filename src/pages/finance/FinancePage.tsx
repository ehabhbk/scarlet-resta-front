import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import StatCard from '../../components/common/data-display/StatCard'

export default function FinancePage() {
  const [period, setPeriod] = useState('month')

  const { data: profitLoss } = useQuery({
    queryKey: ['profit-loss', period],
    queryFn: async () => {
      const res = await api.get('/reports/profit-loss')
      return res.data
    },
  })

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/reports/payment-methods')
      return res.data.methods
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المالية</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="today">اليوم</option>
          <option value="week">هذا الأسبوع</option>
          <option value="month">هذا الشهر</option>
          <option value="year">هذا العام</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="الإيرادات"
          value={`${profitLoss?.revenue?.toLocaleString() || 0} ر.س`}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          label="المصروفات"
          value={`${profitLoss?.expense?.toLocaleString() || 0} ر.س`}
          icon={<TrendingDown className="w-6 h-6 text-white" />}
          color="bg-red-500"
        />
        <StatCard
          label="المشتريات"
          value={`${profitLoss?.purchase?.toLocaleString() || 0} ر.س`}
          icon={<CreditCard className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          label="صافي الربح"
          value={`${profitLoss?.profit?.toLocaleString() || 0} ر.س`}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-emerald-500"
        />
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">طرق الدفع</h2>
        <div className="space-y-3">
          {paymentMethods?.map((method: any) => (
            <div key={method.payment_method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">
                {method.payment_method === 'cash' ? 'نقدي' :
                 method.payment_method === 'card' ? 'بطاقة' :
                 method.payment_method === 'wallet' ? 'محفظة' : method.payment_method}
              </span>
              <div className="text-right">
                <p className="font-bold">{method.total?.toLocaleString()} ر.س</p>
                <p className="text-xs text-gray-500">{method.count} عملية</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
