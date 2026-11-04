import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2, Settings, ImagePlus } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Pagination from '../../components/common/Pagination'
import { useSettingsStore, formatMoney, mediaUrl } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'

export default function ProductsPage() {
  const { symbol } = useSettingsStore()
  const permissions = useAuthStore((state) => state.user?.permissions || [])
  const canCreate = permissions.includes('create_products')
  const canEdit = permissions.includes('edit_products')
  const canDelete = permissions.includes('delete_products')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [managingProduct, setManagingProduct] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: async () => {
      const res = await api.get(`/products?search=${search}&page=${page}`)
      return res.data
    },
  })

  const products = productsRes?.data || []
  const productsMeta = productsRes?.meta || (productsRes?.current_page ? {
    current_page: productsRes.current_page,
    last_page: productsRes.last_page,
    total: productsRes.total,
    per_page: productsRes.per_page,
  } : null)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories')
      return res.data.categories || res.data.data || []
    },
  })

  const { data: kitchenStations } = useQuery({
    queryKey: ['kitchen-stations'],
    queryFn: async () => {
      const res = await api.get('/products/kitchen-stations')
      return res.data.stations || []
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
    {
      key: 'name',
      header: 'اسم المنتج',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          {item.image ? (
            <img src={mediaUrl(item.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
              <ImagePlus className="h-5 w-5" />
            </span>
          )}
          <span>{item.name}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'الفئة',
      render: (item: any) => <div>{item.category?.name || '-'}</div>,
    },
    {
      key: 'sale_price',
      header: 'سعر البيع',
      render: (item: any) => <div>{formatMoney(item.sale_price, symbol)}</div>,
    },
    {
      key: 'cost_price',
      header: 'التكلفة',
      render: (item: any) => <div>{formatMoney(item.cost_price, symbol)}</div>,
    },
    {
      key: 'current_stock',
      header: 'الكمية الحالية',
      render: (item: any) => (
        <div>
          <span className="px-2 py-1 rounded text-xs bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300">
            {item.current_stock ?? 0}
          </span>
        </div>
      ),
    },
    ...(canEdit || canDelete ? [{
      key: 'actions',
      header: 'الإجراءات',
      render: (item: any) => (
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button onClick={() => setManagingProduct(item)} className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded" title="إدارة الأحجام والإضافات">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingProduct(item); setShowModal(true) }} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded" title="تعديل">
                <Edit className="w-4 h-4" />
              </button>
            </>
          )}
          {canDelete && (
            <button onClick={() => {
              if (window.confirm(`هل تريد حذف المنتج ${item.name}؟`)) deleteMutation.mutate(item.id)
            }} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded" title="حذف">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">المنتجات</h1>
        {canCreate && (
          <Button onClick={() => { setEditingProduct(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> إضافة منتج
          </Button>
        )}
      </div>
      <Card>
        <div className="mb-4">
          <Input
            placeholder="اسم المنتج أو القسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <DataTable data={products} columns={columns} loading={isLoading} emptyMessage="لا توجد منتجات" />
        <Pagination meta={productsMeta} onPageChange={setPage} />
      </Card>
      {(canCreate || canEdit) && <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'تعديل منتج' : 'إضافة منتج'}
      >
        <ProductForm
          product={editingProduct}
          categories={categories || []}
          kitchenStations={kitchenStations || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      </Modal>}
      {canEdit && <Modal
        isOpen={!!managingProduct}
        onClose={() => setManagingProduct(null)}
        title={`الأحجام والإضافات: ${managingProduct?.name || ''}`}
        size="lg"
      >
        {managingProduct && <ProductModifiersManager product={managingProduct} symbol={symbol} />}
      </Modal>}
    </div>
  )
}

function ProductForm({ product, categories, kitchenStations, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    kitchen_station_id: product?.kitchen_station_id ? String(product.kitchen_station_id) : '',
    sale_price: product?.sale_price || '',
    cost_price: product?.cost_price || '',
    current_stock: product?.current_stock || 0,
    is_available: product?.is_available ?? true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(product?.image ? mediaUrl(product.image) : '')

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const mutation = useMutation({
    mutationFn: async () => {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('category_id', String(formData.category_id))
      data.append('kitchen_station_id', formData.kitchen_station_id)
      data.append('sale_price', String(formData.sale_price))
      data.append('cost_price', String(formData.cost_price))
      data.append('current_stock', String(formData.current_stock))
      data.append('is_available', formData.is_available ? '1' : '0')
      if (imageFile) data.append('image_file', imageFile)
      if (product) {
        data.append('_method', 'PUT')
        await api.post(`/products/${product.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.post('/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
    },
    onSuccess: () => {
      toast.success('تم الحفظ')
      onSuccess()
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors
      const firstError = errors ? Object.values(errors)[0] : null
      toast.error(
        (Array.isArray(firstError) ? firstError[0] : firstError) ||
          error?.response?.data?.message ||
          'تعذر حفظ المنتج'
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
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
        <label className="mb-1 block text-sm font-medium">القسم</label>
        <select
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
        >
          <option value="">بدون قسم</option>
          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">محطة المطبخ</label>
        <select
          value={formData.kitchen_station_id}
          onChange={(e) => setFormData({ ...formData, kitchen_station_id: e.target.value })}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
        >
          <option value="">بدون محطة</option>
          {kitchenStations.map((station: any) => (
            <option key={station.id} value={station.id}>
              {station.display_name || station.name}
            </option>
          ))}
        </select>
      </div>
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
      <Input
        label="الكمية الحالية"
        type="number"
        value={formData.current_stock}
        onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
      />
      <div>
        <label className="mb-2 block text-sm font-medium">صورة المنتج</label>
        {imagePreview && <img src={imagePreview} alt="معاينة المنتج" className="mb-3 h-24 w-24 rounded-lg object-cover" />}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            setImageFile(file)
            setImagePreview(file ? URL.createObjectURL(file) : product?.image ? mediaUrl(product.image) : '')
          }}
          className="block w-full text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_available}
          onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm">متوفر</label>
      </div>
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {product ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
    </form>
  )
}

function ProductModifiersManager({ product, symbol }: any) {
  const queryClient = useQueryClient()
  const { data: sizes, refetch: refetchSizes } = useQuery({
    queryKey: ['product-sizes', product.id],
    queryFn: async () => {
      const res = await api.get(`/products/${product.id}/sizes`)
      return res.data.sizes || res.data.data || res.data || []
    },
  })
  const { data: modifiers, refetch: refetchModifiers } = useQuery({
    queryKey: ['product-modifiers', product.id],
    queryFn: async () => {
      const res = await api.get(`/products/${product.id}/modifiers`)
      return res.data.modifiers || res.data.data || res.data || []
    },
  })
  const [sizeName, setSizeName] = useState('')
  const [sizePrice, setSizePrice] = useState('')
  const [modName, setModName] = useState('')
  const [modRequired, setModRequired] = useState(false)

  const addSizeMutation = useMutation({
    mutationFn: async () => { await api.post(`/products/${product.id}/sizes`, { name: sizeName, price_modifier: Number(sizePrice), is_default: false }) },
    onSuccess: () => { setSizeName(''); setSizePrice(''); refetchSizes(); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })
  const deleteSizeMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/products/${product.id}/sizes/${id}`) },
    onSuccess: () => { refetchSizes(); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })
  const addModifierMutation = useMutation({
    mutationFn: async () => { await api.post(`/products/${product.id}/modifiers`, { name: modName, is_required: modRequired, min_selection: modRequired ? 1 : 0, max_selection: 1, is_active: true }) },
    onSuccess: () => { setModName(''); setModRequired(false); refetchModifiers(); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })
  const deleteModifierMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/products/${product.id}/modifiers/${id}`) },
    onSuccess: () => { refetchModifiers(); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">الأحجام</h3>
        <div className="space-y-2 mb-3">
          {(sizes || []).map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800/40 rounded">
              <span>{s.name} ({formatMoney(s.price_modifier, symbol)})</span>
              <button onClick={() => deleteSizeMutation.mutate(s.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="اسم الحجم" value={sizeName} onChange={(e) => setSizeName(e.target.value)} />
          <Input placeholder="فرق السعر" type="number" value={sizePrice} onChange={(e) => setSizePrice(e.target.value)} />
          <Button size="sm" onClick={() => addSizeMutation.mutate()} loading={addSizeMutation.isPending}>إضافة</Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">الإضافات</h3>
        <div className="space-y-2 mb-3">
          {(modifiers || []).map((m: any) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800/40 rounded">
              <span>{m.name} {m.is_required ? '(مطلوبة)' : ''}</span>
              <button onClick={() => deleteModifierMutation.mutate(m.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Input placeholder="اسم الإضافة" value={modName} onChange={(e) => setModName(e.target.value)} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={modRequired} onChange={(e) => setModRequired(e.target.checked)} /> مطلوبة
          </label>
          <Button size="sm" onClick={() => addModifierMutation.mutate()} loading={addModifierMutation.isPending}>إضافة</Button>
        </div>
      </div>
    </div>
  )
}