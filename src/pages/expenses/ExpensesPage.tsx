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

export default function ExpensesPage() {
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data: expensesRes, isLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: async () => {
      const res = await api.get(`/expenses?page=${page}`)
      return res.data
    },
  })
  const expenses = expensesRes?.data
  const expensesMeta = expensesRes ? { current_page: expensesRes.current_page, last_page: expensesRes.last_page, total: expensesRes.total, per_page: expensesRes.per_page } : null

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/expenses/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const columns = [
    { key: 'category', header: 'الفئة' },
    { key: 'amount', header: 'المبلغ', render: (e: any) => `${e.amount} ر.س` },
    { key: 'expense_date', header: 'التاريخ' },
    { key: 'description', header: 'الوصف' },
    { key: 'is_approved', header: 'معتمد', render: (e: any) => e.is_approved ? 'نعم' : 'لا' },
    { key: 'actions', header: 'الإجراءات', render: (e: any) => (
      <button onClick={() => deleteMutation.mutate(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> إضافة مصروف</Button>
      </div>
      <Card>
        <DataTable data={expenses || []} columns={columns} loading={isLoading} emptyMessage="لا توجد مصروفات" />
        <Pagination meta={expensesMeta} onPageChange={setPage} />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة مصروف">
        <ExpenseForm onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['expenses'] }) }} />
      </Modal>
    </div>
  )
}

function ExpenseForm({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'cash',
  })
  const mutation = useMutation({
    mutationFn: async (data: any) => { await api.post('/expenses', data) },
    onSuccess,
  })
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate(formData) }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="الفئة" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
      <Input label="المبلغ" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
      <Input label="التاريخ" type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required />
      <Input label="الوصف" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>حفظ</Button>
      </div>
    </form>
  )
}