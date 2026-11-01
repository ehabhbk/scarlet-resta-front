import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2, Phone } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${search}`)
      return res.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const typeColors: Record<string, 'default' | 'success' | 'info'> = {
    regular: 'default',
    vip: 'success',
    corporate: 'info',
  }

  const columns = [
    { key: 'name', header: 'اسم العميل' },
    { key: 'phone', header: 'الهاتف', render: (item: any) => (
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-gray-400" />
        {item.phone || '-'}
      </div>
    )},
    { key: 'email', header: 'البريد' },
    { key: 'customer_type', header: 'النوع', render: (item: any) => (
      <Badge variant={typeColors[item.customer_type] || 'default'}>{item.customer_type}</Badge>
    )},
    { key: 'total_orders', header: 'الطلبات' },
    { key: 'total_spent', header: 'إجمالي الشراء', render: (item: any) => `${item.total_spent} ر.س` },
    { key: 'loyalty_points', header: 'النقاط' },
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setEditingCustomer(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
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
        <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
        <Button onClick={() => { setEditingCustomer(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          إضافة عميل
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="بحث عن عميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        <DataTable
          data={customers || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد عملاء"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? 'تعديل عميل' : 'إضافة عميل جديد'}
      >
        <CustomerForm
          customer={editingCustomer}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['customers'] })
          }}
        />
      </Modal>
    </div>
  )
}

function CustomerForm({ customer, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    customer_type: customer?.customer_type || 'regular',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (customer) {
        await api.put(`/customers/${customer.id}`, data)
      } else {
        await api.post('/customers', data)
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
        label="اسم العميل"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        label="الهاتف"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <Input
        label="البريد الإلكتروني"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <Input
        label="العنوان"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">نوع العميل</label>
        <select
          value={formData.customer_type}
          onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="regular">عادي</option>
          <option value="vip">VIP</option>
          <option value="corporate">شركات</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>
          {customer ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}
