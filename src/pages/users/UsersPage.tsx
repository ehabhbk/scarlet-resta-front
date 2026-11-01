import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users')
      return res.data.data || res.data
    },
  })

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/admin/roles')
      return res.data.data || res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/admin/users/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'email', header: 'البريد' },
    { key: 'roles', header: 'الدور', render: (u: any) => (
      <div className="flex gap-1 flex-wrap">
        {(u.roles || []).map((r: any) => <Badge key={r.id} variant="info">{r.name}</Badge>)}
      </div>
    )},
    { key: 'is_active', header: 'الحالة', render: (u: any) => u.is_active ? 'نشط' : 'معطل' },
    { key: 'actions', header: 'الإجراءات', render: (u: any) => (
      <button onClick={() => deleteMutation.mutate(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
    )},
  ]

  const list = Array.isArray(users) ? users : (users?.data || [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> إضافة مستخدم</Button>
      </div>
      <Card>
        <DataTable data={list} columns={columns} loading={isLoading} emptyMessage="لا توجد مستخدمين" />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مستخدم">
        <UserForm roles={Array.isArray(roles) ? roles : (roles?.data || [])} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }} />
      </Modal>
    </div>
  )
}

function UserForm({ roles, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    restaurant_id: 1,
    is_active: true,
  })
  const mutation = useMutation({
    mutationFn: async (data: any) => { await api.post('/admin/users', data) },
    onSuccess,
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ ...formData })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="الاسم" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      <Input label="البريد" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
      <Input label="كلمة المرور" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">الدور</label>
        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
          <option value="">اختر الدور</option>
          {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>حفظ</Button>
      </div>
    </form>
  )
}