import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../services/api'
import { Plus, Search, Edit, Trash2, Settings } from 'lucide-react'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Modal from '../../components/common/modals/Modal'
import Pagination from '../../components/common/Pagination'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

export default function ProductsPage() {
  const { symbol } = useSettingsStore()
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

  const products = productsRes?.data
  const productsMeta = productsRes?.meta || productsRes?.links ? {
    current_page: productsRes.current_page, last_page: productsRes.last_page, total: productsRes.total, per_page: productsRes.per_page
  } : null

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

  // @ts-ignore
      const columns = [
    {
      key: 'name',
      header: 'ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬',
      render: (item: any) => <div>{item.name}</div>,
    },
    {
      key: 'category',
      header: 'ط§ظ„ظپط¦ط©',
      render: (item: any) => <div>{item.category?.name || '-'}</div>,
    },
    {
      key: 'sale_price',
      header: 'ط³ط¹ط± ط§ظ„ط¨ظٹط¹',
      render: (item: any) => <div>{formatMoney(item.sale_price, symbol)}</div>,
    },
    {
      key: 'cost_price',
      header: 'ط§ظ„طھظƒظ„ظپط©',
      render: (item: any) => <div>{formatMoney(item.cost_price, symbol)}</div>,
    },
    {
      key: 'current_stock',
// @ts-ignore
      header: 'ط§ظ„ظƒظ…ظٹط© ط§ظ„ط­ط§ظ„ظٹط©',
      // @ts-ignore
      render: (item: any) => (
        <div>
          <span className="px-2 py-1 rounded text-xs green-bg">ظ…طھظˆط§ظپط±</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ',
      // @ts-ignore
      render: (item: any) => (
        <div className="flex gap-2">
          <button onClick={() => setEditingProduct(item)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="طھط¹ط¯ظٹظ„/ط¥ط¶ط§ظپط©">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditingProduct(item); setShowModal(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ط§ظ„ظ…ظ†طھط¬ط§طھ</h1>
        <Button onClick={() => { setEditingProduct(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" /> ط¥ط¶ط§ظپط© ظ…ظ†طھط¬
        </Button>
      </div>
      <Card>
        <div className="mb-4">
          <Input
            placeholder="ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬ ط£ظˆ ط§ظ„ظ‚ط³ظ…..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <DataTable data={products || []} columns={columns} loading={isLoading} emptyMessage="ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ" />
        <Pagination meta={productsMeta} onPageChange={setPage} />
      </Card>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'طھط¹ط¯ظٹظ„ ظ…ظ†طھط¬' : 'ط¥ط¶ط§ظپط© ظ…ظ†طھط¬'}
      >
        <ProductForm
          product={editingProduct}
          categories={categories || []}
          symbol={symbol}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      </Modal>
      <Modal
        isOpen={!!managingProduct}
        onClose={() => setManagingProduct(null)}
        title={`ط£ط­ط¬ط§ظ… ظˆط¥ط¶ط§ظپط§طھ: ${managingProduct?.name || ''}`}
        size="lg"
      >
        {managingProduct && <ProductModifiersManager product={managingProduct} symbol={symbol} />}
      </Modal>
    </div>
  )
}

// @ts-ignore
function ProductForm({ product, categories, symbol, onClose, onSuccess }: any) {
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
    onSuccess: () => {
      toast.success('طھظ… ط§ظ„ط­ظپط¸')
      onSuccess()
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors
      const firstError = errors ? Object.values(errors)[0] : null
      toast.error(
        (Array.isArray(firstError) ? firstError[0] : firstError) ||
          error?.response?.data?.message ||
          'طھط¹ط°ط± ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬'
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        label="ط§ظ„ظ‚ط³ظ…"
        value={formData.category_id}
        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
      />
      <Input
        label="ط³ط¹ط± ط§ظ„ط¨ظٹط¹"
        type="number"
        value={formData.sale_price}
        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
        required
      />
      <Input
        label="ط§ظ„طھظƒظ„ظپط©"
        type="number"
        value={formData.cost_price}
        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
      />
      <Input
        label="ط§ظ„ظƒظ…ظٹط© ط§ظ„ط­ط§ظ„ظٹط©"
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
        <label className="text-sm">ظ…طھظˆط§ظپط±</label>
      </div>
      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" onClick={onClose}>
          ط¥ظ„ط؛ط§ط،
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {product ? 'طھط­ط¯ظٹط«' : 'ط¥ط¶ط§ظپط©'}
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
        <h3 className="font-semibold mb-2">ط£ط­ط¬ط§ظ…</h3>
        <div className="space-y-2 mb-3">
          {(sizes || []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>{s.name} ({formatMoney(s.price_modifier, symbol)})</span>
              <button onClick={() => deleteSizeMutation.mutate(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="ط§ط³ظ… ط§ظ„ط­ط¬ظ…" value={sizeName} onChange={(e) => setSizeName(e.target.value)} />
          <Input placeholder="ط§ظ„ط³ط¹ط±" type="number" value={sizePrice} onChange={(e) => setSizePrice(e.target.value)} />
          <Button size="sm" onClick={() => addSizeMutation.mutate()} loading={addSizeMutation.isPending}>ط¥ط¶ط§ظپط©</Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">ط¥ط¶ط§ظپط§طھ</h3>
        <div className="space-y-2 mb-3">
          {(modifiers || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>{m.name} {m.is_required ? '(ظ…ط·ظ„ظˆط¨ط©)' : ''}</span>
              <button onClick={() => deleteModifierMutation.mutate(m.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Input placeholder="ط§ط³ظ… ط§ظ„ط¥ط¶ط§ظپط©" value={modName} onChange={(e) => setModName(e.target.value)} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={modRequired} onChange={(e) => setModRequired(e.target.checked)} /> ظ…ط·ظ„ظˆط¨ط©
          </label>
          <Button size="sm" onClick={() => addModifierMutation.mutate()} loading={addModifierMutation.isPending}>ط¥ط¶ط§ظپط©</Button>
        </div>
      </div>
    </div>
  )
}