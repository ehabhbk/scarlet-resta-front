import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Pagination from '../../components/common/Pagination'

export default function ShiftsPage() {
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data: shiftsRes, isLoading } = useQuery({
    queryKey: ['shifts', page],
    queryFn: async () => {
      const res = await api.get(`/shifts?page=${page}`)
      return res.data
    },
  })
  const shifts = shiftsRes?.data
  const meta = shiftsRes ? { current_page: shiftsRes.current_page, last_page: shiftsRes.last_page, total: shiftsRes.total, per_page: shiftsRes.per_page } : null

  const { data: users } = useQuery({
    queryKey: ['users-all'],
    queryFn: async () => {
      const res = await api.get('/admin/users')
      return res.data.data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/shifts/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const columns = [
    { key: 'name', header: 'اسم الوردية' },
    { key: 'user', header: 'المستخدم', render: (s: any) => s.user?.name || '-' },
    { key: 'shift_date', header: 'التاريخ' },
    { key: 'start_time', header: 'بداية' },
    { key: 'end_time', header: 'نهاية' },
    { key: 'status', header: 'الحالة' },
    { key: 'actions', header: 'الإجراءات', render: (s: any) => (
      <button onClick={() => deleteMutation.mutate(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الورديات</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> فتح وردية</Button>
      </div>
      <Card>
        <DataTable data={shifts || []} columns={columns} loading={isLoading} emptyMessage="لا توجد ورديات" />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="فتح وردية">
        <ShiftForm users={users || []} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['shifts'] }) }} />
      </Modal>
    </div>
  )
}

function ShiftForm({ users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    opening_cash: 0,
  })
  const mutation = useMutation({
    mutationFn: async (data: any) => { await api.post('/shifts', data) },
    onSuccess,
  })
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate(formData) }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">المستخدم</label>
        <select value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
          <option value="">اختر المستخدم</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <Input label="اسم الوردية" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      <Input label="التاريخ" type="date" value={formData.shift_date} onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="بداية" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
        <Input label="نهاية" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
      </div>
      <Input label="النقد الافتتاحي" type="number" value={formData.opening_cash} onChange={(e) => setFormData({ ...formData, opening_cash: e.target.value })} />
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>حفظ</Button>
      </div>
    </form>
  )
}