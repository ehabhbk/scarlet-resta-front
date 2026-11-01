import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Wallet } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Modal from '../../components/common/modals/Modal'

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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash')
  const [discount, setDiscount] = useState(0)
  const [tableId, setTableId] = useState<number | null>(null)
  const [configuringProduct, setConfiguringProduct] = useState<any>(null)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedModifierOptionIds, setSelectedModifierOptionIds] = useState<number[]>([])
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories')
      return res.data.categories
    },
  })

  const { data: products } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/products?category_id=${selectedCategory}&is_available=1`
        : '/products?is_available=1'
      const res = await api.get(url)
      return res.data.data
    },
  })

  const { data: tables } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await api.get('/tables?status=available')
      return res.data.data
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await api.post('/orders', orderData)
      return res.data
    },
    onSuccess: (res) => {
      setLastReceipt({ cart: [...cart], subtotal, tax, total, discount, paymentMethod, tableId, orderNumber: res?.order?.order_number })
      setCart([])
      setDiscount(0)
      setTableId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const computePrice = (product: any, sizeId: number | null, modifierOptionIds: number[]) => {
    let price = product.sale_price
    const size = product.sizes?.find((s: any) => s.id === sizeId)
    if (size) price += size.price_modifier
    for (const mod of product.modifiers || []) {
      for (const opt of mod.options || []) {
        if (modifierOptionIds.includes(opt.id)) price += opt.price_modifier
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
            price_modifier: opt.price_modifier,
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
  const tax = subtotal * 0.15
  const total = subtotal - discount + tax

  const handlePrint = () => {
    if (!lastReceipt) return
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    const itemsHtml = lastReceipt.cart.map((it: any) => `<tr><td>${it.name}</td><td>${it.quantity}</td><td>${(it.price * it.quantity).toFixed(2)}</td></tr>`).join('')
    w.document.write(`
      <html dir="rtl"><head><title>إيصال</title>
      <style>body{font-family:Tahoma,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}td,th{padding:4px;border-bottom:1px solid #eee;}h2{text-align:center;}</style>
      </head><body>
      <h2>scarlet restaurant</h2>
      <p>رقم الطلب: ${lastReceipt.orderNumber || '-'}</p>
      <p>التاريخ: ${new Date().toLocaleString('ar-SA')}</p>
      <table><thead><tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <p>المجموع الفرعي: ${lastReceipt.subtotal.toFixed(2)}</p>
      <p>الضريبة: ${lastReceipt.tax.toFixed(2)}</p>
      <p>الخصم: ${lastReceipt.discount.toFixed(2)}</p>
      <h3>الإجمالي: ${lastReceipt.total.toFixed(2)} ر.س</h3>
      <p>طريقة الدفع: ${lastReceipt.paymentMethod}</p>
      <script>window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  const handleSubmitOrder = () => {
    if (cart.length === 0) return
    
    const orderData = {
      type: tableId ? 'dine_in' : 'takeaway',
      table_id: tableId,
      payment_method: paymentMethod,
      discount_amount: discount,
      amount_paid: total,
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

  return (
    <div className="h-screen flex">
      {/* Products Section */}
      <div className="flex-1 flex flex-col p-4">
        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
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
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products?.map((product: any) => (
              <button
                key={product.id}
                onClick={() => openConfigurator(product)}
                disabled={!product.is_available}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-right"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-lg font-bold text-primary mt-1">{product.sale_price} ر.س</p>
                <p className="text-xs text-gray-500">المخزون: {product.current_stock}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            سلة المشتريات
          </h2>
        </div>

        {/* Table Selection */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">الطاولة</label>
          <select
            value={tableId || ''}
            onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">بدون طاولة (سفري)</option>
            {tables?.map((table: any) => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.modifiers?.length > 0 && (
                    <p className="text-xs text-gray-400">{item.modifiers.map(m => m.name).join(', ')}</p>
                  )}
                  <p className="text-xs text-gray-500">{item.price} ر.س</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(index, -1)}
                    className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(index, 1)}
                    className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">المجموع الفرعي</span>
            <span>{subtotal.toFixed(2)} ر.س</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">الضريبة (15%)</span>
            <span>{tax.toFixed(2)} ر.س</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>الخصم</span>
              <span>-{discount.toFixed(2)} ر.س</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="p-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                paymentMethod === 'cash'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs">نقدي</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">بطاقة</span>
            </button>
            <button
              onClick={() => setPaymentMethod('wallet')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                paymentMethod === 'wallet'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs">محفظة</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-4 space-y-2">
          <Button
            className="w-full"
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || createOrderMutation.isPending}
            loading={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
          </Button>
          {lastReceipt && (
            <Button variant="secondary" className="w-full" onClick={handlePrint}>
              طباعة الإيصال
            </Button>
          )}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">الحجم</label>
                <div className="space-y-2">
                  {configuringProduct.sizes.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="size"
                        checked={selectedSizeId === s.id}
                        onChange={() => setSelectedSizeId(s.id)}
                      />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-sm text-gray-500">
                        {s.price_modifier >= 0 ? '+' : ''}{s.price_modifier} ر.س
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {configuringProduct.modifiers?.map((mod: any) => (
              <div key={mod.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mod.name} {mod.is_required && <span className="text-red-500">*</span>}
                </label>
                <div className="space-y-2">
                  {mod.options?.map((opt: any) => (
                    <label key={opt.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer">
                      <input
                        type={mod.max_selection === 1 ? 'radio' : 'checkbox'}
                        name={`modifier-${mod.id}`}
                        checked={selectedModifierOptionIds.includes(opt.id)}
                        onChange={(e) => {
                          if (mod.max_selection === 1) {
                            // remove other options of same modifier
                            const otherIds = mod.options.map((o: any) => o.id)
                            setSelectedModifierOptionIds(prev => [
                              ...prev.filter(id => !otherIds.includes(id)),
                              ...(e.target.checked ? [opt.id] : []),
                            ])
                          } else {
                            setSelectedModifierOptionIds(prev =>
                              e.target.checked
                                ? [...prev, opt.id]
                                : prev.filter(id => id !== opt.id)
                            )
                          }
                        }}
                      />
                      <span className="flex-1">{opt.name}</span>
                      <span className="text-sm text-gray-500">
                        {opt.price_modifier >= 0 ? '+' : ''}{opt.price_modifier} ر.س
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setConfiguringProduct(null)}>إلغاء</Button>
              <Button onClick={() => {
                addToCart(configuringProduct, selectedSizeId, selectedModifierOptionIds)
                setConfiguringProduct(null)
              }}>
                إضافة للسلة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
