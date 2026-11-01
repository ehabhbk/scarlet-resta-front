import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'

export default function RolesPage() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/admin/roles')
      return res.data.roles || res.data.data || res.data || []
    },
  })

  const { data: permissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await api.get('/admin/permissions')
      return res.data.permissions || res.data.data || res.data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/admin/roles/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-roles'] }),
  })

  const columns = [
    { key: 'name', header: 'اسم الدور' },
    { key: 'permissions', header: 'الصلاحيات', render: (r: any) => (r.permissions || []).length },
    { key: 'actions', header: 'الإجراءات', render: (r: any) => (
      <button onClick={() => deleteMutation.mutate(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الأدوار والصلاحيات</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> إضافة دور</Button>
      </div>
      <Card>
        <DataTable data={roles || []} columns={columns} loading={isLoading} emptyMessage="لا توجد أدوار" />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة دور" size="lg">
        <RoleForm permissions={permissions || []} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['admin-roles'] }) }} />
      </Modal>
    </div>
  )
}

function RoleForm({ permissions, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: '', selected: [] as string[] })
  const mutation = useMutation({
    mutationFn: async (data: any) => { await api.post('/admin/roles', data) },
    onSuccess,
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ name: formData.name, permissions: formData.selected })
  }
  const toggle = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      selected: prev.selected.includes(name) ? prev.selected.filter((n) => n !== name) : [...prev.selected, name],
    }))
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="اسم الدور" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">الصلاحيات</label>
        <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
          {permissions.map((p: any) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.selected.includes(p.name)} onChange={() => toggle(p.name)} />
              {p.name}
            </label>
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