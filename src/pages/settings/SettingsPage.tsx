import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Save,
  Settings as SettingsIcon,
  DollarSign,
  FileText,
  Printer,
  Users,
  Table,
  ShoppingCart,
} from 'lucide-react'
import { api } from '../../services/api'
import { useSettingsStore, CURRENCIES, symbolForCurrency } from '../../store/settingsStore'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'
import Input from '../../components/common/inputs/Input'

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'textarea'

interface SettingField {
  key: string
  label: string
  type: FieldType
  defaultValue: string
  options?: { value: string; label: string }[]
  hint?: string
  disabled?: boolean
}

const GROUPS: Record<string, SettingField[]> = {
  invoice: [
    { key: 'invoice_prefix', label: 'بادئة رقم الفاتورة', type: 'text', defaultValue: 'INV' },
    { key: 'invoice_footer', label: 'نص أسفل الفاتورة', type: 'text', defaultValue: 'شكراً لزيارتكم' },
    { key: 'invoice_notes', label: 'ملاحظات الفاتورة', type: 'textarea', defaultValue: '' },
    { key: 'show_logo', label: 'إظهار شعار المطعم', type: 'boolean', defaultValue: 'true' },
    { key: 'show_tax_number', label: 'إظهار الرقم الضريبي', type: 'boolean', defaultValue: 'true' },
    { key: 'show_cashier', label: 'إظهار اسم الكاشير', type: 'boolean', defaultValue: 'true' },
  ],
  printing: [
    { key: 'printer_name', label: 'اسم الطابعة', type: 'text', defaultValue: '', hint: 'اتركه فارغاً لاستخدام الطابعة الافتراضية' },
    { key: 'receipt_width', label: 'عرض الإيصال', type: 'select', defaultValue: '80', options: [
      { value: '58', label: '58 مم (إيصال صغير)' },
      { value: '80', label: '80 مم (إيصال عريض)' },
    ] },
    { key: 'copies', label: 'عدد نسخ الطباعة', type: 'number', defaultValue: '1' },
    { key: 'auto_print', label: 'طباعة الإيصال تلقائياً بعد كل طلب', type: 'boolean', defaultValue: 'true' },
    { key: 'print_logo', label: 'طباعة الشعار على الإيصال', type: 'boolean', defaultValue: 'true' },
    { key: 'print_kitchen_copy', label: 'طباعة نسخة للمطبخ', type: 'boolean', defaultValue: 'true' },
  ],
  pos: [
    { key: 'require_shift', label: 'إجبار فتح وردية قبل البيع', type: 'boolean', defaultValue: 'true', disabled: true, hint: 'مفعّل دائماً لضمان ربط المبيعات بالوردية والكاشير' },
    { key: 'enable_customer_name', label: 'السماح بإدخال اسم العميل', type: 'boolean', defaultValue: 'true' },
    { key: 'allow_discount', label: 'السماح بالخصم', type: 'boolean', defaultValue: 'true' },
    { key: 'max_discount_percent', label: 'أقصى نسبة خصم %', type: 'number', defaultValue: '20' },
    { key: 'low_stock_threshold', label: 'حد التنبيه لنقص المخزون', type: 'number', defaultValue: '5' },
  ],
  users: [
    { key: 'allow_registration', label: 'السماح بإنشاء حسابات جديدة', type: 'boolean', defaultValue: 'false' },
    { key: 'default_role', label: 'الدور الافتراضي للمستخدم الجديد', type: 'text', defaultValue: 'Cashier' },
    { key: 'min_password_length', label: 'الحد الأدنى لطول كلمة المرور', type: 'number', defaultValue: '6' },
    { key: 'session_timeout', label: 'مدة انتهاء الجلسة (دقيقة)', type: 'number', defaultValue: '120' },
  ],
  tables: [
    { key: 'default_capacity', label: 'السعة الافتراضية للطاولة', type: 'number', defaultValue: '4' },
    { key: 'auto_close_tables', label: 'إغلاق الطاولة تلقائياً بعد الدفع', type: 'boolean', defaultValue: 'false' },
    { key: 'auto_close_minutes', label: 'مدة الإغلاق التلقائي (دقيقة)', type: 'number', defaultValue: '60' },
    { key: 'require_table_for_dine_in', label: 'إلزام اختيار طاولة للطلبات الداخلية', type: 'boolean', defaultValue: 'false' },
  ],
}

const TABS = [
  { id: 'general', label: 'عام', icon: SettingsIcon },
  { id: 'currency', label: 'العملة والضرائب', icon: DollarSign },
  { id: 'invoice', label: 'الفواتير', icon: FileText },
  { id: 'printing', label: 'الطباعة', icon: Printer },
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'tables', label: 'الطاولات', icon: Table },
]

interface RestaurantForm {
  name: string
  phone: string
  email: string
  address: string
  tax_number: string
  currency: string
  symbol: string
  tax_rate: number
  timezone: string
  locale: string
}

const EMPTY_FORM: RestaurantForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  tax_number: '',
  currency: 'SAR',
  symbol: 'ر.س',
  tax_rate: 0.15,
  timezone: 'Asia/Riyadh',
  locale: 'ar',
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [form, setForm] = useState<RestaurantForm>(EMPTY_FORM)
  const [kv, setKv] = useState<Record<string, string>>({})
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const applyRestaurant = useSettingsStore((s) => s.applyRestaurant)

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant'],
    queryFn: async () => {
      const res = await api.get('/auth/restaurant')
      return res.data.restaurant
    },
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings')
      return (res.data.settings || []) as Array<{
        group: string
        key: string
        value: string | null
        type: string
      }>
    },
  })

  useEffect(() => {
    if (!restaurant) return
    setForm({
      name: restaurant.name || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      address: restaurant.address || '',
      tax_number: restaurant.tax_number || '',
      currency: restaurant.currency || 'SAR',
      symbol: restaurant.symbol || symbolForCurrency(restaurant.currency),
      tax_rate: restaurant.tax_rate !== undefined && restaurant.tax_rate !== null
        ? Number(restaurant.tax_rate)
        : 0.15,
      timezone: restaurant.timezone || 'Asia/Riyadh',
      locale: restaurant.locale || 'ar',
    })
    applyRestaurant(restaurant)
  }, [restaurant, applyRestaurant])

  useEffect(() => {
    if (!settings) return
    setKv((prev) => {
      const next = { ...prev }
      settings.forEach((setting) => {
        next[`${setting.group}.${setting.key}`] = setting.value ?? ''
      })
      return next
    })
  }, [settings])

  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: RestaurantForm) => {
      const res = await api.put('/auth/restaurant', data)
      return res.data
    },
    onSuccess: (res) => {
      applyRestaurant(res?.restaurant || form)
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
      toast.success('تم حفظ إعدادات المطعم')
    },
    onError: () => toast.error('تعذر حفظ الإعدادات'),
  })

  const handleSaveRestaurant = (e: React.FormEvent) => {
    e.preventDefault()
    updateRestaurantMutation.mutate(form)
  }

  const handleSaveGroup = async (group: string) => {
    const fields = GROUPS[group]
    setSavingGroup(group)
    try {
      await Promise.all(
        fields.map((field) => {
          const raw = kv[`${group}.${field.key}`] ?? field.defaultValue
          return api.post('/settings', {
            group,
            key: field.key,
            value: raw,
            type: field.type === 'boolean' ? 'boolean' : field.type === 'number' ? 'number' : 'string',
          })
        })
      )
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('تم حفظ الإعدادات')
    } catch {
      toast.error('تعذر حفظ الإعدادات')
    } finally {
      setSavingGroup(null)
    }
  }

  const setKvValue = (group: string, key: string, value: string) => {
    setKv((prev) => ({ ...prev, [`${group}.${key}`]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة بيانات المطعم والعملة والفاتورة والطباعة ونقطة البيع</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'general' && (
        <Card>
          <form onSubmit={handleSaveRestaurant} className="space-y-4">
            <h2 className="text-lg font-semibold">معلومات المطعم</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم المطعم"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="رقم الهاتف"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="الرقم الضريبي"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
            </div>
            <Input
              label="العنوان"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="المنطقة الزمنية"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
              <Input
                label="لغة النظام (ar / en)"
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={updateRestaurantMutation.isPending}>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'currency' && (
        <Card>
          <form onSubmit={handleSaveRestaurant} className="space-y-4">
            <h2 className="text-lg font-semibold">العملة والضرائب</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                <select
                  value={form.currency}
                  onChange={(e) => {
                    const code = e.target.value
                    setForm({ ...form, currency: code, symbol: symbolForCurrency(code) })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="رمز العملة (يظهر بجانب كل مبلغ)"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              />
              <Input
                label="نسبة الضريبة (0.15 = 15%)"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
              />
              <Input
                label="الرقم الضريبي"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                سيتم تطبيق العملة والضريبة المعتمدة هنا على نقطة البيع والفواتير وجميع المبالغ في النظام.
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={updateRestaurantMutation.isPending}>
                <Save className="w-4 h-4" />
                حفظ العملة والضريبة
              </Button>
            </div>
          </form>
        </Card>
      )}

      {(['invoice', 'printing', 'pos', 'users', 'tables'] as const).includes(
        activeTab as 'invoice' | 'printing' | 'pos' | 'users' | 'tables'
      ) && (
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GROUPS[activeTab]?.map((field) => {
                const value = kv[`${activeTab}.${field.key}`] ?? field.defaultValue
                const onChange = (next: string) => setKvValue(activeTab, field.key, next)

                if (field.type === 'boolean') {
                  const checked = value === 'true' || value === '1'
                  return (
                    <div key={field.key} className="p-3 border border-gray-200 rounded-lg">
                      <Toggle
                        checked={checked}
                        disabled={field.disabled}
                        label={field.label}
                        hint={field.hint}
                        onChange={(next) => onChange(next ? 'true' : 'false')}
                      />
                    </div>
                  )
                }

                if (field.type === 'select') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                      <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
                    </div>
                  )
                }

                if (field.type === 'textarea') {
                  return (
                    <div key={field.key} className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                      <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  )
                }

                return (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={value}
                    disabled={field.disabled}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSaveGroup(activeTab)}
                loading={savingGroup === activeTab}
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}

function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
