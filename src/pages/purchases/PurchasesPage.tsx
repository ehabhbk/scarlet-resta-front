import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'

export default function PurchasesPage() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await api.get('/purchases')
      return res.data.data || res.data
    },
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers')
      return res.data.suppliers || []
    },
  })

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: async () => {
      const res = await api.get('/inventory-items')
      return res.data.data || []
    },
  })

  const columns = [
    { key: 'purchase_number', header: 'رقم الطلب' },
    { key: 'supplier', header: 'المورد', render: (p: any) => p.supplier?.name || '-' },
    { key: 'status', header: 'الحالة', render: (p: any) => <Badge variant={p.status === 'received' ? 'success' : 'warning'}>{p.status}</Badge> },
    { key: 'total_amount', header: 'المبلغ', render: (p: any) => `${p.total_amount} ر.س` },
    { key: 'payment_status', header: 'الدفع' },
    { key: 'order_date', header: 'التاريخ' },
  ]

  const list = Array.isArray(purchases) ? purchases : (purchases?.data || [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المشتريات</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> إضافة مشترى</Button>
      </div>
      <Card>
        <DataTable data={list} columns={columns} loading={isLoading} emptyMessage="لا توجد مشتريات" />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة طلب شراء" size="lg">
        <PurchaseForm suppliers={suppliers || []} items={items || []} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['purchases'] }) }} />
      </Modal>
    </div>
  )
}

function PurchaseForm({ suppliers, items, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_number: `PO-${Date.now()}`,
    order_date: new Date().toISOString().split('T')[0],
    status: 'ordered',
    notes: '',
  })
  const [lineItems, setLineItems] = useState<any[]>([{ inventory_item_id: '', quantity: 1, unit_cost: 0 }])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/purchases', data)
    },
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      items: lineItems.map(li => ({
        inventory_item_id: Number(li.inventory_item_id),
        quantity: Number(li.quantity),
        unit_cost: Number(li.unit_cost),
      })),
    }
    mutation.mutate(payload)
  }

  const addLine = () => setLineItems([...lineItems, { inventory_item_id: '', quantity: 1, unit_cost: 0 }])
  const removeLine = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: string, value: any) => {
    const next = [...lineItems]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'inventory_item_id') {
      const it = items.find((i: any) => i.id === Number(value))
      if (it) next[idx].unit_cost = it.cost_per_unit
    }
    setLineItems(next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">المورد</label>
          <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
            <option value="">اختر المورد</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <Input label="رقم الطلب" value={formData.purchase_number} onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="تاريخ الطلب" type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
            <option value="draft">مسودة</option>
            <option value="ordered">تم الطلب</option>
            <option value="received">مستلم</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">المنتجات</label>
          <Button type="button" size="sm" variant="secondary" onClick={addLine}>+ إضافة</Button>
        </div>
        <div className="space-y-2">
          {lineItems.map((li, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 items-end">
              <div className="col-span-2">
                <select value={li.inventory_item_id} onChange={(e) => updateLine(idx, 'inventory_item_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">اختر الصنف</option>
                  {items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
              </div>
              <Input type="number" value={li.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
              <div className="flex gap-1">
                <Input type="number" value={li.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)} />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>حفظ</Button>
      </div>
    </form>
  )
}