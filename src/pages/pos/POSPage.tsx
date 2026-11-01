import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Wallet } from 'lucide-react'
import Button from '../../components/common/buttons/Button'

interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  size_id?: number
  size_name?: string
  notes?: string
}

export default function POSPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash')
  const [discount, setDiscount] = useState(0)
  const [tableId, setTableId] = useState<number | null>(null)
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
    onSuccess: () => {
      setCart([])
      setDiscount(0)
      setTableId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product_id === product.id && !item.size_id)
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id && !item.size_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.sale_price,
        quantity: 1,
      }])
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
                onClick={() => addToCart(product)}
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
        <div className="p-4">
          <Button
            className="w-full"
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || createOrderMutation.isPending}
            loading={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
          </Button>
        </div>
      </div>
    </div>
  )
}
