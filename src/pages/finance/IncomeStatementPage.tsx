import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { api } from '../../services/api'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import { useSettingsStore, formatMoney, mediaUrl } from '../../store/settingsStore'
import { printReport } from '../../utils/printReport'

export default function IncomeStatementPage() {
  const { symbol, restaurant } = useSettingsStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', from, to],
    queryFn: async () => {
      const res = await api.get('/accounting/income-statement', { params: { from: from || undefined, to: to || undefined } })
      return res.data
    },
  })

  const rangeLabel = from && to ? `من ${from} إلى ${to}` : from ? `من ${from}` : to ? `حتى ${to}` : 'جميع الفترات'

  const handlePrint = () => {
    if (!data) return
    const revenueRows = (data.revenue || []).map((row: any) => [`${row.code} - ${row.name}`, formatMoney(row.amount, symbol)])
    const expenseRows = (data.expense || []).map((row: any) => [`${row.code} - ${row.name}`, formatMoney(row.amount, symbol)])

    printReport({
      title: 'قائمة الدخل',
      subtitle: `الفترة: ${rangeLabel}`,
      restaurant,
      logo: mediaUrl(restaurant?.logo),
      meta: [
        { label: 'الفترة', value: rangeLabel },
        { label: 'العملة', value: symbol },
        { label: 'تاريخ الإصدار', value: new Date().toLocaleDateString('ar-EG') },
      ],
      kpis: [
        { label: 'إجمالي الإيرادات', value: formatMoney(data.total_revenue, symbol), tone: 'green' },
        { label: 'إجمالي المصروفات', value: formatMoney(data.total_expense, symbol), tone: 'red' },
        { label: 'صافي الدخل', value: formatMoney(data.net_income, symbol), tone: Number(data.net_income) >= 0 ? 'green' : 'red' },
        { label: 'هامش الربح', value: `${Number(data.total_revenue) > 0 ? ((Number(data.net_income) / Number(data.total_revenue)) * 100).toFixed(1) : '0.0'}%` },
      ],
      sections: [
        {
          title: 'الإيرادات',
          columns: [{ label: 'الحساب' }, { label: 'المبلغ', align: 'left', nowrap: true }],
          rows: revenueRows,
          footer: ['إجمالي الإيرادات', formatMoney(data.total_revenue, symbol)],
          emptyText: 'لا توجد إيرادات مسجلة',
        },
        {
          title: 'المصروفات',
          columns: [{ label: 'الحساب' }, { label: 'المبلغ', align: 'left', nowrap: true }],
          rows: expenseRows,
          footer: ['إجمالي المصروفات', formatMoney(data.total_expense, symbol)],
          emptyText: 'لا توجد مصروفات مسجلة',
        },
      ],
      summaryTitle: 'الملخص النهائي',
      summary: [
        { label: 'إجمالي الإيرادات', value: formatMoney(data.total_revenue, symbol), tone: 'green' },
        { label: 'إجمالي المصروفات', value: formatMoney(data.total_expense, symbol), tone: 'red' },
        { label: 'صافي الدخل', value: formatMoney(data.net_income, symbol), tone: Number(data.net_income) >= 0 ? 'green' : 'red' },
      ],
      signatures: ['المحاسب', 'المدير المالي'],
      footerNote: 'قائمة الدخل',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">قائمة الدخل</h1>
        <Button variant="outline" onClick={handlePrint} disabled={!data}>
          <Printer className="w-4 h-4" /> تصدير PDF
        </Button>
      </div>
      <Card className="dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="من تاريخ" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {data && (
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-green-600 dark:text-green-400">الإيرادات</h2>
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
              <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">المصروفات</h2>
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
            <div className="flex items-center justify-between border-t border-gray-300 pt-3 text-lg font-bold dark:border-gray-700">
              <span>صافي الدخل</span>
              <span className={data.net_income >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {formatMoney(data.net_income, symbol)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
