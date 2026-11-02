import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { Plus, Trash2, UserRound } from 'lucide-react'
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
      return res.data.roles || res.data.data || res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('تم حذف المستخدم')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر حذف المستخدم')
    },
  })

  const columns = [
    {
      key: 'name',
      header: 'الاسم',
      render: (u: any) => (
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <UserRound className="w-4 h-4" />
          </span>
          <span className="font-medium">{u.name}</span>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'اسم المستخدم',
      render: (u: any) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
          {u.username ? `@${u.username}` : '-'}
        </span>
      ),
    },
    {
      key: 'roles',
      header: 'الدور',
      render: (u: any) => (
        <div className="flex gap-1 flex-wrap">
          {(u.roles || []).map((r: any) => (
            <Badge key={r.id} variant="info">
              {r.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'الحالة',
      render: (u: any) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
            u.is_active
              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
          }`}
        >
          {u.is_active ? 'نشط' : 'معطل'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (u: any) => (
        <button
          onClick={() => {
            if (window.confirm(`هل تريد حذف المستخدم ${u.name}؟`)) {
              deleteMutation.mutate(u.id)
            }
          }}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
          title="حذف"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  const list = Array.isArray(users) ? users : users?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">المستخدمون</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة حسابات الدخول وأدوار الموظفين
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </Button>
      </div>
      <Card>
        <DataTable data={list} columns={columns} loading={isLoading} emptyMessage="لا يوجد مستخدمون" />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مستخدم">
        <UserForm
          roles={Array.isArray(roles) ? roles : roles?.data || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
          }}
        />
      </Modal>
    </div>
  )
}

function UserForm({ roles, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: '',
    is_active: true,
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/admin/users', data)
    },
    onSuccess: () => {
      toast.success('تم إضافة المستخدم')
      onSuccess()
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors
      const firstError = errors ? Object.values(errors)[0] : null
      toast.error(
        (Array.isArray(firstError) ? firstError[0] : firstError) ||
          error?.response?.data?.message ||
          'تعذر إضافة المستخدم'
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...formData,
      username: formData.username.trim().toLowerCase(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="الاسم"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        label="اسم المستخدم"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        placeholder="cashier1"
        autoComplete="off"
        required
      />
      <Input
        label="كلمة المرور"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        minLength={6}
        autoComplete="new-password"
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          الدور
        </label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          required
        >
          <option value="">اختر الدور</option>
          {roles.map((r: any) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded border-gray-300"
        />
        الحساب نشط
      </label>
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          حفظ
        </Button>
      </div>
    </form>
  )
}
