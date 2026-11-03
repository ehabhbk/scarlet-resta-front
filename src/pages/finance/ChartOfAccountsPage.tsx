import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import Modal from '../../components/common/modals/Modal'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

const TYPE_LABELS: Record<string, string> = {
  asset: 'أصل',
  liability: 'التزام',
  equity: 'حقوق ملكية',
  revenue: 'إيراد',
  expense: 'مصروف',
}

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-600',
  liability: 'text-red-600',
  equity: 'text-purple-600',
  revenue: 'text-green-600',
  expense: 'text-amber-600',
}

export default function ChartOfAccountsPage() {
  const { symbol } = useSettingsStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', parent_id: '', opening_balance: 0, is_active: true, notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const res = await api.get('/accounting/chart-of-accounts')
      return res.data?.accounts || []
    },
  })

  const accounts = data || []

  useEffect(() => {
    const parents = new Set<number>()
    accounts.forEach((a: any) => { if (a.parent_id != null) parents.add(a.parent_id) })
    setExpanded((prev) => {
      const next = new Set(prev)
      parents.forEach((id) => next.add(id))
      return next
    })
  }, [accounts])

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      if (editing) await api.put(`/accounts/${editing.id}`, d)
      else await api.post('/accounts', d)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      setShowModal(false)
      setEditing(null)
      setForm({ code: '', name: '', type: 'asset', parent_id: '', opening_balance: 0, is_active: true, notes: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/accounts/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] }),
  })

  const childrenOf = (parentId: number | null) => accounts.filter((a: any) => (a.parent_id ?? null) === parentId)

  const toggle = (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const openNew = (parentId: number | null = null) => {
    setEditing(null)
    setForm({ code: '', name: '', type: 'asset', parent_id: parentId ? String(parentId) : '', opening_balance: 0, is_active: true, notes: '' })
    setShowModal(true)
  }

  const openEdit = (a: any) => {
    setEditing(a)
    setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id ? String(a.parent_id) : '', opening_balance: a.opening_balance || 0, is_active: a.is_active, notes: a.notes || '' })
    setShowModal(true)
  }

  const renderNode = (account: any, depth = 0) => {
    const kids = childrenOf(account.id)
    const hasKids = kids.length > 0
    const isExpanded = expanded.has(account.id)
    return (
      <div key={account.id}>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" style={{ marginRight: depth * 20 }}>
          <div className="flex items-center gap-2 min-w-0">
            {hasKids ? (
              <button onClick={() => toggle(account.id)} className="text-gray-500">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : <span className="w-4" />}
            <span className="font-mono text-xs text-gray-500">{account.code}</span>
            <span className={`font-medium truncate ${TYPE_COLORS[account.type] || ''}`}>{account.name}</span>
            <span className="text-xs text-gray-400">({TYPE_LABELS[account.type]})</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{formatMoney(account.balance, symbol)}</span>
            <button onClick={() => openEdit(account)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => { if (window.confirm(`حذف ${account.name}؟`)) deleteMutation.mutate(account.id) }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => openNew(account.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="إضافة فرعي"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
        {hasKids && isExpanded && (
          <div className="mt-1 space-y-1">
            {kids.map((c: any) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const roots = childrenOf(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">شجرة الحسابات</h1>
        <Button onClick={() => openNew(null)}><Plus className="w-4 h-4" /> إضافة حساب</Button>
      </div>
      <Card>
        {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
        {!isLoading && accounts.length === 0 && <p className="text-sm text-gray-500">لا توجد حسابات. أضف حسابات أو استخدم التهيئة.</p>}
        <div className="space-y-2">
          {roots.map((a: any) => renderNode(a, 0))}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل حساب' : 'إضافة حساب'}>
        <form onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate({
            code: form.code,
            name: form.name,
            type: form.type,
            parent_id: form.parent_id ? Number(form.parent_id) : null,
            opening_balance: Number(form.opening_balance) || 0,
            is_active: form.is_active,
            notes: form.notes || null,
          })
        }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="رمز الحساب" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label="اسم الحساب" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">الحساب الأب</label>
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                <option value="">بدون (جذر)</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <Input label="الرصيد الافتتاحي" type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) })} />
            <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}