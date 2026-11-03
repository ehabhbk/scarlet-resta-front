import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { Search, Eye, XCircle, Trash2 } from 'lucide-react'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'
import Pagination from '../../components/common/Pagination'
import { mediaUrl } from '../../store/settingsStore'

export default function OrdersPage() {
  const { symbol, paymentMethods, load } = useSettingsStore()
  const user = useAuthStore((state) => state.user)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const queryClient = useQueryClient()
  const can = (permission: string) => user?.permissions?.includes(permission) ?? false

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!paymentMethods.some((method) => method.value === paymentMethod)) {
      setPaymentMethod(paymentMethods[0]?.value || '')
    }
  }, [paymentMethods, paymentMethod])

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ['orders', search, statusFilter, page],
    queryFn: async () => {
      let url = `/orders?search=${search}&page=${page}`
      if (statusFilter) url += `&status=${statusFilter}`
      const res = await api.get(url)
      return res.data
    },
  })
  const orders = ordersRes?.data
  const ordersMeta = ordersRes ? { current_page: ordersRes.current_page, last_page: ordersRes.last_page, total: ordersRes.total, per_page: ordersRes.per_page } : null

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/orders/${id}/cancel`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.post(`/orders/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const paymentMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: number; amount: number; method: string }) => {
      await api.post(`/orders/${id}/payment`, { amount, method })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const changePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, method }: { id: number; method: string }) => {
      await api.put(`/orders/${id}`, { payment_method: method })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (selectedOrder) {
        const res = await api.get(`/orders/${selectedOrder.id}`)
        setSelectedOrder(res.data?.data || res.data)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر تعديل طريقة الدفع')
    },
  })

  const refundMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/orders/${id}/refund`, { reason: 'استرداد من إدارة الطلبات' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
      toast.success('تم استرداد المبلغ')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر استرداد الطلب')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/orders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
      toast.success('تم حذف الطلب')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر حذف الطلب')
    },
  })

  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'info',
    ready: 'success',
    served: 'success',
    completed: 'success',
    cancelled: 'danger',
  }

  const columns = [
    { key: 'order_number', header: 'رقم الطلب' },
    { key: 'cashier', header: 'الكاشير', render: (item: any) => item.cashier?.name || '-' },
    { key: 'type', header: 'النوع', render: (item: any) => 
      item.type === 'dine_in' ? 'داخل المطعم' : item.type === 'takeaway' ? 'سفري' : 'توصيل'
    },
    { key: 'status', header: 'الحالة', render: (item: any) => (
      <Badge variant={statusColors[item.status] || 'default'}>
        {item.status}
      </Badge>
    )},
    { key: 'total_amount', header: 'المبلغ', render: (item: any) => formatMoney(item.total_amount, symbol) },
    { key: 'payment_status', header: 'الدفع', render: (item: any) => (
      <Badge variant={item.payment_status === 'paid' ? 'success' : 'warning'}>
        {item.payment_status}
      </Badge>
    )},
    { key: 'created_at', header: 'التاريخ', render: (item: any) => new Date(item.created_at).toLocaleString('ar-SA') },
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => setSelectedOrder(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Eye className="w-4 h-4" />
        </button>
        {can('cancel_orders') && !['completed', 'cancelled'].includes(item.status) && (
          <button onClick={() => cancelMutation.mutate({ id: item.id, reason: 'إلغاء من قبل الكاشير' })} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <XCircle className="w-4 h-4" />
          </button>
        )}
        {can('delete_orders') && (
          <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-red-700 hover:bg-red-50 rounded" title="حذف الطلب">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الطلبات</h1>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="بحث عن طلب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">مؤكد</option>
            <option value="preparing">قيد التحضير</option>
            <option value="ready">جاهز</option>
            <option value="served">تم التقديم</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>

        <DataTable
          data={orders || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد طلبات"
        />
        <Pagination meta={ordersMeta} onPageChange={setPage} />
      </Card>

      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`تفاصيل الطلب ${selectedOrder?.order_number}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge variant={statusColors[selectedOrder.status] || 'default'}>{selectedOrder.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">المبلغ الإجمالي</p>
                <p className="font-bold">{formatMoney(selectedOrder.total_amount, symbol)}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">المنتجات</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded">
                    <div className="flex min-w-0 items-center gap-3">
                      {item.product?.image && (
                        <img src={mediaUrl(item.product.image)} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate">
                          {item.product?.name} × {item.quantity}
                          {item.size?.name && <span className="text-xs text-gray-400"> ({item.size.name})</span>}
                        </p>
                        {item.modifiers?.length > 0 && (
                          <p className="truncate text-xs text-gray-500">
                            {item.modifiers
                              .map((modifier: any) =>
                                [modifier.modifier, modifier.option].filter(Boolean).join(': ') || modifier.name
                              )
                              .join('، ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0">{formatMoney(item.total_price, symbol)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">تغيير الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {['confirmed','preparing','ready','served','completed'].map((s) => (
                    can('edit_orders') && (
                      <button
                        key={s}
                        onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: s })}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        {s}
                      </button>
                    )
                  ))}
              </div>
            </div>

            {can('edit_orders') && selectedOrder.payment_status !== 'paid' && (
              <div>
                <h3 className="font-semibold mb-2">تسجيل دفعة</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="المبلغ"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                  <button
                    disabled={!paymentMethod || paymentMethods.length === 0}
                    onClick={() => paymentMutation.mutate({ id: selectedOrder.id, amount: Number(paymentAmount), method: paymentMethod })}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    تسجيل
                  </button>
                </div>
              </div>
            )}
            {can('edit_orders') && paymentMethods.length > 0 && selectedOrder.payment_status !== 'unpaid' && (
              <div>
                <h3 className="font-semibold mb-2">تغيير طريقة دفع الطلب</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                  <button
                    disabled={!paymentMethod || paymentMethod === selectedOrder.payment_method || changePaymentMethodMutation.isPending}
                    onClick={() => changePaymentMethodMutation.mutate({ id: selectedOrder.id, method: paymentMethod })}
                    className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                  >
                    حفظ الطريقة
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">سيتم تحديث طريقة الدفعات المسجلة للطلب دون تغيير إجمالي المدفوع.</p>
              </div>
            )}
            {can('refund_orders') && ['paid', 'partial'].includes(selectedOrder.payment_status) && (
              <button
                onClick={() => refundMutation.mutate(selectedOrder.id)}
                disabled={refundMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-white disabled:opacity-50"
              >
                استرداد الطلب
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
