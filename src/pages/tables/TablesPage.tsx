import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'

export default function TablesPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', search],
    queryFn: async () => {
      const res = await api.get(`/tables?search=${search}`)
      return res.data.data
    },
  })

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get('/areas')
      return res.data.areas
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tables/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })

  const statusColors: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
    available: 'success',
    occupied: 'danger',
    reserved: 'warning',
    cleaning: 'info',
  }

  const columns = [
    { key: 'name', header: 'اسم الطاولة' },
    { key: 'area', header: 'المنطقة', render: (item: any) => item.area?.name || '-' },
    { key: 'capacity', header: 'السعة' },
    { key: 'status', header: 'الحالة', render: (item: any) => (
      <Badge variant={statusColors[item.status] || 'default'}>{item.status}</Badge>
    )},
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setEditingTable(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الطاولات</h1>
        <Button onClick={() => { setEditingTable(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          إضافة طاولة
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="بحث عن طاولة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        <DataTable
          data={tables || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد طاولات"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTable ? 'تعديل طاولة' : 'إضافة طاولة جديدة'}
      >
        <TableForm
          table={editingTable}
          areas={areas || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['tables'] })
          }}
        />
      </Modal>
    </div>
  )
}

function TableForm({ table, areas, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: table?.name || '',
    area_id: table?.area_id || '',
    capacity: table?.capacity || 4,
    status: table?.status || 'available',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (table) {
        await api.put(`/tables/${table.id}`, data)
      } else {
        await api.post('/tables', data)
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
        label="اسم الطاولة"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
        <select
          value={formData.area_id}
          onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">اختر المنطقة</option>
          {areas.map((area: any) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>

      <Input
        label="السعة"
        type="number"
        value={formData.capacity}
        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>
          {table ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}
