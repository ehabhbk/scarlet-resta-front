import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import Card from '../../components/common/cards/Card'
import Input from '../../components/common/inputs/Input'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

export default function IncomeStatementPage() {
  const { symbol } = useSettingsStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', from, to],
    queryFn: async () => {
      const res = await api.get('/accounting/income-statement', { params: { from: from || undefined, to: to || undefined } })
      return res.data
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">قائمة الدخل</h1>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Input label="من تاريخ" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {data && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-green-600 mb-2">الإيرادات</h2>
              <table className="w-full text-sm">
                <tbody>
                  {(data.revenue || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1">{r.code} - {r.name}</td>
                      <td className="py-1 text-left">{formatMoney(r.amount, symbol)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">إجمالي الإيرادات</td>
                    <td className="py-2 text-left">{formatMoney(data.total_revenue, symbol)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-2">المصروفات</h2>
              <table className="w-full text-sm">
                <tbody>
                  {(data.expense || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1">{r.code} - {r.name}</td>
                      <td className="py-1 text-left">{formatMoney(r.amount, symbol)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">إجمالي المصروفات</td>
                    <td className="py-2 text-left">{formatMoney(data.total_expense, symbol)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-300 pt-3 flex items-center justify-between font-bold text-lg">
              <span>صافي الدخل</span>
              <span className={data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>{formatMoney(data.net_income, symbol)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}