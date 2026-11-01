import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Download } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'

const reportEndpoints: Record<string, string> = {
  sales: '/reports/sales',
  'profit-loss': '/reports/profit-loss',
  'top-products': '/reports/top-products',
  inventory: '/reports/inventory',
  purchases: '/reports/purchases',
  expenses: '/reports/expenses',
  staff: '/reports/staff',
  'payment-methods': '/reports/payment-methods',
  tax: '/reports/tax',
  shifts: '/reports/shifts',
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', reportType, fromDate, toDate],
    queryFn: async () => {
      const endpoint = reportEndpoints[reportType]
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const res = await api.get(`${endpoint}?${params.toString()}`)
      return res.data
    },
  })

  const handleExport = async (format: 'pdf' | 'excel') => {
    window.open(`/api/reports/export/${reportType}?format=${format}&from=${fromDate}&to=${toDate}`, '_blank')
  }

  const renderValue = (val: any): string => {
    if (val === null || val === undefined) return '-'
    if (typeof val === 'number') return val.toLocaleString()
    if (typeof val === 'boolean') return val ? 'نعم' : 'لا'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  const entries = reportData ? Object.entries(reportData).filter(([k]) => k !== 'from' && k !== 'to') : []

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

        {isLoading && <p className="text-gray-500">جاري التحميل...</p>}

        {!isLoading && reportData && (
          <div className="space-y-4">
            {/* Render arrays as tables */}
            {entries.map(([key, val]) => {
              if (Array.isArray(val)) {
                if (val.length === 0) return null
                const cols = Object.keys(val[0])
                return (
                  <div key={key}>
                    <h3 className="text-lg font-semibold mb-2">{key}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {cols.map((c) => (
                              <th key={c} className="px-3 py-2 text-right font-medium text-gray-600">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {val.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100">
                              {cols.map((c) => (
                                <td key={c} className="px-3 py-2">{renderValue(row[c])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }
              return null
            })}

            {/* Render scalar values as cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {entries
                .filter(([, v]) => !Array.isArray(v))
                .map(([key, val]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">{key}</p>
                    <p className="text-xl font-bold">{renderValue(val)}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}