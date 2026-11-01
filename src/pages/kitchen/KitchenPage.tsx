import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { ChefHat, CheckCircle } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'

export default function KitchenPage() {
  const queryClient = useQueryClient()

  const { data: kitchenOrders } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      const res = await api.get('/kitchen/orders')
      return res.data.orders
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      await api.post(`/kitchen/order-items/${itemId}/status`, { kitchen_status: status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">شاشة المطبخ</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          تحديث تلقائي
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kitchenOrders?.map((order: any) => (
          <Card key={order.id} className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{order.order_number}</h3>
                <p className="text-sm text-gray-500">
                  {order.table || 'سفري'} • {order.type === 'dine_in' ? 'داخل' : 'سفري'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.product} x{item.quantity}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.kitchen_status === 'ready' ? 'bg-green-100 text-green-700' :
                      item.kitchen_status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.kitchen_status === 'ready' ? 'جاهز' :
                       item.kitchen_status === 'preparing' ? 'قيد التحضير' : 'قيد الانتظار'}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mb-2">ملاحظة: {item.notes}</p>
                  )}
                  <div className="flex gap-2">
                    {item.kitchen_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'preparing' })}
                      >
                        بدء التحضير
                      </Button>
                    )}
                    {item.kitchen_status === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'ready' })}
                      >
                        <CheckCircle className="w-4 h-4" />
                        جاهز
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {(!kitchenOrders || kitchenOrders.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>لا توجد طلبات في المطبخ</p>
        </div>
      )}
    </div>
  )
}
