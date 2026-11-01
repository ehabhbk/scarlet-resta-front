import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Search, Eye, XCircle } from 'lucide-react'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Badge from '../../components/common/data-display/Badge'
import Pagination from '../../components/common/Pagination'

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const queryClient = useQueryClient()

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
    { key: 'type', header: 'النوع', render: (item: any) => 
      item.type === 'dine_in' ? 'داخل المطعم' : item.type === 'takeaway' ? 'سفري' : 'توصيل'
    },
    { key: 'status', header: 'الحالة', render: (item: any) => (
      <Badge variant={statusColors[item.status] || 'default'}>
        {item.status}
      </Badge>
    )},
    { key: 'total_amount', header: 'المبلغ', render: (item: any) => `${item.total_amount} ر.س` },
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
        {!['completed', 'cancelled'].includes(item.status) && (
          <button onClick={() => cancelMutation.mutate({ id: item.id, reason: 'إلغاء من قبل الكاشير' })} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <XCircle className="w-4 h-4" />
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
                <p className="font-bold">{selectedOrder.total_amount} ر.س</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">المنتجات</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>{item.product?.name} x{item.quantity}</span>
                    <span>{item.total_price} ر.س</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">تغيير الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {['confirmed','preparing','ready','served','completed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: s })}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {selectedOrder.payment_status !== 'paid' && (
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
                    <option value="cash">نقدي</option>
                    <option value="card">بطاقة</option>
                    <option value="wallet">محفظة</option>
                  </select>
                  <button
                    onClick={() => paymentMutation.mutate({ id: selectedOrder.id, amount: Number(paymentAmount), method: paymentMethod })}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    تسجيل
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
