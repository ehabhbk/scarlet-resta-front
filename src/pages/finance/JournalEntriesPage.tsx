import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Trash2, Pencil } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import Modal from '../../components/common/modals/Modal'


interface Line { account_id: number | ''; debit: number; credit: number; description: string }

export default function JournalEntriesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '' })
  const [lines, setLines] = useState<Line[]>([{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }])

  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => (await api.get('/accounting/chart-of-accounts')).data?.accounts || [],
  })

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res = await api.get('/journal-entries', { params: { per_page: 50 } })
      return res.data?.data || res.data || []
    },
  })

  const entries = Array.isArray(data) ? data : (data?.data || [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        entry_date: form.entry_date,
        reference: form.reference || null,
        description: form.description || null,
        lines: lines.map((l) => ({ account_id: Number(l.account_id), debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || null })),
      }
      if (editing) await api.put(`/journal-entries/${editing.id}`, payload)
      else await api.post('/journal-entries', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      setShowModal(false)
      setEditing(null)
      setForm({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '' })
      setLines([{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/journal-entries/${id}`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
    },
  })

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001

  const addLine = () => setLines((prev) => [...prev, { account_id: '', debit: 0, credit: 0, description: '' }])
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i))
  const updateLine = (i: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">قيود اليومية</h1>
        <Button onClick={() => { setEditing(null); setShowModal(true) }}><Plus className="w-4 h-4" /> قيد جديد</Button>
      </div>
      <Card>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {!isLoading && entries.length === 0 && <p className="text-sm text-gray-500">لا توجد قيود.</p>}
        <div className="space-y-3">
          {entries.map((e: any) => (
            <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{e.entry_number} — {e.entry_date}</p>
                  <p className="text-xs text-gray-500">{e.description || e.reference || ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    setEditing(e)
                    setForm({ entry_date: e.entry_date, reference: e.reference || '', description: e.description || '' })
                    setLines((e.lines || []).map((l: any) => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || '' })))
                    setShowModal(true)
                  }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="تعديل"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => { if (window.confirm('حذف القيد؟')) deleteMutation.mutate(e.id) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500"><th className="text-right py-1">الحساب</th><th className="text-right py-1">مدين</th><th className="text-right py-1">دائن</th></tr></thead>
                  <tbody>
                    {(e.lines || []).map((l: any) => (
                      <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-1">{l.account?.code} - {l.account?.name}</td>
                        <td className="py-1">{Number(l.debit).toFixed(2)}</td>
                        <td className="py-1">{Number(l.credit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل قيد' : 'قيد جديد'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="التاريخ" type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
            <Input label="المرجع" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_6rem_6rem_auto] gap-2 items-center">
                <select value={line.account_id} onChange={(e) => updateLine(i, { account_id: e.target.value ? Number(e.target.value) : '' })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <option value="">اختر حساباً</option>
                  {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
                <input type="number" step="0.01" value={line.debit} onChange={(e) => updateLine(i, { debit: Number(e.target.value) || 0 })} className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="مدين" />
                <input type="number" step="0.01" value={line.credit} onChange={(e) => updateLine(i, { credit: Number(e.target.value) || 0 })} className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="دائن" />
                <button onClick={() => removeLine(i)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addLine}><Plus className="w-4 h-4" /> إضافة سطر</Button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={balanced ? 'text-green-600' : 'text-red-600'}>مدين: {totalDebit.toFixed(2)} | دائن: {totalCredit.toFixed(2)} {balanced ? '✓' : '✗'}</span>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!balanced}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}