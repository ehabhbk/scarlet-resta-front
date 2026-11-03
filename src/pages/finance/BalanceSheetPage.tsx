import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import Card from '../../components/common/cards/Card'
import Input from '../../components/common/inputs/Input'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

export default function BalanceSheetPage() {
  const { symbol } = useSettingsStore()
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet', asOf],
    queryFn: async () => {
      const res = await api.get('/accounting/balance-sheet', { params: { as_of: asOf } })
      return res.data
    },
  })

  const renderSection = (title: string, rows: any[], total: number, color: string) => (
    <div>
      <h2 className={`text-lg font-semibold mb-2 ${color}`}>{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {(rows || []).map((r: any) => (
            <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1">{r.code} - {r.name}</td>
              <td className="py-1 text-left">{formatMoney(r.amount, symbol)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-2">الإجمالي</td>
            <td className="py-2 text-left">{formatMoney(total, symbol)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">الميزانية العمومية</h1>
      <Card>
        <div className="mb-4">
          <Input label="كما في تاريخ" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {data && (
          <div className="space-y-6">
            {renderSection('الأصول', data.assets, data.total_assets, 'text-blue-600')}
            {renderSection('الالتزامات', data.liabilities, data.total_liabilities, 'text-red-600')}
            {renderSection('حقوق الملكية', data.equity, data.total_equity, 'text-purple-600')}
            <div className="border-t border-gray-300 pt-3 flex items-center justify-between font-bold text-lg">
              <span>الالتزامات + حقوق الملكية</span>
              <span>{formatMoney(data.total_liabilities_equity, symbol)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-lg">
              <span>الأصول</span>
              <span>{formatMoney(data.total_assets, symbol)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}