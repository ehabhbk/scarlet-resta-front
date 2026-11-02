import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api } from '../../services/api'
import {
  useSettingsStore,
  mediaUrl,
  symbolForCurrency,
  type CurrencyOption,
  type PaymentMethod,
} from '../../store/settingsStore'
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
  { id: 'currency', label: 'العملات', icon: DollarSign },
  { id: 'payments', label: 'طرق الدفع', icon: CreditCard },
  { id: 'invoice', label: 'الفواتير', icon: FileText },
  { id: 'printing', label: 'الطباعة', icon: Printer },
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'tables', label: 'الطاولات', icon: Table },
] as const

type TabId = (typeof TABS)[number]['id']

interface RestaurantForm {
  name: string
  phone: string
  address: string
  tax_number: string
  currency: string
  symbol: string
  tax_rate: number
  timezone: string
  locale: string
  logo: string
}

const EMPTY_FORM: RestaurantForm = {
  name: '',
  phone: '',
  address: '',
  tax_number: '',
  currency: 'SAR',
  symbol: 'ر.س',
  tax_rate: 0.15,
  timezone: 'Asia/Riyadh',
  locale: 'ar',
  logo: '',
}

const EMPTY_CURRENCY: CurrencyOption = { code: '', symbol: '', name: '' }
const EMPTY_PAYMENT: PaymentMethod = { value: '', label: '' }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [form, setForm] = useState<RestaurantForm>(EMPTY_FORM)
  const [kv, setKv] = useState<Record<string, string>>({})
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const [currencyDraft, setCurrencyDraft] = useState<CurrencyOption>(EMPTY_CURRENCY)
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null)
  const [paymentDraft, setPaymentDraft] = useState<PaymentMethod>(EMPTY_PAYMENT)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [savingList, setSavingList] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()

  const applyRestaurant = useSettingsStore((s) => s.applyRestaurant)
  const currencies = useSettingsStore((s) => s.currencies)
  const customCurrencies = useSettingsStore((s) => s.customCurrencies)
  const paymentMethods = useSettingsStore((s) => s.paymentMethods)
  const setCustomCurrencies = useSettingsStore((s) => s.setCustomCurrencies)
  const setPaymentMethods = useSettingsStore((s) => s.setPaymentMethods)

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
      address: restaurant.address || '',
      tax_number: restaurant.tax_number || '',
      currency: restaurant.currency || 'SAR',
      symbol: restaurant.symbol || symbolForCurrency(restaurant.currency),
      tax_rate:
        restaurant.tax_rate !== undefined && restaurant.tax_rate !== null
          ? Number(restaurant.tax_rate)
          : 0.15,
      timezone: restaurant.timezone || 'Asia/Riyadh',
      locale: restaurant.locale || 'ar',
      logo: restaurant.logo || '',
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

  const saveSetting = (group: string, key: string, value: string, type = 'string') =>
    api.post('/settings', { group, key, value, type })

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

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const data = new FormData()
      data.append('logo', file)
      const res = await api.post('/auth/restaurant/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: (res) => {
      applyRestaurant(res.restaurant)
      setForm((current) => ({ ...current, logo: res.restaurant.logo || '' }))
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
      toast.success('تم تحديث شعار المطعم')
    },
    onError: () => toast.error('تعذر رفع الشعار'),
  })

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/auth/restaurant/logo')
      return res.data
    },
    onSuccess: (res) => {
      applyRestaurant(res.restaurant)
      setForm((current) => ({ ...current, logo: '' }))
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
      toast.success('تم حذف الشعار')
    },
    onError: () => toast.error('تعذر حذف الشعار'),
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
          return saveSetting(
            group,
            field.key,
            raw,
            field.type === 'boolean' ? 'boolean' : field.type === 'number' ? 'number' : 'string'
          )
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

  const persistCurrencies = async (list: CurrencyOption[]) => {
    setSavingList('currency')
    try {
      await saveSetting('currency', 'custom_currencies', JSON.stringify(list), 'json')
      setCustomCurrencies(list)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('تم حفظ قائمة العملات')
    } catch {
      toast.error('تعذر حفظ قائمة العملات')
    } finally {
      setSavingList(null)
    }
  }

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = currencyDraft.code.trim().toUpperCase()
    const symbol = currencyDraft.symbol.trim()
    const name = currencyDraft.name.trim()
    if (!code || !symbol || !name) {
      toast.error('أدخل رمز العملة والرمز النصي والاسم')
      return
    }
    if (!/^[A-Z]{2,8}$/.test(code)) {
      toast.error('رمز العملة يجب أن يكون أحرفاً إنجليزية (مثال: SAR)')
      return
    }

    let next: CurrencyOption[]
    if (editingCurrency) {
      next = customCurrencies.map((currency) =>
        currency.code === editingCurrency ? { code, symbol, name } : currency
      )
      if (!next.some((currency) => currency.code === editingCurrency)) {
        next.push({ code, symbol, name })
      }
    } else {
      if (currencies.some((currency) => currency.code === code)) {
        toast.error('هذه العملة موجودة مسبقاً')
        return
      }
      next = [...customCurrencies, { code, symbol, name }]
    }

    await persistCurrencies(next)
    setCurrencyDraft(EMPTY_CURRENCY)
    setEditingCurrency(null)
  }

  const handleDeleteCurrency = async (code: string) => {
    const next = customCurrencies.filter((currency) => currency.code !== code)
    await persistCurrencies(next)
    if (form.currency === code) {
      setForm((current) => ({ ...current, currency: 'SAR', symbol: 'ر.س' }))
    }
  }

  const persistPaymentMethods = async (list: PaymentMethod[]) => {
    setSavingList('payments')
    try {
      await saveSetting('pos', 'payment_methods', JSON.stringify(list), 'json')
      setPaymentMethods(list)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('تم حفظ طرق الدفع')
    } catch {
      toast.error('تعذر حفظ طرق الدفع')
    } finally {
      setSavingList(null)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = paymentDraft.value.trim().toLowerCase().replace(/\s+/g, '_')
    const label = paymentDraft.label.trim()
    if (!value || !label) {
      toast.error('أدخل اسم طريقة الدفع')
      return
    }

    let next: PaymentMethod[]
    if (editingPayment) {
      next = paymentMethods.map((method) =>
        method.value === editingPayment ? { value, label } : method
      )
    } else {
      if (paymentMethods.some((method) => method.value === value)) {
        toast.error('طريقة الدفع موجودة مسبقاً')
        return
      }
      next = [...paymentMethods, { value, label }]
    }

    await persistPaymentMethods(next)
    setPaymentDraft(EMPTY_PAYMENT)
    setEditingPayment(null)
  }

  const handleDeletePayment = async (value: string) => {
    if (paymentMethods.length <= 1) {
      toast.error('يجب أن تبقى طريقة دفع واحدة على الأقل')
      return
    }
    await persistPaymentMethods(paymentMethods.filter((method) => method.value !== value))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إعدادات النظام</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة بيانات المطعم والعملات وطرق الدفع والفواتير والطباعة ونقطة البيع
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
            <h2 className="text-lg font-semibold dark:text-gray-100">معلومات المطعم</h2>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0">
                {form.logo ? (
                  <img
                    src={mediaUrl(form.logo)}
                    alt="شعار المطعم"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">شعار المطعم</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG أو JPG أو WEBP بحجم أقصى 4MB. يظهر في الشريط الجانبي والفاتورة.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadLogoMutation.mutate(file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadLogoMutation.isPending}
                  >
                    <Upload className="w-4 h-4" />
                    رفع شعار
                  </Button>
                  {form.logo && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeLogoMutation.mutate()}
                      loading={removeLogoMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف الشعار
                    </Button>
                  )}
                </div>
              </div>
            </div>

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
                label="الرقم الضريبي"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
              <Input
                label="العنوان"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
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
        <div className="space-y-6">
          <Card>
            <form onSubmit={handleSaveRestaurant} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-gray-100">العملة الافتراضية والضرائب</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    العملة
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => {
                      const code = e.target.value
                      setForm({
                        ...form,
                        currency: code,
                        symbol: symbolForCurrency(code, currencies),
                      })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {currencies.map((currency) => (
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
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
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

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold dark:text-gray-100">إدارة العملات</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  أضف أي عملة جديدة أو عدّل رمزها، وستظهر فوراً في قائمة العملات وفي نقطة البيع.
                </p>
              </div>

              <form onSubmit={handleCurrencySubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <Input
                  label="رمز العملة"
                  placeholder="SAR"
                  value={currencyDraft.code}
                  onChange={(e) => setCurrencyDraft({ ...currencyDraft, code: e.target.value.toUpperCase() })}
                  maxLength={8}
                />
                <Input
                  label="الرمز النصي"
                  placeholder="ر.س"
                  value={currencyDraft.symbol}
                  onChange={(e) => setCurrencyDraft({ ...currencyDraft, symbol: e.target.value })}
                />
                <Input
                  label="اسم العملة"
                  placeholder="ريال سعودي"
                  value={currencyDraft.name}
                  onChange={(e) => setCurrencyDraft({ ...currencyDraft, name: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button type="submit" loading={savingList === 'currency'} className="flex-1">
                    <Plus className="w-4 h-4" />
                    {editingCurrency ? 'تحديث' : 'إضافة'}
                  </Button>
                  {editingCurrency && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingCurrency(null)
                        setCurrencyDraft(EMPTY_CURRENCY)
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </form>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {currencies.map((currency) => {
                  const isCustom = customCurrencies.some((item) => item.code === currency.code)
                  return (
                    <div
                      key={currency.code}
                      className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-12 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {currency.symbol}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {currency.name}
                          </p>
                          <p className="text-xs text-gray-500">{currency.code}</p>
                        </div>
                        {isCustom && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            مضافة
                          </span>
                        )}
                      </div>
                      {isCustom && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCurrency(currency.code)
                              setCurrencyDraft(currency)
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCurrency(currency.code)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'payments' && (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold dark:text-gray-100">طرق الدفع</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أضف أو عدّل أو احذف طرق الدفع. تظهر هذه الطرق تلقائياً في شاشة نقطة البيع والتقارير.
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <Input
                label="الاسم الظاهر"
                placeholder="نقدي"
                value={paymentDraft.label}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, label: e.target.value })}
              />
              <Input
                label="المعرّف (اختياري)"
                placeholder="cash"
                value={paymentDraft.value}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, value: e.target.value })}
                hint="حروف إنجليزية بدون مسافات"
              />
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" loading={savingList === 'payments'} className="flex-1">
                  <Plus className="w-4 h-4" />
                  {editingPayment ? 'تحديث طريقة الدفع' : 'إضافة طريقة دفع'}
                </Button>
                {editingPayment && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingPayment(null)
                      setPaymentDraft(EMPTY_PAYMENT)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.value}
                  className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.value}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPayment(method.value)
                        setPaymentDraft(method)
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(method.value)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {(activeTab === 'invoice' ||
        activeTab === 'printing' ||
        activeTab === 'pos' ||
        activeTab === 'users' ||
        activeTab === 'tables') && (
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold dark:text-gray-100">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GROUPS[activeTab]?.map((field) => {
                const value = kv[`${activeTab}.${field.key}`] ?? field.defaultValue
                const onChange = (next: string) => setKvValue(activeTab, field.key, next)

                if (field.type === 'boolean') {
                  const checked = value === 'true' || value === '1'
                  return (
                    <div key={field.key} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        {field.label}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
                    </div>
                  )
                }

                if (field.type === 'textarea') {
                  return (
                    <div key={field.key} className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        {field.label}
                      </label>
                      <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
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
              <Button onClick={() => handleSaveGroup(activeTab)} loading={savingGroup === activeTab}>
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
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
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
