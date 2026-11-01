import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const res = await api.get(`/products?search=${search}`)
      return res.data.data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories')
      return res.data.categories
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const columns = [
    { key: 'name', header: 'اسم المنتج' },
    { key: 'category', header: 'التصنيف', render: (item: any) => item.category?.name || '-' },
    { key: 'sale_price', header: 'سعر البيع', render: (item: any) => `${item.sale_price} ر.س` },
    { key: 'cost_price', header: 'التكلفة', render: (item: any) => `${item.cost_price} ر.س` },
    { key: 'current_stock', header: 'المخزون' },
    { key: 'is_available', header: 'الحالة', render: (item: any) => (
      <span className={`px-2 py-1 rounded-full text-xs ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {item.is_available ? 'متاح' : 'غير متاح'}
      </span>
    )},
    { key: 'actions', header: 'الإجراءات', render: (item: any) => (
      <div className="flex gap-2">
        <button onClick={() => { setEditingProduct(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
        <Button onClick={() => { setEditingProduct(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="بحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        <DataTable
          data={products || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="لا توجد منتجات"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
      >
        <ProductForm
          product={editingProduct}
          categories={categories || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      </Modal>
    </div>
  )
}

function ProductForm({ product, categories, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    sale_price: product?.sale_price || '',
    cost_price: product?.cost_price || '',
    current_stock: product?.current_stock || 0,
    is_available: product?.is_available ?? true,
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (product) {
        await api.put(`/products/${product.id}`, data)
      } else {
        await api.post('/products', data)
      }
    },
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="اسم المنتج"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
        <select
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">اختر التصنيف</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="سعر البيع"
          type="number"
          value={formData.sale_price}
          onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
          required
        />
        <Input
          label="التكلفة"
          type="number"
          value={formData.cost_price}
          onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
          required
        />
      </div>

      <Input
        label="المخزون"
        type="number"
        value={formData.current_stock}
        onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_available}
          onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm">متاح للبيع</label>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={mutation.isPending}>
          {product ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}
