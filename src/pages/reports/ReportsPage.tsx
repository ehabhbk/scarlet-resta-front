import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Download } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(`/reports/sales?from=${fromDate}&to=${toDate}`)
      return res.data
    },
    enabled: reportType === 'sales',
  })

  const { data: profitLoss } = useQuery({
    queryKey: ['profit-loss-report', fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(`/reports/profit-loss?from=${fromDate}&to=${toDate}`)
      return res.data
    },
    enabled: reportType === 'profit-loss',
  })

  const handleExport = async (format: 'pdf' | 'excel') => {
    window.open(`/api/reports/export/${reportType}?format=${format}&from=${fromDate}&to=${toDate}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع التقرير</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="sales">تقرير المبيعات</option>
              <option value="profit-loss">تقرير الأرباح والخسائر</option>
              <option value="top-products">المنتجات الأكثر مبيعاً</option>
              <option value="inventory">تقرير المخزون</option>
              <option value="purchases">تقرير المشتريات</option>
              <option value="expenses">تقرير المصروفات</option>
              <option value="staff">تقرير الموظفين</option>
              <option value="payment-methods">تقرير طرق الدفع</option>
              <option value="tax">تقرير الضرائب</option>
              <option value="shifts">تقرير الورديات</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4" />
            تصدير PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>

        {/* Report Content */}
        {reportType === 'sales' && salesReport && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">تقرير المبيعات</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">{salesReport.total_sales?.toLocaleString()} ر.س</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">عدد الطلبات</p>
                <p className="text-2xl font-bold">{salesReport.total_orders}</p>
              </div>
            </div>
          </div>
        )}

        {reportType === 'profit-loss' && profitLoss && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">تقرير الأرباح والخسائر</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">{profitLoss.revenue?.toLocaleString()} ر.س</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">المصروفات</p>
                <p className="text-2xl font-bold text-red-600">{profitLoss.expense?.toLocaleString()} ر.س</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">المشتريات</p>
                <p className="text-2xl font-bold text-blue-600">{profitLoss.purchase?.toLocaleString()} ر.س</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-gray-500">صافي الربح</p>
                <p className="text-2xl font-bold text-emerald-600">{profitLoss.profit?.toLocaleString()} ر.س</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
