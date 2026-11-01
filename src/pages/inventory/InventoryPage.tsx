import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: async () => {
      const res = await api.get(`/inventory-items?search=${search}`)
      return res.data.data
    },
  })

  const { data: units } = useQuery({
    queryKey: ['inventory-units'],
    queryFn: async () => {
      const res = await api.get('/inventory-units')
      return res.data.units
    },
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers')
      return res.data.suppliers
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/inventory-items/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const columns = [
    { key: 'name', header: 'اسم الصنف' },
    { key: 'sku', header: 'SKU' },
    { key: 'unit', header: 'الوحدة', render: (item: any) => item.unit?.abbreviation || '-' },
    { key: 'current_stock', header: 'المخزون', render: (item: any) => (
      <span className={item.current_stock <= item.min_stock ? 'text-red-600 font-bold' : ''}>
        {item.current_stock}
      </span>
    )},
    { key: 'min_stock', header: 'الحد الأدنى' },
    { key: 'cost_per_unit', header: 'التكلفة/وحدة', render: (item: any) => `${item.cost_per_unit} ر.س` },
    { key: 'status', header: 'الحالة', render: (item: any) => (
      item.current_stock <= item.min_stock ? (
        <Badge variant="danger">منخفض</Badge>
      ) : (
        <Badge variant="success">متوفر</Badge>
      )
    )},
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setEditingItem(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  const lowStockCount = items?.filter((i: any) => i.current_stock <= i.min_stock).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المخزون</h1>
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          إضافة صنف
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800">
            يوجد {lowStockCount} صنف بمخزون منخفض
          </span>
        </div>
      )}

      <Card>
        <div className="mb-4">
          <Input
            placeholder="بحث عن صنف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        <DataTable
          data={items || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد أصناف"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'تعديل صنف' : 'إضافة صنف جديد'}
      >
        <InventoryForm
          item={editingItem}
          units={units || []}
          suppliers={suppliers || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
          }}
        />
      </Modal>
    </div>
  )
}

function InventoryForm({ item, units, suppliers, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    unit_id: item?.unit_id || '',
    supplier_id: item?.supplier_id || '',
    current_stock: item?.current_stock || 0,
    min_stock: item?.min_stock || 0,
    cost_per_unit: item?.cost_per_unit || 0,
    sku: item?.sku || '',
    category: item?.category || '',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (item) {
        await api.put(`/inventory-items/${item.id}`, data)
      } else {
        await api.post('/inventory-items', data)
      }
    },
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="اسم الصنف"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة</label>
          <select
            value={formData.unit_id}
            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">اختر الوحدة</option>
            {units.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">المورد</label>
          <select
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">اختر المورد</option>
            {suppliers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="المخزون"
          type="number"
          value={formData.current_stock}
          onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
        />
        <Input
          label="الحد الأدنى"
          type="number"
          value={formData.min_stock}
          onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
        />
      </div>

      <Input
        label="التكلفة/وحدة"
        type="number"
        value={formData.cost_per_unit}
        onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
      />

      <Input
        label="SKU"
        value={formData.sku}
        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>
          {item ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}
