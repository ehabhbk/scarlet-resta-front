import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore, formatMoney, mediaUrl } from '../../store/settingsStore'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Wallet,
  Search,
  User,
  Clock,
  DollarSign,
  Printer,
  X,
  RefreshCw,
  Eye,
  Pencil,
  RotateCcw,
  Lock,
  Unlock,
  ChevronDown,
} from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Modal from '../../components/common/modals/Modal'
import Input from '../../components/common/inputs/Input'

interface CartModifier {
  modifier_id: number
  modifier_option_id: number
  name: string
  price_modifier: number
}

interface CartItem {
  product_id: number
  name: string
  image?: string
  price: number
  quantity: number
  size_id?: number
  size_name?: string
  notes?: string
  modifiers: CartModifier[]
}

interface Receipt {
  cart: CartItem[]
  subtotal: number
  tax: number
  total: number
  discount: number
  paymentMethod: string
  paymentLabel: string
  tableId: number | null
  tableName?: string
  orderType: 'dine_in' | 'takeaway'
  orderNumber?: string
  customerName: string
  customerPhone: string
  currency: string
  date: string
  cashier: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

function PaymentIcon({ method, className }: { method: string; className?: string }) {
  if (method === 'cash') return <Banknote className={className} />
  if (method === 'wallet') return <Wallet className={className} />
  return <CreditCard className={className} />
}

export default function POSPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [splitPayment, setSplitPayment] = useState(false)
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([])
  const [discount, setDiscount] = useState(0)
  const [tableId, setTableId] = useState<number | null>(null)
  const [configuringProduct, setConfiguringProduct] = useState<any>(null)

  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedModifierOptionIds, setSelectedModifierOptionIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [orderDraftItems, setOrderDraftItems] = useState<any[]>([])
  const [orderEditPaymentMethod, setOrderEditPaymentMethod] = useState('cash')
  const [actualCash, setActualCash] = useState(0)
  const [openingCash, setOpeningCash] = useState(0)
  const [shiftNow, setShiftNow] = useState(new Date())
  const [refundOrderTarget, setRefundOrderTarget] = useState<any>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundReason, setRefundReason] = useState('استرداد من نقطة البيع')

  const {
    symbol: currencySymbol,
    taxRate,
    restaurant: restaurantData,
    paymentMethods,
  } = useSettingsStore()
  const loadSettings = useSettingsStore((s) => s.load)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (paymentMethods.length === 0) return
    if (!paymentMethods.some((method) => method.value === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].value)
    }
  }, [paymentMethods, paymentMethod])

  const { data: shiftData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts-current'],
    queryFn: async () => {
      const res = await api.get('/shifts/current')
      return res.data
    },
    refetchInterval: 30000,
  })

  const openShift = shiftData?.shift

  const { data: latestShiftData } = useQuery({
    queryKey: ['shifts-latest'],
    queryFn: async () => {
      const res = await api.get('/shifts', { params: { per_page: 1, page: 1 } })
      return res.data
    },
    enabled: showShiftModal && !openShift,
  })

  const nextShiftNumber = (() => {
    const latestId = Number(latestShiftData?.data?.[0]?.id) || 0
    return latestId + 1
  })()

  const formatShiftDate = (value?: string | null) => {
    if (!value) return '-'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime())
      ? String(value).slice(0, 10)
      : parsed.toLocaleDateString('ar-EG')
  }

  const formatShiftTime = (value?: string | null) => {
    if (!value) return '-'
    if (String(value).includes('T')) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
    }
    return String(value).slice(0, 5)
  }

  const { data: ordersData, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['pos-orders', openShift?.id],
    queryFn: async () => {
      if (!openShift?.id) return []
      const allOrders: any[] = []
      let page = 1
      let lastPage: number
      do {
        const res = await api.get('/orders', {
          params: { shift_id: openShift.id, per_page: 100, page },
        })
        const payload = res.data
        const pageOrders = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        allOrders.push(...pageOrders)
        const meta = payload?.meta || payload
        lastPage = Number(meta?.last_page) || 1
        page = (Number(meta?.current_page) || page) + 1
      } while (page <= lastPage)
      return allOrders
    },
    enabled: showOrdersModal && !!openShift?.id,
  })

  const { data: selectedOrderDetails, isLoading: orderDetailsLoading, isError: orderDetailsError } = useQuery({
    queryKey: ['pos-order', selectedOrder?.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${selectedOrder.id}`)
      return res.data?.order || res.data?.data?.order || res.data?.data || res.data
    },
    enabled: !!selectedOrder?.id,
  })

  const { data: orderProducts, isLoading: orderProductsLoading, isError: orderProductsError } = useQuery({
    queryKey: ['pos-order-products'],
    queryFn: async () => {
      const res = await api.get('/products/available')
      const payload = res.data
      return Array.isArray(payload?.products)
          ? payload.products
          : Array.isArray(payload?.data)
            ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
    },
    enabled: showOrdersModal,
  })

  const { user: authUser } = useAuthStore()
  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/admin/roles')
      return res.data.roles || res.data.data || res.data
    },
    enabled: showOrdersModal,
  })

  const userPermissions = (() => {
    const roleName = authUser?.roles?.[0]?.name
    const role = (Array.isArray(rolesData) ? rolesData : []).find((r: any) => r.name === roleName)
    return (role?.permissions || []).map((p: any) => p.name)
  })()

  const canCancel = userPermissions.includes('cancel_orders') || ['Super Admin', 'Admin'].includes(authUser?.roles?.[0]?.name || '')
  const canRefund = userPermissions.includes('delete_orders') || userPermissions.includes('edit_orders') || ['Super Admin', 'Admin'].includes(authUser?.roles?.[0]?.name || '')
  const canEditOrders = userPermissions.includes('edit_orders') || ['Super Admin', 'Admin'].includes(authUser?.roles?.[0]?.name || '')
  const canDeleteOrders = userPermissions.includes('delete_orders') || ['Super Admin', 'Admin'].includes(authUser?.roles?.[0]?.name || '')

  const cancelOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/orders/${id}/cancel`, { reason: 'إلغاء من نقطة البيع' })
    },
    onSuccess: () => {
      refetchOrders()
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      toast.success('تم إلغاء الطلب')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذر إلغاء الطلب'),
  })

  const refundOrderMutation = useMutation({
    mutationFn: async ({ id, amount, reason }: { id: number; amount: number; reason: string }) => {
      const res = await api.post(`/orders/${id}/refund`, { amount, reason })
      return res.data
    },
    onSuccess: (data) => {
      refetchOrders()
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setRefundOrderTarget(null)
      setSelectedOrder(null)
      toast.success(data?.message || 'تم استرداد المبلغ')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذر استرداد المبلغ'),
  })

  const deleteOrderMutation = useMutation({
    mutationFn: async (order: any) => {
      const paid = Number(order.amount_paid || 0) - Number(order.change_due || 0)
      if (paid > 0) {
        await api.post(`/orders/${order.id}/refund`, {
          amount: paid,
          reason: 'حذف الطلب مع استرداد المبلغ',
        })
      }
      await api.delete(`/orders/${order.id}`)
    },
    onSuccess: () => {
      refetchOrders()
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setSelectedOrder(null)
      toast.success('تم حذف الطلب واسترداد المبلغ إن وجد')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذر حذف الطلب'),
  })

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!editingOrder) throw new Error('لا يوجد طلب محدد للتعديل')
      const previousPaid = Number(editingOrder.amount_paid) || 0
      const items = orderDraftItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        size_id: item.size_id || undefined,
        modifier_options: item.modifier_options || [],
      }))
      await api.put(`/orders/${editingOrder.id}`, { items })
      const refreshed = await api.get(`/orders/${editingOrder.id}`)
      const updatedOrder =
        refreshed.data?.order || refreshed.data?.data?.order || refreshed.data?.data || refreshed.data
      const updatedTotal = Number(updatedOrder?.total_amount)
      if (!Number.isFinite(updatedTotal)) {
        throw new Error('تم تعديل الطلب ولكن تعذر تحديد إجماليه الجديد لتسوية فرق المبلغ')
      }
      const updatedPaid = Number(updatedOrder?.amount_paid)
      const paidAfterUpdate = Number.isFinite(updatedPaid) ? updatedPaid : previousPaid
      // Settle the gap between what was actually paid and the new total, not just
      // the change in the total (the order may have been partially paid before).
      const difference = Number(Math.max(0, updatedTotal - paidAfterUpdate).toFixed(2))
      if (difference > 0) {
        await api.post(`/orders/${editingOrder.id}/payment`, {
          amount: difference,
          method: orderEditPaymentMethod,
        })
      }
      const refundedAmount = Number.isFinite(updatedPaid)
        ? Math.max(0, Number((previousPaid - updatedPaid).toFixed(2)))
        : Math.max(0, Number((previousPaid - updatedTotal).toFixed(2)))
      return { difference, refundedAmount }
    },
    onSuccess: ({ difference, refundedAmount }) => {
      refetchOrders()
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setEditingOrder(null)
      setSelectedOrder(null)
      toast.success(
        difference > 0
          ? `تم تعديل الطلب وتحصيل فرق ${formatMoney(difference, currencySymbol)}`
          : refundedAmount > 0
            ? `تم تعديل الطلب واسترداد فرق ${formatMoney(refundedAmount, currencySymbol)}`
            : 'تم تعديل الطلب'
      )
    },
    onError: (e: any) => {
      refetchOrders()
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      toast.error(e?.response?.data?.message || e?.message || 'تعذر تعديل الطلب أو تسوية فرق المبلغ')
    },
  })

  const openOrderEditor = (order: any) => {
    const items = order.items || order.order_items || []
    setOrderDraftItems(items.map((item: any, index: number) => ({
      key: `${item.id || item.product_id}-${index}`,
      product_id: item.product_id || item.product?.id || '',
      name: item.product?.name || item.name || '',
      quantity: Number(item.quantity) || 1,
      size_id: item.size_id || item.size?.id || '',
      size_name: item.size?.name || '',
      modifier_options: (item.modifier_options || item.modifierOptions || item.modifiers || []).map((option: any) => ({
        modifier_id: option.modifier_id || option.modifier?.id,
        modifier_option_id: option.modifier_option_id || option.id,
        name: [option.modifier, option.option].filter(Boolean).join(': ') || option.name || '',
      })),
    })))
    setOrderEditPaymentMethod(paymentMethod)
    setEditingOrder(order)
  }

  const loadOrderForEditing = async (order: any) => {
    try {
      const res = await api.get(`/orders/${order.id}`)
      const details = res.data?.order || res.data?.data?.order || res.data?.data || res.data
      openOrderEditor(details)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'تعذر تحميل تفاصيل الطلب للتعديل')
    }
  }

  const shiftRevenue = {
    total: Number(shiftData?.revenue?.total) || 0,
    byPayment: (shiftData?.revenue?.by_payment_method || {}) as Record<string, number>,
  }

  const revenueBreakdown = useMemo(() => {
    const known = paymentMethods.map((method) => ({
      value: method.value,
      label: method.label,
      amount: Number(shiftRevenue.byPayment[method.value]) || 0,
    }))
    const extra = Object.entries(shiftRevenue.byPayment)
      .filter(([method]) => !paymentMethods.some((item) => item.value === method))
      .map(([method, amount]) => ({
        value: method,
        label: method,
        amount: Number(amount) || 0,
      }))
    return [...known, ...extra].filter((method) => method.amount !== 0 || known.length <= 3)
  }, [paymentMethods, shiftRevenue.byPayment])



  const cashRevenue = Number(shiftRevenue.byPayment.cash) || 0
  const expectedCash = Number(openShift?.opening_cash || 0) + cashRevenue

  // Shift modal is opened manually via the "فتح وردية" button.
  const openShiftMutation = useMutation({
    mutationFn: async (cash: number) => {
      const now = new Date()
      const res = await api.post('/shifts/open', {
        user_id: user?.id,
        name: `وردية ${now.toLocaleDateString('ar-EG')} ${now.toTimeString().slice(0, 5)}`,
        shift_date: now.toISOString().split('T')[0],
        start_time: now.toTimeString().slice(0, 5),
        end_time: '23:59',
        opening_cash: cash,
        status: 'open',
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-latest'] })
      setShowShiftModal(false)
      setOpeningCash(0)
      toast.success('تم فتح الوردية بنجاح')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر فتح الوردية')
    },
  })

  const handleShiftButton = () => {
    if (openShift) {
      setActualCash(expectedCash)
      setShowCloseModal(true)
      return
    }
    setOpeningCash(0)
    setShiftNow(new Date())
    setShowShiftModal(true)
  }

  const closeShiftMutation = useMutation({
    mutationFn: async (cash: number) => {
      if (!openShift?.id) return
      const res = await api.put(`/shifts/${openShift.id}`, {
        status: 'closed',
        actual_cash: cash,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setShowCloseModal(false)
      toast.success('تم إغلاق الوردية')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر إغلاق الوردية')
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories')
      return res.data.categories || res.data.data || []
    },
  })

  const { data: products } = useQuery({
    queryKey: ['pos-products-available'],
    queryFn: async () => {
      const res = await api.get('/products/available')
      return res.data.products || res.data.data || []
    },
  })

  const filteredProducts = products?.filter((product: any) => {
    if (selectedCategory && Number(product.category_id) !== Number(selectedCategory)) return false
    if (!productSearch.trim()) return true
    const term = productSearch.trim().toLowerCase()
    return (
      product.name?.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.barcode?.toLowerCase().includes(term)
    )
  })

  const { data: tables } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await api.get('/tables?status=available')
      return res.data.data || []
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: async (payload: { orderData: any; payments: { method: string; amount: number }[] | null }) => {
      const res = await api.post('/orders', payload.orderData)
      const orderId = res?.data?.order?.id || res?.data?.id
      if (payload.payments && payload.payments.length > 1 && orderId) {
        for (const payment of payload.payments) {
          if (Number(payment.amount) > 0) {
            await api.post(`/orders/${orderId}/payment`, {
              amount: Number(payment.amount),
              method: payment.method,
            })
          }
        }
      }
      return res.data
    },
    onSuccess: (res) => {
      const receiptPaymentLabel = splitPayment && splitPayments.length
        ? splitPayments
            .filter((p) => Number(p.amount) > 0)
            .map((p) => `${paymentMethods.find((m) => m.value === p.method)?.label || p.method} ${Number(p.amount).toFixed(2)}`)
            .join(' + ')
        : paymentMethods.find((m) => m.value === paymentMethod)?.label || paymentMethod
      const receipt: Receipt = {
        cart: [...cart],
        subtotal,
        tax,
        total,
        discount,
        paymentMethod: splitPayment && splitPayments.length ? splitPayments[0].method : paymentMethod,
        paymentLabel: receiptPaymentLabel,
        tableId,
        tableName: tables?.find((t: any) => Number(t.id) === Number(tableId))?.name,
        orderType: tableId ? 'dine_in' : 'takeaway',
        orderNumber: res?.order?.order_number,
        customerName,
        customerPhone,
        currency: currencySymbol,
        date: new Date().toLocaleString('ar-EG'),
        cashier: user?.name || '-',
      }
      setCart([])
      setDiscount(0)
      setTableId(null)
      setCustomerName('')
      setCustomerPhone('')
      printReceipt(receipt)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
      toast.success('تم إنشاء الطلب وطباعة الإيصال')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر إنشاء الطلب')
    },
  })

  const computePrice = (product: any, sizeId: number | null, modifierOptionIds: number[]) => {
    let price = Number(product.sale_price) || 0
    const size = product.sizes?.find((s: any) => s.id === sizeId)
    if (size) price += Number(size.price_modifier) || 0
    for (const mod of product.modifiers || []) {
      for (const opt of mod.options || []) {
        if (modifierOptionIds.includes(opt.id)) price += Number(opt.price_modifier) || 0
      }
    }
    return price
  }

  const addToCart = (product: any, sizeId: number | null = null, modifierOptionIds: number[] = []) => {
    const size = product.sizes?.find((s: any) => s.id === sizeId)
    const modifiers: CartModifier[] = []
    for (const mod of product.modifiers || []) {
      for (const opt of mod.options || []) {
        if (modifierOptionIds.includes(opt.id)) {
          modifiers.push({
            modifier_id: mod.id,
            modifier_option_id: opt.id,
            name: `${mod.name}: ${opt.name}`,
            price_modifier: Number(opt.price_modifier) || 0,
          })
        }
      }
    }
    const price = computePrice(product, sizeId, modifierOptionIds)
    const nameSuffix = size ? ` (${size.name})` : ''
    const cartItem: CartItem = {
      product_id: product.id,
      name: product.name + nameSuffix,
      image: product.image,
      price,
      quantity: 1,
      size_id: sizeId || undefined,
      size_name: size?.name,
      modifiers,
    }
    const existing = cart.find(
      (item) =>
        item.product_id === product.id &&
        item.size_id === cartItem.size_id &&
        JSON.stringify(item.modifiers.map((m) => m.modifier_option_id).sort()) ===
          JSON.stringify(modifiers.map((m) => m.modifier_option_id).sort())
    )
    if (existing) {
      setCart(
        cart.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item))
      )
    } else {
      setCart([...cart, cartItem])
    }
  }

  const reprintOrder = (order: any) => {
    const receipt: Receipt = {
      cart: (order.items || []).map((it: any, index: number) => ({
        product_id: it.product_id || it.product?.id || index,
        name: it.product?.name || it.name || 'منتج',
        image: it.product?.image,
        price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
        size_id: it.size_id || it.size?.id,
        size_name: it.size?.name,
        modifiers: (it.modifiers || []).map((m: any) => ({
          modifier_id: m.modifier_id || m.modifier?.id,
          modifier_option_id: m.modifier_option_id || m.id,
          name: [m.modifier, m.option].filter(Boolean).join(': ') || m.name || '',
          price_modifier: Number(m.price_modifier) || 0,
        })),
      })),
      subtotal: Number(order.subtotal) || 0,
      tax: Number(order.tax_amount) || 0,
      total: Number(order.total_amount) || 0,
      discount: Number(order.discount_amount) || 0,
      paymentMethod: order.payment_method || 'cash',
      paymentLabel: (order.payments || []).length
        ? (order.payments as any[]).map((p: any) => `${p.method || p.method_name || ''} ${Number(p.amount).toFixed(2)}`).join(' + ')
        : order.payment_method || '-',
      tableId: order.table_id || null,
      tableName: order.table?.name,
      orderType: order.table_id ? 'dine_in' : 'takeaway',
      orderNumber: order.order_number,
      customerName: order.customer?.name || order.customer_name || '',
      customerPhone: order.customer?.phone || order.customer_phone || '',
      currency: currencySymbol,
      date: order.created_at ? new Date(order.created_at).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG'),
      cashier: order.cashier?.name || user?.name || '-',
    }
    printReceipt(receipt)
  }

  const openConfigurator = (product: any) => {
    toast.success(`تم اختيار ${product.name}`, { duration: 1500 })
    if ((product.sizes && product.sizes.length > 0) || (product.modifiers && product.modifiers.length > 0)) {
      setConfiguringProduct(product)
      const defaultSize = product.sizes?.find((s: any) => s.is_default)
      setSelectedSizeId(defaultSize?.id ?? product.sizes?.[0]?.id ?? null)
      const defaultOpts: number[] = []
      for (const mod of product.modifiers || []) {
        for (const opt of mod.options || []) {
          if (opt.is_default) defaultOpts.push(opt.id)
        }
      }
      setSelectedModifierOptionIds(defaultOpts)
    } else {
      addToCart(product)
    }
  }

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart]
    newCart[index].quantity += delta
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1)
    }
    setCart(newCart)
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * taxRate
  const total = subtotal - discount + tax

  const orderDraftSubtotal = useMemo(
    () =>
      orderDraftItems.reduce((sum, line) => {
        const product = (orderProducts || []).find(
          (candidate: any) => Number(candidate.id) === Number(line.product_id)
        )
        let unitPrice = Number(product?.sale_price) || 0
        const size = product?.sizes?.find((candidate: any) => Number(candidate.id) === Number(line.size_id))
        if (size) unitPrice += Number(size.price_modifier) || 0
        const selectedOptionIds = (line.modifier_options || [])
          .map((option: any) => Number(option.modifier_option_id))
          .filter((id: number) => Number.isFinite(id))
        for (const modifier of product?.modifiers || []) {
          for (const option of modifier.options || []) {
            if (selectedOptionIds.includes(Number(option.id))) {
              unitPrice += Number(option.price_modifier) || 0
            }
          }
        }
        return sum + unitPrice * (Number(line.quantity) || 0)
      }, 0),
    [orderDraftItems, orderProducts]
  )

  const orderDraftDiscount = Math.min(
    orderDraftSubtotal,
    Number(editingOrder?.discount_amount) || 0
  )
  const orderDraftTax = (orderDraftSubtotal - orderDraftDiscount) * taxRate
  const orderDraftTotal =
    orderDraftSubtotal - orderDraftDiscount + orderDraftTax + (Number(editingOrder?.delivery_fee) || 0)
  const orderPaidAmount = Number(editingOrder?.amount_paid) || 0
  const orderDifference = Number((orderDraftTotal - orderPaidAmount).toFixed(2))

  const printReceipt = (receipt: Receipt | null) => {
    if (!receipt) return
    const w = window.open('', '_blank', 'width=420,height=680')
    if (!w) {
      toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة الإيصال')
      return
    }
    const itemsHtml = receipt.cart
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.name)}<br/><small>${escapeHtml(
            it.modifiers.map((m) => m.name).join(', ')
          )}</small></td><td>${it.quantity}</td><td>${(
            it.price * it.quantity
          ).toFixed(2)} ${escapeHtml(receipt.currency)}</td></tr>`
      )
      .join('')

    const logoHtml =
      restaurantData?.logo
        ? `<img src="${escapeHtml(mediaUrl(restaurantData.logo))}" alt="logo" style="max-height:64px;display:block;margin:0 auto 6px;" />`
        : ''

    w.document.write(`
      <html dir="rtl"><head><title>إيصال ${escapeHtml(receipt.orderNumber || '')}</title>
      <style>
        @page { margin: 4mm; }
        body{font-family:Tahoma,Arial,sans-serif;padding:12px;font-size:12px;color:#111;width:72mm;margin:auto;}
        table{width:100%;border-collapse:collapse;margin-top:8px;}
        td,th{padding:4px 2px;border-bottom:1px dashed #bbb;text-align:right;vertical-align:top;}
        h2{text-align:center;margin:0;font-size:16px;}
        h3{text-align:center;margin:8px 0;}
        p{margin:3px 0;}
        .muted{color:#555;font-size:11px;}
        .center{text-align:center;}
      </style>
      </head><body>
      ${logoHtml}
      <h2>${escapeHtml(restaurantData?.name || 'مطعم سكارليت')}</h2>
      <p class="center muted">${escapeHtml(restaurantData?.address || '')}</p>
      <p class="center muted">${escapeHtml(restaurantData?.phone || '')}</p>
      <hr/>
      <p>رقم الطلب: ${escapeHtml(receipt.orderNumber || '-')}</p>
      <p>التاريخ: ${escapeHtml(receipt.date)}</p>
      <p>الكاشير: ${escapeHtml(receipt.cashier)}</p>
      <p>نوع الطلب: ${receipt.orderType === 'dine_in' ? 'داخلي' : 'سفري'}${receipt.orderType === 'dine_in' && receipt.tableName ? ` (طاولة ${escapeHtml(receipt.tableName)})` : ''}</p>
      ${receipt.customerName ? `<p>العميل: ${escapeHtml(receipt.customerName)}</p>` : ''}
      ${receipt.customerPhone ? `<p>الجوال: ${escapeHtml(receipt.customerPhone)}</p>` : ''}
      <hr/>
      <table><thead><tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <hr/>
      <p>المجموع الفرعي: ${receipt.subtotal.toFixed(2)} ${escapeHtml(receipt.currency)}</p>
      <p>الضريبة: ${receipt.tax.toFixed(2)} ${escapeHtml(receipt.currency)}</p>
      ${receipt.discount > 0 ? `<p>الخصم: -${receipt.discount.toFixed(2)} ${escapeHtml(receipt.currency)}</p>` : ''}
      <h3>الإجمالي: ${receipt.total.toFixed(2)} ${escapeHtml(receipt.currency)}</h3>
      <p>طريقة الدفع: ${escapeHtml(receipt.paymentLabel)}</p>
      <hr/>
      <p class="center">شكراً لزيارتكم</p>
      <script>window.onload = function(){ window.print(); };</script>
      </body></html>
    `)
    w.document.close()
  }

  const handleSubmitOrder = () => {
    if (cart.length === 0) return
    if (!openShift) {
      setShowShiftModal(true)
      return
    }

    const payments = splitPayment
      ? splitPayments.filter((p) => Number(p.amount) > 0)
      : [{ method: paymentMethod, amount: total }]

    if (payments.length === 0) {
      toast.error('أدخل طريقة دفع واحدة على الأقل')
      return
    }

    const paidSum = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    if (splitPayment && Math.abs(paidSum - total) > 0.01) {
      toast.error('مجموع طرق الدفع يجب أن يساوي الإجمالي')
      return
    }

    const orderData = {
      shift_id: openShift.id,
      type: tableId ? 'dine_in' : 'takeaway',
      table_id: tableId,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      payment_method: payments[0].method,
      discount_amount: discount,
      amount_paid: splitPayment ? 0 : total,
      notes: customerName
        ? `عميل: ${customerName}${customerPhone ? ` - ${customerPhone}` : ''}`
        : undefined,
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size_id: item.size_id,
        notes: item.notes,
        modifier_options: item.modifiers.map((m) => ({
          modifier_id: m.modifier_id,
          modifier_option_id: m.modifier_option_id,
        })),
      })),
    }

    createOrderMutation.mutate({ orderData, payments: splitPayment ? payments : null })
  }

  if (shiftsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري تحميل الوردية...</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col -m-6 bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">نقطة البيع</h1>
            {openShift ? (
              <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-semibold">وردية مفتوحة #{openShift.id}</span>
                <span className="text-xs text-green-700 dark:text-green-300">
                  التاريخ: {formatShiftDate(openShift.shift_date)}
                </span>
                <span className="text-xs text-green-700 dark:text-green-300">
                  وقت الفتح: {formatShiftTime(openShift.start_time)}
                </span>
                <span className="text-xs text-green-700 dark:text-green-300">
                  الكاشير: {user?.name || '-'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">الوردية مغلقة</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {openShift && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
                }}
              >
                <RefreshCw className="w-4 h-4" />
                تحديث الإيراد
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowOrdersModal(true)}>
              الطلبات
            </Button>
            <button
              type="button"
              onClick={handleShiftButton}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                openShift
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {openShift ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {openShift ? 'إغلاق الوردية' : 'فتح وردية'}
            </button>
          </div>
        </div>

        {openShift && (
          <div className="bg-gradient-to-l from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border border-primary/20 rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  إيرادات الوردية
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({shiftData?.orders_count || 0} طلب)
                </span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatMoney(shiftRevenue.total, currencySymbol)}
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-sm flex-wrap">
              {revenueBreakdown.map((method) => (
                <div
                  key={method.value}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-gray-900/60 rounded-lg"
                >
                  <PaymentIcon method={method.value} className="w-4 h-4 text-primary" />
                  <span className="text-gray-600 dark:text-gray-300">{method.label}:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatMoney(method.amount, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col p-4 min-w-0 min-h-0">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن منتج بالاسم أو الباركود..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              الكل
            </button>
            {categories?.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredProducts?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => openConfigurator(product)}
                    disabled={!product.is_available || !openShift}
                    className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-right"
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img
                          src={mediaUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatMoney(product.sale_price, currencySymbol)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-48 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mb-3 text-gray-300" />
                <p>لا توجد منتجات مطابقة</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full h-[48%] md:h-auto md:w-[27rem] md:max-w-[42%] md:flex-none bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <ShoppingCart className="w-5 h-5" />
              سلة المشتريات
              <span className="text-sm font-normal text-gray-500">
                ({cart.reduce((count, item) => count + item.quantity, 0)})
              </span>
            </h2>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              بيانات العميل (اختياري)
            </label>
            <Input
              placeholder="اسم العميل"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              placeholder="رقم الجوال"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              الطاولة
            </label>
            <select
              value={tableId || ''}
              onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">بدون طاولة (سفري)</option>
              {tables?.map((table: any) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>السلة فارغة</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg"
                >
                  {item.image ? (
                    <img src={mediaUrl(item.image)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                      {item.name}
                    </p>
                    {item.modifiers?.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        {item.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatMoney(item.price, currencySymbol)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                خصم
              </label>
              <input
                type="number"
                min={0}
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(e) =>
                  setDiscount(Math.min(Math.max(Number(e.target.value) || 0, 0), subtotal))
                }
                className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span>{formatMoney(subtotal, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الضريبة ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{formatMoney(tax, currencySymbol)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>الخصم</span>
                <span>-{formatMoney(discount, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>الإجمالي</span>
              <span className="text-primary">{formatMoney(total, currencySymbol)}</span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                طريقة الدفع
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!splitPayment) {
                    setSplitPayments([{ method: paymentMethod, amount: total }])
                  }
                  setSplitPayment((prev) => !prev)
                }}
                className="text-xs text-primary hover:underline"
              >
                {splitPayment ? 'دفع بطريقة واحدة' : 'تقسيم الدفع'}
              </button>
            </div>

            {!splitPayment ? (
              <div className="relative">
                <PaymentIcon
                  method={paymentMethod}
                  className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {splitPayments.map((payment, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={payment.method}
                      onChange={(e) => {
                        const next = [...splitPayments]
                        next[index] = { ...next[index], method: e.target.value }
                        setSplitPayments(next)
                      }}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) => {
                        const next = [...splitPayments]
                        next[index] = { ...next[index], amount: Number(e.target.value) || 0 }
                        setSplitPayments(next)
                      }}
                      className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setSplitPayments((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label="حذف طريقة الدفع"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSplitPayments((prev) => [...prev, { method: paymentMethods[0]?.value || 'cash', amount: 0 }])}
                >
                  <Plus className="h-4 w-4" /> إضافة طريقة دفع
                </Button>
                <p className="text-xs text-gray-500">
                  المجموع: {splitPayments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)} / {total.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 space-y-2">
            <Button
              className="w-full"
              onClick={handleSubmitOrder}
              disabled={cart.length === 0 || createOrderMutation.isPending || !openShift}
              loading={createOrderMutation.isPending}
            >
              {!openShift
                ? 'يجب فتح وردية أولاً'
                : createOrderMutation.isPending
                  ? 'جاري إنشاء الطلب...'
                  : 'إنشاء الطلب وطباعة الإيصال'}
            </Button>

          </div>
        </div>
      </div>

      <Modal
        isOpen={!!configuringProduct}
        onClose={() => setConfiguringProduct(null)}
        title={configuringProduct?.name}
      >
        {configuringProduct && (
          <div className="space-y-4">
            {configuringProduct.sizes?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  الحجم
                </label>
                <div className="space-y-2">
                  {configuringProduct.sizes.map((s: any) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="radio"
                        name="size"
                        checked={selectedSizeId === s.id}
                        onChange={() => setSelectedSizeId(s.id)}
                      />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-sm text-gray-500">
                        {Number(s.price_modifier) >= 0 ? '+' : ''}
                        {formatMoney(s.price_modifier, currencySymbol)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {configuringProduct.modifiers?.map((mod: any) => (
              <div key={mod.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {mod.name} {mod.is_required && <span className="text-red-500">*</span>}
                </label>
                <div className="space-y-2">
                  {mod.options?.map((opt: any) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type={mod.max_selection === 1 ? 'radio' : 'checkbox'}
                        name={`modifier-${mod.id}`}
                        checked={selectedModifierOptionIds.includes(opt.id)}
                        onChange={(e) => {
                          if (mod.max_selection === 1) {
                            const otherIds = mod.options.map((o: any) => o.id)
                            setSelectedModifierOptionIds((prev) => [
                              ...prev.filter((id) => !otherIds.includes(id)),
                              ...(e.target.checked ? [opt.id] : []),
                            ])
                          } else {
                            setSelectedModifierOptionIds((prev) =>
                              e.target.checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id)
                            )
                          }
                        }}
                      />
                      <span className="flex-1">{opt.name}</span>
                      <span className="text-sm text-gray-500">
                        {Number(opt.price_modifier) >= 0 ? '+' : ''}
                        {formatMoney(opt.price_modifier, currencySymbol)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setConfiguringProduct(null)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  addToCart(configuringProduct, selectedSizeId, selectedModifierOptionIds)
                  setConfiguringProduct(null)
                }}
              >
                إضافة للسلة
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title="فتح وردية جديدة"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500">رقم الوردية</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">#{nextShiftNumber}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500">الكاشير</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name || '-'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500">التاريخ</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {shiftNow.toLocaleDateString('ar-EG')}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500">وقت الفتح</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {shiftNow.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <Input
            label="النقد الافتتاحي"
            type="number"
            min={0}
            step="0.01"
            value={openingCash}
            onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => openShiftMutation.mutate(openingCash)}
              loading={openShiftMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              فتح الوردية
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} title="إغلاق الوردية">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500">النقد الافتتاحي</p>
              <p className="font-semibold">{formatMoney(openShift?.opening_cash || 0, currencySymbol)}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500">مبيعات نقدية</p>
              <p className="font-semibold">{formatMoney(cashRevenue, currencySymbol)}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg col-span-2">
              <p className="text-gray-500">النقد المتوقع في الدرج</p>
              <p className="font-bold text-primary text-lg">
                {formatMoney(expectedCash, currencySymbol)}
              </p>
            </div>
          </div>
          <Input
            label="النقد الفعلي في الدرج"
            type="number"
            step="0.01"
            value={actualCash}
            onChange={(e) => setActualCash(Number(e.target.value))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={() => closeShiftMutation.mutate(actualCash)}
              loading={closeShiftMutation.isPending}
            >
              إغلاق الوردية
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showOrdersModal && !selectedOrder}
        onClose={() => setShowOrdersModal(false)}
        title={`طلبات الوردية${openShift?.name ? `: ${openShift.name}` : ''}`}
        size="xl"
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          {!openShift && <p className="py-6 text-center text-gray-500">افتح وردية لعرض طلباتها</p>}
          {openShift && ordersLoading && <p className="py-6 text-center text-gray-500">جاري تحميل طلبات الوردية...</p>}
          {openShift && ordersError && <p className="py-6 text-center text-red-600">تعذر تحميل طلبات الوردية</p>}
          {openShift && !ordersLoading && !ordersError && (ordersData || []).length === 0 && (
            <p className="py-6 text-center text-gray-500">لا توجد طلبات في هذه الوردية</p>
          )}
          {(ordersData || []).map((order: any) => {
            const items = order.items || order.order_items || []
            return (
              <div key={order.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button className="text-right" onClick={() => setSelectedOrder(order)}>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {order.status} • {formatMoney(order.total_amount, currencySymbol)} • {order.payment_status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.created_at ? new Date(order.created_at).toLocaleString('ar-EG') : ''}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}>
                      <Eye className="h-4 w-4" /> التفاصيل
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => reprintOrder(order)}>
                      <Printer className="h-4 w-4" /> إعادة طباعة
                    </Button>
                    {canEditOrders && order.status !== 'cancelled' && (
                      <Button size="sm" variant="secondary" onClick={() => loadOrderForEditing(order)}>
                        <Pencil className="h-4 w-4" /> تعديل
                      </Button>
                    )}
                    {canCancel && !['cancelled', 'completed'].includes(order.status) && (
                      <Button size="sm" variant="danger" onClick={() => cancelOrderMutation.mutate(order.id)} loading={cancelOrderMutation.isPending}>
                        إلغاء
                      </Button>
                    )}
                    {canRefund && ['paid', 'partial'].includes(order.payment_status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRefundOrderTarget(order)
                          setRefundAmount(
                            Math.max(
                              0,
                              Number(order.amount_paid || 0) - Number(order.change_due || 0)
                            )
                          )
                          setRefundReason('استرداد من نقطة البيع')
                        }}
                        loading={refundOrderMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4" /> استرداد
                      </Button>
                    )}
                    {canDeleteOrders && order.status !== 'cancelled' && order.payment_status !== 'refunded' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const paid = Math.max(
                            0,
                            Number(order.amount_paid || 0) - Number(order.change_due || 0)
                          )
                          const message =
                            paid > 0
                              ? `سيتم استرداد ${formatMoney(paid, currencySymbol)} ثم حذف الطلب ${order.order_number}. هل تريد المتابعة؟`
                              : `هل تريد حذف الطلب ${order.order_number}؟`
                          if (window.confirm(message)) {
                            deleteOrderMutation.mutate(order)
                          }
                        }}
                        loading={deleteOrderMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" /> حذف
                      </Button>
                    )}
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {items.map((item: any, index: number) => {
                      const itemModifiers = item.modifiers || []
                      return (
                        <div key={item.id || `${order.id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 flex-col">
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              {item.product?.image && <img src={mediaUrl(item.product.image)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />}
                              {item.product?.name || item.name || 'منتج'} × {item.quantity}
                              {item.size?.name && <span className="text-xs text-gray-400">({item.size.name})</span>}
                            </span>
                            {itemModifiers.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {itemModifiers
                                  .map((modifier: any) =>
                                    [modifier.modifier, modifier.option].filter(Boolean).join(': ') ||
                                    modifier.name
                                  )
                                  .join('، ')}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0">{formatMoney(item.total_price ?? item.subtotal ?? 0, currencySymbol)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedOrder && !editingOrder}
        onClose={() => setSelectedOrder(null)}
        title={`تفاصيل الطلب ${(selectedOrderDetails || selectedOrder)?.order_number || ''}`}
        size="lg"
      >
        {selectedOrder && (() => {
          const order = selectedOrderDetails || selectedOrder
          const items = order.items || order.order_items || []
          return (
            <div className="space-y-4">
              {orderDetailsLoading && <p className="text-sm text-gray-500">جاري تحميل تفاصيل الطلب...</p>}
              {orderDetailsError && <p className="text-sm text-red-600">تعذر تحميل التفاصيل الكاملة للطلب</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p>الحالة: <strong>{order.status}</strong></p>
                <p>الدفع: <strong>{order.payment_status}</strong></p>
                <p>طريقة الدفع: <strong>{order.payment_method || '-'}</strong></p>
                <p>النوع: <strong>{order.type || '-'}</strong></p>
                <p>الإجمالي: <strong>{formatMoney(order.total_amount, currencySymbol)}</strong></p>
                <p>المدفوع: <strong>{formatMoney(order.amount_paid, currencySymbol)}</strong></p>
                <p>التاريخ: <strong>{order.created_at ? new Date(order.created_at).toLocaleString('ar-EG') : '-'}</strong></p>
                {order.customer?.name && <p>العميل: <strong>{order.customer.name}</strong></p>}
                {order.customer?.phone && <p>الجوال: <strong>{order.customer.phone}</strong></p>}
                {order.table?.name && <p>الطاولة: <strong>{order.table.name}</strong></p>}
                {order.cashier?.name && <p>الكاشير: <strong>{order.cashier.name}</strong></p>}
                {order.notes && <p className="col-span-2">ملاحظات: <strong>{order.notes}</strong></p>}
              </div>
              <div className="flex flex-wrap gap-4 border-y border-gray-100 py-3 text-sm dark:border-gray-800">
                <span>المجموع: {formatMoney(order.subtotal, currencySymbol)}</span>
                <span>الضريبة: {formatMoney(order.tax_amount, currencySymbol)}</span>
                <span>الخصم: {formatMoney(order.discount_amount, currencySymbol)}</span>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">المنتجات</h3>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">لا توجد تفاصيل منتجات في بيانات الطلب</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item: any, index: number) => {
                      const product = item.product || (orderProducts || []).find((p: any) => p.id === item.product_id)
                      return (
                        <div key={item.id || `${order.id}-detail-${index}`} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          {product?.image ? (
                            <img src={mediaUrl(product.image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-gray-500 dark:bg-gray-700">
                              <ShoppingCart className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{product?.name || item.name || 'منتج'} × {item.quantity}</p>
                            {item.modifiers?.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {item.modifiers.map((modifier: any) =>
                                  [modifier.modifier, modifier.option].filter(Boolean).join(': ') || modifier.name
                                ).join('، ')}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0">{formatMoney(item.total_price ?? item.subtotal ?? 0, currencySymbol)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {canRefund && ['paid', 'partial'].includes(order.payment_status) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRefundOrderTarget(order)
                      setRefundAmount(
                        Math.max(
                          0,
                          Number(order.amount_paid || 0) - Number(order.change_due || 0)
                        )
                      )
                      setRefundReason('استرداد من نقطة البيع')
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> استرداد كلي / جزئي
                  </Button>
                )}
                {canEditOrders && order.status !== 'cancelled' && (
                  <Button onClick={() => loadOrderForEditing(order)}><Pencil className="h-4 w-4" /> تعديل الطلب</Button>
                )}
                <Button variant="secondary" onClick={() => setSelectedOrder(null)}>إغلاق</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        title={`تعديل الطلب ${editingOrder?.order_number || ''}`}
        size="lg"
      >
        {editingOrder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              أضف المنتجات أو استبدلها؛ سيعيد الخادم حساب الإجمالي وسيتم تحصيل أو استرداد الفرق.
            </p>
            {orderProductsLoading && <p className="text-sm text-gray-500">جاري تحميل المنتجات...</p>}
            {orderProductsError && <p className="text-sm text-red-600">تعذر تحميل المنتجات اللازمة للتعديل</p>}
            <div className="max-h-[45vh] space-y-3 overflow-y-auto">
              {orderDraftItems.map((item, index) => {
                const modifierNames = (item.modifier_options || [])
                  .map((option: any) => option.name)
                  .filter(Boolean)
                return (
                  <div key={item.key} className="space-y-1 rounded-lg border border-gray-100 p-2 dark:border-gray-800">
                    <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => setOrderDraftItems((current) => current.map((line, lineIndex) =>
                          lineIndex === index
                            ? { ...line, product_id: Number(e.target.value), size_id: '', size_name: '', modifier_options: [] }
                            : line
                        ))}
                        className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="">اختر منتجاً</option>
                        {(orderProducts || []).map((product: any) => (
                          <option key={product.id} value={product.id}>{product.name} — {formatMoney(product.sale_price, currencySymbol)}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => setOrderDraftItems((current) => current.map((line, lineIndex) =>
                          lineIndex === index ? { ...line, quantity: Math.max(1, Number(e.target.value) || 1) } : line
                        ))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                        aria-label="الكمية"
                      />
                      <button
                        onClick={() => setOrderDraftItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        aria-label="حذف المنتج من الطلب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {(item.size_name || modifierNames.length > 0) && (
                      <p className="px-1 text-xs text-gray-500">
                        {[item.size_name, ...modifierNames].filter(Boolean).join('، ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <Button
              variant="secondary"
              onClick={() => setOrderDraftItems((current) => [...current, {
                key: `new-${Date.now()}`,
                product_id: '',
                quantity: 1,
                size_id: '',
                modifier_options: [],
              }])}
            >
              <Plus className="h-4 w-4" /> إضافة منتج
            </Button>
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">إجمالي الطلب بعد التعديل</span>
                <span className="font-semibold">{formatMoney(orderDraftTotal, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">المبلغ المدفوع</span>
                <span className="font-semibold">{formatMoney(orderPaidAmount, currencySymbol)}</span>
              </div>
              <div
                className={`flex items-center justify-between border-t border-gray-200 pt-2 font-semibold dark:border-gray-700 ${
                  orderDifference > 0
                    ? 'text-green-600 dark:text-green-400'
                    : orderDifference < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <span>
                  {orderDifference > 0
                    ? 'فرق مطلوب تحصيله من العميل'
                    : orderDifference < 0
                      ? 'فرق سيتم استرداده للعميل'
                      : 'لا يوجد فرق'}
                </span>
                <span dir="ltr">
                  {orderDifference > 0 ? '+' : orderDifference < 0 ? '-' : ''}
                  {formatMoney(Math.abs(orderDifference), currencySymbol)}
                </span>
              </div>
            </div>
            {orderDifference > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium">طريقة دفع الفرق عند زيادة الإجمالي</label>
                <select
                  value={orderEditPaymentMethod}
                  onChange={(e) => setOrderEditPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingOrder(null)}>إلغاء</Button>
              <Button
                onClick={() => updateOrderMutation.mutate()}
                loading={updateOrderMutation.isPending}
                disabled={orderDraftItems.length === 0 || orderDraftItems.some((item) => !item.product_id || item.quantity < 1)}
              >
                حفظ وتسوية الفرق
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!refundOrderTarget}
        onClose={() => setRefundOrderTarget(null)}
        title={`استرداد مبلغ الطلب ${refundOrderTarget?.order_number || ''}`}
      >
        {refundOrderTarget && (() => {
          const refundable = Math.max(
            0,
            Number(refundOrderTarget.amount_paid || 0) - Number(refundOrderTarget.change_due || 0)
          )
          const isFullRefund = refundAmount >= refundable - 0.0001
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">المبلغ القابل للاسترداد</span>
                  <span className="font-semibold">{formatMoney(refundable, currencySymbol)}</span>
                </div>
              </div>
              <Input
                label="مبلغ الاسترداد"
                type="number"
                min={0}
                max={refundable}
                step="0.01"
                value={refundAmount}
                onChange={(e) =>
                  setRefundAmount(Math.min(Math.max(Number(e.target.value) || 0, 0), refundable))
                }
              />
              <div>
                <label className="mb-1 block text-sm font-medium">سبب الاسترداد</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <p className={`text-sm ${isFullRefund ? 'text-red-600' : 'text-amber-600'}`}>
                {isFullRefund
                  ? 'استرداد كلي: سيتم إلغاء الطلب وإرجاع الكمية إلى المخزون.'
                  : 'استرداد جزئي: سيبقى الطلب فعّالاً ويُخصم المبلغ من المدفوع.'}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setRefundOrderTarget(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="danger"
                  disabled={refundAmount <= 0 || refundAmount > refundable}
                  loading={refundOrderMutation.isPending}
                  onClick={() =>
                    refundOrderMutation.mutate({
                      id: refundOrderTarget.id,
                      amount: refundAmount,
                      reason: refundReason || 'استرداد من نقطة البيع',
                    })
                  }
                >
                  <RotateCcw className="h-4 w-4" /> تنفيذ الاسترداد
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
