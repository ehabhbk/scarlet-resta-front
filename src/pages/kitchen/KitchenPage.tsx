import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import {
  ChefHat,
  CheckCircle,
  Clock,
  RefreshCw,
  Utensils,
  AlertCircle,
  Flame,
} from 'lucide-react'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  served: 'تم التقديم',
  cancelled: 'ملغي',
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المطبخ',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتقديم',
  served: 'تم التقديم',
}

const statusClass = (status: string) => {
  if (status === 'ready') return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
  if (status === 'preparing') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
  if (status === 'served') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
}

const elapsedMinutes = (createdAt: string) => {
  const start = new Date(createdAt).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((Date.now() - start) / 60000))
}

export default function KitchenPage() {
  const queryClient = useQueryClient()
  const canUpdateKitchen = useAuthStore((state) => state.user?.permissions?.includes('update_kitchen_order') || false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const { data: kitchenOrders, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      const res = await api.get('/kitchen/orders')
      setLastUpdated(new Date())
      return res.data.orders || []
    },
    refetchInterval: 10000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      await api.post(`/kitchen/order-items/${itemId}/status`, { kitchen_status: status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
    onError: () => toast.error('تعذر تحديث حالة الصنف'),
  })

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await api.post(`/orders/${orderId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
      toast.success('تم تحديث حالة الطلب')
    },
    onError: () => toast.error('تعذر تحديث حالة الطلب'),
  })

  const orders = kitchenOrders || []
  const allItems = orders.flatMap((order: any) => order.items || [])
  const counters = {
    orders: orders.length,
    received: orders.filter((order: any) => ['pending', 'confirmed'].includes(order.status)).length,
    pending: allItems.filter((item: any) => ['pending', 'confirmed'].includes(item.kitchen_status)).length,
    preparing: allItems.filter((item: any) => item.kitchen_status === 'preparing').length,
    ready: allItems.filter((item: any) => item.kitchen_status === 'ready').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">شاشة المطبخ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            متابعة الطلبات وحالة تحضير كل صنف
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            تحديث تلقائي كل 10 ثوانٍ
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الآن
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">طلبات مستلمة</p>
              <p className="text-2xl font-bold text-indigo-600">{counters.received}</p>
            </div>
            <Utensils className="w-6 h-6 text-indigo-500" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">طلبات نشطة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{counters.orders}</p>
            </div>
            <Utensils className="w-6 h-6 text-primary" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">بانتظار البدء</p>
              <p className="text-2xl font-bold text-amber-600">{counters.pending}</p>
            </div>
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">قيد التحضير</p>
              <p className="text-2xl font-bold text-blue-600">{counters.preparing}</p>
            </div>
            <Flame className="w-6 h-6 text-blue-500" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">أصناف جاهزة</p>
              <p className="text-2xl font-bold text-green-600">{counters.ready}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <p className="text-center py-12 text-gray-500">جاري تحميل طلبات المطبخ...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-gray-700 dark:text-gray-200">لا توجد طلبات في المطبخ</p>
            <p className="text-sm mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
            <p className="text-xs text-gray-400 mt-3">
              آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order: any) => {
            const minutes = elapsedMinutes(order.created_at)
            const urgent = minutes >= 20
            const allReady =
              (order.items || []).length > 0 &&
              (order.items || []).every((item: any) => item.kitchen_status === 'ready')

            return (
              <Card
                key={order.id}
                className={`border-r-4 ${
                  urgent
                    ? 'border-r-red-500'
                    : order.status === 'ready'
                      ? 'border-r-green-500'
                      : 'border-r-amber-500'
                }`}
                padding="sm"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.table ? `طاولة ${order.table}` : 'سفري'} •{' '}
                      {order.type === 'dine_in'
                        ? 'داخل المطعم'
                        : order.type === 'delivery'
                          ? 'توصيل'
                          : 'سفري'}
                    </p>
                  </div>
                  <div className="text-left">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusClass(
                        order.status
                      )}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                    <p
                      className={`text-xs mt-2 flex items-center justify-end gap-1 ${
                        urgent ? 'text-red-600 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {minutes} دقيقة
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 py-3">
                  {(order.items || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {item.product || 'صنف محذوف'} × {item.quantity}
                          </p>
                          {item.stations?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.stations.map((station: any, index: number) => (
                                <span
                                  key={`${item.id}-${index}`}
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{
                                    borderColor: station.station_color || '#d1d5db',
                                    color: station.station_color || '#6b7280',
                                  }}
                                >
                                  {station.station}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-1 rounded-full text-xs ${statusClass(
                            item.kitchen_status
                          )}`}
                        >
                          {STATUS_LABELS[item.kitchen_status] || item.kitchen_status}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded p-2 mb-2">
                          ملاحظة: {item.notes}
                        </p>
                      )}

                      {canUpdateKitchen && <div className="flex gap-2">
                        {['pending', 'confirmed'].includes(item.kitchen_status) && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({ itemId: item.id, status: 'preparing' })
                            }
                            loading={updateStatusMutation.isPending}
                          >
                            بدء التحضير
                          </Button>
                        )}
                        {item.kitchen_status === 'preparing' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({ itemId: item.id, status: 'ready' })
                            }
                            loading={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4" />
                            جاهز
                          </Button>
                        )}
                        {item.kitchen_status === 'ready' && (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            جاهز للتقديم
                          </span>
                        )}
                      </div>}
                    </div>
                  ))}
                </div>

                {allReady && canUpdateKitchen ? (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      className="w-full"
                      onClick={() =>
                        updateOrderStatusMutation.mutate({ orderId: order.id, status: 'served' })
                      }
                      loading={updateOrderStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4" />
                      تسليم الطلب
                    </Button>
                  </div>
                ) : urgent ? (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    الطلب متأخر، يرجى الإسراع
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
