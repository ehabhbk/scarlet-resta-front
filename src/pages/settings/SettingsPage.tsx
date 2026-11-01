import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Save } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const queryClient = useQueryClient()

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant'],
    queryFn: async () => {
      const res = await api.get('/auth/restaurant')
      return res.data.restaurant
    },
  })

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    currency: 'SAR',
    tax_rate: 0.15,
  })

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        currency: restaurant.currency || 'SAR',
        tax_rate: Number(restaurant.tax_rate) || 0.15,
      })
    }
  }, [restaurant])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.put('/auth/restaurant', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const tabs = [
    { id: 'general', label: 'عام' },
    { id: 'invoice', label: 'الفواتير' },
    { id: 'printing', label: 'الطباعة' },
    { id: 'users', label: 'المستخدمون' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="اسم المطعم"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="الهاتف"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="العنوان"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="العملة"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
              <Input
                label="نسبة الضريبة"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" loading={updateMutation.isPending}>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
