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
  const [discount, setDiscount] = useState(0)
  const [tableId, setTableId] = useState<number | null>(null)
  const [configuringProduct, setConfiguringProduct] = useState<any>(null)
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedModifierOptionIds, setSelectedModifierOptionIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [actualCash, setActualCash] = useState(0)
  const [shiftForm, setShiftForm] = useState({
    name: 'وردية اليوم',
    opening_cash: 0,
  })

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

  const paymentLabel =
    paymentMethods.find((method) => method.value === paymentMethod)?.label || paymentMethod

  const cashRevenue = Number(shiftRevenue.byPayment.cash) || 0
  const expectedCash = Number(openShift?.opening_cash || 0) + cashRevenue

  useEffect(() => {
    if (!shiftsLoading && !openShift) {
      setShowShiftModal(true)
    } else if (openShift) {
      setShowShiftModal(false)
    }
  }, [shiftsLoading, openShift])

  const openShiftMutation = useMutation({
    mutationFn: async (data: { name: string; opening_cash: number }) => {
      const res = await api.post('/shifts/open', {
        user_id: user?.id,
        name: data.name,
        shift_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_time: '23:59',
        opening_cash: data.opening_cash,
        status: 'open',
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setShowShiftModal(false)
      toast.success('تم فتح الوردية بنجاح')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'تعذر فتح الوردية')
    },
  })

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
    queryKey: ['products', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/products?category_id=${selectedCategory}&is_available=1`
        : '/products?is_available=1'
      const res = await api.get(url)
      return res.data.data || res.data.products || []
    },
  })

  const filteredProducts = products?.filter((product: any) => {
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
    mutationFn: async (orderData: any) => {
      const res = await api.post('/orders', orderData)
      return res.data
    },
    onSuccess: (res) => {
      const receipt: Receipt = {
        cart: [...cart],
        subtotal,
        tax,
        total,
        discount,
        paymentMethod,
        paymentLabel,
        tableId,
        orderNumber: res?.order?.order_number,
        customerName,
        customerPhone,
        currency: currencySymbol,
        date: new Date().toLocaleString('ar-EG'),
        cashier: user?.name || '-',
      }
      setLastReceipt(receipt)
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

  const openConfigurator = (product: any) => {
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

    const orderData = {
      type: tableId ? 'dine_in' : 'takeaway',
      table_id: tableId,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      payment_method: paymentMethod,
      discount_amount: discount,
      amount_paid: total,
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

    createOrderMutation.mutate(orderData)
  }

  if (shiftsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري تحميل الوردية...</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-[calc(100vh-8rem)] flex flex-col -m-6 bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">نقطة البيع</h1>
            {openShift ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">وردية مفتوحة</span>
                <span className="text-sm">| الكاشير: {user?.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">لا توجد وردية مفتوحة</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {openShift && (
              <>
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActualCash(expectedCash)
                    setShowCloseModal(true)
                  }}
                >
                  إغلاق الوردية
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowShiftModal(true)}>
              فتح وردية جديدة
            </Button>
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4 min-w-0">
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

        <div className="w-full max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <ShoppingCart className="w-5 h-5" />
              سلة المشتريات
              <span className="text-sm font-normal text-gray-500">({cart.length})</span>
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

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              طريقة الدفع
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-sm ${
                    paymentMethod === method.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <PaymentIcon method={method.value} className="w-5 h-5" />
                  <span className="text-xs">{method.label}</span>
                </button>
              ))}
            </div>
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
            {lastReceipt && (
              <Button variant="secondary" className="w-full" onClick={() => printReceipt(lastReceipt)}>
                <Printer className="w-4 h-4" />
                إعادة طباعة الإيصال
              </Button>
            )}
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
        onClose={() => (openShift ? setShowShiftModal(false) : null)}
        title="فتح وردية جديدة"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">الكاشير: {user?.name}</p>
          </div>
          <Input
            label="اسم الوردية"
            value={shiftForm.name}
            onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
          />
          <Input
            label="النقد الافتتاحي"
            type="number"
            value={shiftForm.opening_cash}
            onChange={(e) => setShiftForm({ ...shiftForm, opening_cash: Number(e.target.value) })}
          />
          <div className="flex justify-end gap-3 pt-4">
            {openShift && (
              <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
                إلغاء
              </Button>
            )}
            <Button
              onClick={() => openShiftMutation.mutate(shiftForm)}
              loading={openShiftMutation.isPending}
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
    </div>
  )
}
