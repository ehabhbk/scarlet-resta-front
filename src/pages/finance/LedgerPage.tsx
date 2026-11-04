import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import Card from '../../components/common/cards/Card'
import Input from '../../components/common/inputs/Input'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

export default function LedgerPage() {
  const { symbol } = useSettingsStore()
  const [accountId, setAccountId] = useState<number | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')

  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => (await api.get('/accounting/chart-of-accounts')).data?.accounts || [],
  })

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', accountId, from, to, search],
    queryFn: async () => {
      const res = await api.get('/accounting/ledger', { params: { account_id: accountId, from: from || undefined, to: to || undefined, search } })
      return res.data
    },
    enabled: !!accountId,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">دفتر الاستاذ</h1>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">الحساب</label>
            <select value={accountId || ''} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="">اختر حساباً</option>
              {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
          </div>
          <Input label="من تاريخ" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input label="بحث برقم القيد أو الوصف" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {!accountId && <p className="text-sm text-gray-500">اختر حساباً لعرض دفتر الاستاذ.</p>}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{data.account?.code} - {data.account?.name}</span>
              <span>الرصيد الافتتاحي: {formatMoney(data.opening_balance, symbol)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700"><th className="text-right py-2">التاريخ</th><th className="text-right py-2">القيد</th><th className="text-right py-2">الوصف</th><th className="text-right py-2">مدين</th><th className="text-right py-2">دائن</th><th className="text-right py-2">الرصيد</th></tr></thead>
                <tbody>
                  {(data.lines || []).map((l: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2">{l.date}</td>
                      <td className="py-2">{l.entry_number}</td>
                      <td className="py-2">{l.description || '-'}</td>
                      <td className="py-2">{Number(l.debit).toFixed(2)}</td>
                      <td className="py-2">{Number(l.credit).toFixed(2)}</td>
                      <td className="py-2 font-semibold">{formatMoney(l.balance, symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-left font-bold">الرصيد الختامي: {formatMoney(data.closing_balance, symbol)}</div>
          </div>
        )}
      </Card>
    </div>
  )
}