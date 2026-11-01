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

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: async () => {
      const res = await api.get(`/employees?search=${search}`)
      return res.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/employees/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const statusColors: Record<string, 'success' | 'warning' | 'danger'> = {
    active: 'success',
    on_leave: 'warning',
    terminated: 'danger',
  }

  const columns = [
    { key: 'employee_id', header: 'رقم الموظف' },
    { key: 'name', header: 'اسم الموظف' },
    { key: 'job_title', header: 'الوظيفة' },
    { key: 'phone', header: 'الهاتف' },
    { key: 'salary', header: 'الراتب', render: (item: any) => `${item.salary} ر.س` },
    { key: 'status', header: 'الحالة', render: (item: any) => (
      <Badge variant={statusColors[item.status] || 'default'}>{item.status}</Badge>
    )},
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setEditingEmployee(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
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
        <h1 className="text-2xl font-bold text-gray-900">الموظفون</h1>
        <Button onClick={() => { setEditingEmployee(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          إضافة موظف
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="بحث عن موظف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        <DataTable
          data={employees || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد موظفين"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}
      >
        <EmployeeForm
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
          }}
        />
      </Modal>
    </div>
  )
}

function EmployeeForm({ employee, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || '',
    name: employee?.name || '',
    job_title: employee?.job_title || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    hire_date: employee?.hire_date || new Date().toISOString().split('T')[0],
    salary: employee?.salary || 0,
    status: employee?.status || 'active',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (employee) {
        await api.put(`/employees/${employee.id}`, data)
      } else {
        await api.post('/employees', data)
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
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="رقم الموظف"
          value={formData.employee_id}
          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          required
        />
        <Input
          label="اسم الموظف"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <Input
        label="الوظيفة"
        value={formData.job_title}
        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="تاريخ التعيين"
          type="date"
          value={formData.hire_date}
          onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
          required
        />
        <Input
          label="الراتب"
          type="number"
          value={formData.salary}
          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="active">نشط</option>
          <option value="on_leave">في إجازة</option>
          <option value="terminated">منتهي</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>
          {employee ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}
