import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
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
  X
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

export default function POSPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash')
  const [discount, setDiscount] = useState(0)
  const [tableId, setTableId] = useState<number | null>(null)
  const [configuringProduct, setConfiguringProduct] = useState<any>(null)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedModifierOptionIds, setSelectedModifierOptionIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    name: 'وردية اليوم',
    opening_cash: 0
  })

  const { symbol: currencySymbol, taxRate, restaurant: restaurantData } = useSettingsStore()
  const loadSettings = useSettingsStore((s) => s.load)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const { data: shiftData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts-current'],
    queryFn: async () => {
      const res = await api.get('/shifts/current')
      return res.data
    },
  })

  const openShift = shiftData?.shift
  const shiftRevenue = {
    total: Number(shiftData?.revenue?.total) || 0,
    byPayment: {
      cash: Number(shiftData?.revenue?.by_payment_method?.cash) || 0,
      card: Number(shiftData?.revenue?.by_payment_method?.card) || 0,
      wallet: Number(shiftData?.revenue?.by_payment_method?.wallet) || 0,
    } as Record<string, number>,
  }

  useEffect(() => {
    if (!shiftsLoading && !openShift) {
      setShowShiftModal(true)
    } else if (openShift) {
      setShowShiftModal(false)
    }
  }, [shiftsLoading, openShift])

  const openShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/shifts/open', {
        user_id: user?.id,
        name: data.name,
        shift_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_time: '23:59',
        opening_cash: data.opening_cash,
        status: 'open'
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
      setShowShiftModal(false)
    }
  })

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      if (!openShift?.id) return
      const res = await api.put(`/shifts/${openShift.id}`, {
        status: 'closed',
        actual_cash: openShift.opening_cash || 0
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts-current'] })
    }
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
    return product.name?.toLowerCase().includes(productSearch.toLowerCase())
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
      const receipt = {
        cart: [...cart],
        subtotal,
        tax,
        total,
        discount,
        paymentMethod,
        tableId,
        orderNumber: res?.order?.order_number,
        customerName,
        currency: currencySymbol,
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
    const existing = cart.find(item =>
      item.product_id === product.id &&
      item.size_id === cartItem.size_id &&
      JSON.stringify(item.modifiers.map(m => m.modifier_option_id).sort()) === JSON.stringify(modifiers.map(m => m.modifier_option_id).sort())
    )
    if (existing) {
      setCart(cart.map(item =>
        item === existing ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setCart([...cart, cartItem])
    }
  }

  const openConfigurator = (product: any) => {
    if ((product.sizes && product.sizes.length > 0) || (product.modifiers && product.modifiers.length > 0)) {
      setConfiguringProduct(product)
      const defaultSize = product.sizes?.find((s: any) => s.is_default)
      setSelectedSizeId(defaultSize?.id ?? (product.sizes?.[0]?.id ?? null))
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

  const printReceipt = (receipt: any) => {
    if (!receipt) return
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    const itemsHtml = receipt.cart.map((it: any) => 
      `<tr><td>${it.name}</td><td>${it.quantity}</td><td>${(it.price * it.quantity).toFixed(2)} ${receipt.currency}</td></tr>`
    ).join('')
    w.document.write(`
      <html dir="rtl"><head><title>إيصال</title>
      <style>body{font-family:Tahoma,sans-serif;padding:20px;font-size:12px;}table{width:100%;border-collapse:collapse;margin-top:10px;}td,th{padding:6px;border-bottom:1px solid #eee;text-align:right;}h2{text-align:center;margin:0;}p{margin:4px 0;}</style>
      </head><body>
      <h2>${restaurantData?.name || 'مطعم سكارليت'}</h2>
      <p style="text-align:center;">إيصال مبيعات</p>
      <hr/>
      <p>رقم الطلب: ${receipt.orderNumber || '-'}</p>
      <p>التاريخ: ${new Date().toLocaleString('ar-SA')}</p>
      <p>الكاشير: ${user?.name || '-'}</p>
      ${receipt.customerName ? `<p>العميل: ${receipt.customerName}</p>` : ''}
      <hr/>
      <table><thead><tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <hr/>
      <p>المجموع الفرعي: ${receipt.subtotal.toFixed(2)} ${receipt.currency}</p>
      <p>الضريبة: ${receipt.tax.toFixed(2)} ${receipt.currency}</p>
      ${receipt.discount > 0 ? `<p>الخصم: -${receipt.discount.toFixed(2)} ${receipt.currency}</p>` : ''}
      <h3 style="text-align:center;">الإجمالي: ${receipt.total.toFixed(2)} ${receipt.currency}</h3>
      <p>طريقة الدفع: ${receipt.paymentMethod === 'cash' ? 'نقدي' : receipt.paymentMethod === 'card' ? 'بطاقة' : 'محفظة'}</p>
      <hr/>
      <p style="text-align:center;">شكراً لزيارتكم</p>
      <script>window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  const handlePrintReceipt = () => {
    printReceipt(lastReceipt)
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
      payment_method: paymentMethod,
      discount_amount: discount,
      amount_paid: total,
      notes: customerName ? `عميل: ${customerName}${customerPhone ? ` - ${customerPhone}` : ''}` : undefined,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size_id: item.size_id,
        notes: item.notes,
        modifier_options: item.modifiers.map(m => ({
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
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">نقطة البيع</h1>
            {openShift ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">وردية مفتوحة</span>
                <span className="text-sm">| الكاشير: {user?.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">لا توجد وردية مفتوحة</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {openShift && (
              <Button variant="secondary" size="sm" onClick={() => closeShiftMutation.mutate()}>
                إغلاق الوردية
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowShiftModal(true)}>
              فتح وردية جديدة
            </Button>
          </div>
        </div>
        
        {openShift && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="font-semibold text-gray-900">إيرادات الوردية</span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-primary">
                  {shiftRevenue.total.toFixed(2)} {currencySymbol}
                </div>
              </div>
            </div>
            <div className="flex gap-6 mt-2 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">نقدي:</span>
                <span className="font-medium">{shiftRevenue.byPayment.cash.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">بطاقة:</span>
                <span className="font-medium">{shiftRevenue.byPayment.card.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">محفظة:</span>
                <span className="font-medium">{shiftRevenue.byPayment.wallet.toFixed(2)} {currencySymbol}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن منتج..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              الكل
            </button>
            {categories?.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts?.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => openConfigurator(product)}
                  disabled={!product.is_available || !openShift}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-right"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                  <p className="text-lg font-bold text-primary mt-1">{Number(product.sale_price).toFixed(2)} {currencySymbol}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              سلة المشتريات
            </h2>
          </div>

          <div className="p-4 border-b border-gray-200 space-y-2">
            <label className="block text-sm font-medium text-gray-700">بيانات العميل (اختياري)</label>
            <Input placeholder="اسم العميل" value={customerName} onChange={(e) => setCustomerName(e.target.value)} icon={<User className="w-4 h-4" />} />
            <Input placeholder="رقم الجوال" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>

          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">الطاولة</label>
            <select value={tableId || ''} onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">بدون طاولة (سفري)</option>
              {tables?.map((table: any) => (
                <option key={table.id} value={table.id}>{table.name}</option>
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
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.modifiers?.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">{item.modifiers.map(m => m.name).join(', ')}</p>
                    )}
                    <p className="text-xs text-gray-500">{item.price.toFixed(2)} {currencySymbol}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(index, -1)} className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(index, 1)} className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span>{subtotal.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الضريبة ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{tax.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>الإجمالي</span>
              <span>{total.toFixed(2)} {currencySymbol}</span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <Banknote className="w-5 h-5" />
                <span className="text-xs">نقدي</span>
              </button>
              <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">بطاقة</span>
              </button>
              <button onClick={() => setPaymentMethod('wallet')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <Wallet className="w-5 h-5" />
                <span className="text-xs">محفظة</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <Button className="w-full" onClick={handleSubmitOrder} disabled={cart.length === 0 || createOrderMutation.isPending || !openShift} loading={createOrderMutation.isPending}>
              {!openShift ? 'يجب فتح وردية أولاً' : createOrderMutation.isPending ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب وطباعة الإيصال'}
            </Button>
            {lastReceipt && (
              <Button variant="secondary" className="w-full" onClick={handlePrintReceipt}>
                <Printer className="w-4 h-4" />
                إعادة طباعة الإيصال
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={!!configuringProduct} onClose={() => setConfiguringProduct(null)} title={configuringProduct?.name}>
        {configuringProduct && (
          <div className="space-y-4">
            {configuringProduct.sizes?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحجم</label>
                <div className="space-y-2">
                  {configuringProduct.sizes.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="size" checked={selectedSizeId === s.id} onChange={() => setSelectedSizeId(s.id)} />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-sm text-gray-500">{Number(s.price_modifier) >= 0 ? '+' : ''}{Number(s.price_modifier).toFixed(2)} {currencySymbol}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {configuringProduct.modifiers?.map((mod: any) => (
              <div key={mod.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{mod.name} {mod.is_required && <span className="text-red-500">*</span>}</label>
                <div className="space-y-2">
                  {mod.options?.map((opt: any) => (
                    <label key={opt.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type={mod.max_selection === 1 ? 'radio' : 'checkbox'} name={`modifier-${mod.id}`} checked={selectedModifierOptionIds.includes(opt.id)}
                        onChange={(e) => {
                          if (mod.max_selection === 1) {
                            const otherIds = mod.options.map((o: any) => o.id)
                            setSelectedModifierOptionIds(prev => [...prev.filter(id => !otherIds.includes(id)), ...(e.target.checked ? [opt.id] : [])])
                          } else {
                            setSelectedModifierOptionIds(prev => e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id))
                          }
                        }}
                      />
                      <span className="flex-1">{opt.name}</span>
                      <span className="text-sm text-gray-500">{Number(opt.price_modifier) >= 0 ? '+' : ''}{Number(opt.price_modifier).toFixed(2)} {currencySymbol}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setConfiguringProduct(null)}>إلغاء</Button>
              <Button onClick={() => { addToCart(configuringProduct, selectedSizeId, selectedModifierOptionIds); setConfiguringProduct(null) }}>إضافة للسلة</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showShiftModal} onClose={() => openShift ? setShowShiftModal(false) : null} title="فتح وردية جديدة">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">الكاشير: {user?.name}</p>
          </div>
          <Input label="اسم الوردية" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} />
          <Input label="النقد الافتتاحي" type="number" value={shiftForm.opening_cash} onChange={(e) => setShiftForm({ ...shiftForm, opening_cash: Number(e.target.value) })} />
          <div className="flex justify-end gap-3 pt-4">
            {openShift && <Button variant="secondary" onClick={() => setShowShiftModal(false)}>إلغاء</Button>}
            <Button onClick={() => openShiftMutation.mutate(shiftForm)} loading={openShiftMutation.isPending}>فتح الوردية</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
