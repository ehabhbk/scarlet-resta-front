import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'
import { Plus, Trash2, Lock } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Pagination from '../../components/common/Pagination'

export default function ShiftsPage() {
  const [showModal, setShowModal] = useState(false)
  const [closingShift, setClosingShift] = useState<any>(null)
  const [actualCash, setActualCash] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  const { data: shiftsRes, isLoading } = useQuery({
    queryKey: ['shifts', page],
    queryFn: async () => {
      const res = await api.get(`/shifts?page=${page}`)
      return res.data
    },
  })
  const shifts = shiftsRes?.data
  const meta = shiftsRes ? { current_page: shiftsRes.current_page, last_page: shiftsRes.last_page, total: shiftsRes.total, per_page: shiftsRes.per_page } : null

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/shifts/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
    onError: (error: any) => toast.error(error?.response?.data?.message || 'تعذر حذف الوردية'),
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!closingShift) return
      await api.put(`/shifts/${closingShift.id}`, {
        status: 'closed',
        actual_cash: Number(actualCash) || 0,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setClosingShift(null)
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'تعذر إغلاق الوردية'),
  })

  const columns = [
    { key: 'name', header: 'اسم الوردية' },
    { key: 'user', header: 'المستخدم', render: (s: any) => s.user?.name || '-' },
    { key: 'employees', header: 'الموظفون', render: (s: any) => (s.employees || []).map((employee: any) => employee.name).join('، ') || '-' },
    { key: 'shift_date', header: 'التاريخ' },
    { key: 'start_time', header: 'بداية' },
    { key: 'end_time', header: 'نهاية' },
    { key: 'status', header: 'الحالة' },
    { key: 'actions', header: 'الإجراءات', render: (s: any) => (
      <div className="flex gap-2">
        {s.status === 'open' && user?.permissions?.includes('close_shift') && (
          <button
            onClick={() => {
                setClosingShift(s)
                setActualCash(String(s.expected_cash || s.opening_cash || 0))
              }}
            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
            title="إغلاق الوردية"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}
        {user?.permissions?.includes('view_all_shifts') && (
          <button onClick={() => deleteMutation.mutate(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف الوردية">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الورديات</h1>
        {user?.permissions?.includes('open_shift') && (
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> فتح وردية</Button>
        )}
      </div>
      <Card>
        <DataTable data={shifts || []} columns={columns} loading={isLoading} emptyMessage="لا توجد ورديات" />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="فتح وردية">
        <ShiftForm onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['shifts'] }) }} />
      </Modal>
      <Modal isOpen={!!closingShift} onClose={() => setClosingShift(null)} title={`إغلاق وردية ${closingShift?.user?.name || ''}`}>
        <div className="space-y-4">
          <Input label="النقد الفعلي" type="number" min={0} value={actualCash} onChange={(event) => setActualCash(event.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setClosingShift(null)}>إلغاء</Button>
            <Button
              variant="danger"
              loading={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >إغلاق الوردية</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ShiftForm({ onClose, onSuccess }: any) {
  const user = useAuthStore((state) => state.user)
  const symbol = useSettingsStore((state) => state.symbol)
  const [employeeIds, setEmployeeIds] = useState<number[]>([])
  const { data: options, isLoading: optionsLoading, isError: optionsError, refetch: refetchOptions } = useQuery({
    queryKey: ['shift-options'],
    queryFn: async () => (await api.get('/shifts/options')).data,
  })
  const employees = options?.employees || []
  const [formData, setFormData] = useState({
    name: '',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    opening_cash: 0,
  })
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/shifts/open', {
        ...data,
        employee_ids: employeeIds,
      })
    },
    onSuccess,
    onError: (error: any) => toast.error(error?.response?.data?.message || 'تعذر فتح الوردية'),
  })
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (user?.permissions?.includes('manage_shift_employees') && optionsError) {
      const result = await refetchOptions()
      if (result.isError) {
        toast.error('تعذر تحميل قائمة الموظفين؛ أعد المحاولة قبل فتح الوردية.')
      } else {
        toast.error('تم تحميل قائمة الموظفين؛ تحقق من اختيار الموظفين ثم احفظ الوردية.')
      }
      return
    }
    mutation.mutate(formData)
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {optionsLoading && <p className="text-sm text-gray-500">جارٍ تحميل الكاشيرين والموظفين...</p>}
      {optionsError && (
        <div className="flex items-center justify-between gap-2 text-sm text-red-600">
          <span>تعذر تحميل بيانات الوردية من الخادم.</span>
          <button type="button" className="underline" onClick={() => void refetchOptions()}>إعادة المحاولة</button>
        </div>
      )}
      {options?.permissions?.manage_shift_employees && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-700">الموظفون العاملون في هذه الوردية</legend>
          {employees.length === 0 && !optionsLoading && !optionsError && (
            <p className="text-sm text-gray-500">لا يوجد موظفون يوميون أو بنظام النسبة متاحون للاختيار.</p>
          )}
          {employees.map((employee: any) => (
            <label key={employee.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={employeeIds.includes(Number(employee.id))}
                onChange={(event) => setEmployeeIds((current) => event.target.checked
                  ? [...current, Number(employee.id)]
                  : current.filter((id) => id !== Number(employee.id)))}
              />
              {employee.name} ({employee.pay_type === 'daily' ? formatMoney(employee.pay_rate, symbol) : `${employee.pay_rate}% من إجمالي إيراد الوردية`})
            </label>
          ))}
        </fieldset>
      )}
      <Input label="اسم الوردية" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      <Input label="التاريخ" type="date" value={formData.shift_date} onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="بداية" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
        <Input label="نهاية" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
      </div>
      <Input label="النقد الافتتاحي" type="number" value={formData.opening_cash} onChange={(e) => setFormData({ ...formData, opening_cash: Number(e.target.value) })} />
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={
            mutation.isPending
            || optionsLoading
          }
        >حفظ الوردية</Button>
      </div>
    </form>
  )
}