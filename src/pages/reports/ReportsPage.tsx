import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Printer, RefreshCw } from 'lucide-react'
import { api } from '../../services/api'
import Card from '../../components/common/cards/Card'
import Button from '../../components/common/buttons/Button'
import { useSettingsStore, formatMoney } from '../../store/settingsStore'

interface ReportDefinition {
  id: string
  label: string
  endpoint: string
  description: string
  sections: string[]
}

const REPORTS: ReportDefinition[] = [
  {
    id: 'sales',
    label: 'تقرير المبيعات',
    endpoint: '/reports/sales',
    description: 'إجمالي المبيعات وعدد الطلبات المدفوعة خلال الفترة المحددة.',
    sections: [],
  },
  {
    id: 'profit-loss',
    label: 'الأرباح والخسائر',
    endpoint: '/reports/profit-loss',
    description: 'الإيرادات مقابل المصروفات والمشتريات وصافي الربح.',
    sections: [],
  },
  {
    id: 'top-products',
    label: 'المنتجات الأكثر مبيعاً',
    endpoint: '/reports/top-products',
    description: 'ترتيب المنتجات حسب الكمية المباعة وقيمة الإيراد.',
    sections: ['products'],
  },
  {
    id: 'inventory',
    label: 'تقرير المخزون',
    endpoint: '/reports/inventory',
    description: 'أرصدة المخزون الحالية والحد الأدنى وقيمة المخزون.',
    sections: ['items'],
  },
  {
    id: 'purchases',
    label: 'تقرير المشتريات',
    endpoint: '/reports/purchases',
    description: 'إجمالي قيمة المشتريات خلال الفترة المحددة.',
    sections: [],
  },
  {
    id: 'expenses',
    label: 'تقرير المصروفات',
    endpoint: '/reports/expenses',
    description: 'إجمالي المصروفات المسجلة خلال الفترة المحددة.',
    sections: [],
  },
  {
    id: 'staff',
    label: 'تقرير الموظفين',
    endpoint: '/reports/staff',
    description: 'أداء الموظفين وعدد الطلبات وقيمة المبيعات لكل مستخدم.',
    sections: ['staff'],
  },
  {
    id: 'payment-methods',
    label: 'تقرير طرق الدفع',
    endpoint: '/reports/payment-methods',
    description: 'توزيع المبيعات المدفوعة حسب طريقة الدفع.',
    sections: ['methods'],
  },
  {
    id: 'tax',
    label: 'تقرير الضرائب',
    endpoint: '/reports/tax',
    description: 'إجمالي الضريبة المحتسبة على الطلبات خلال الفترة.',
    sections: [],
  },
  {
    id: 'shifts',
    label: 'تقرير الورديات',
    endpoint: '/reports/shifts',
    description: 'الورديات المفتوحة والمغلقة والنقد الافتتاحي والفعلي والفرق.',
    sections: ['shifts'],
  },
]

const SCALAR_LABELS: Record<string, string> = {
  total_sales: 'إجمالي المبيعات',
  total_orders: 'عدد الطلبات المدفوعة',
  revenue: 'الإيرادات',
  expense: 'المصروفات',
  purchase: 'المشتريات',
  profit: 'صافي الربح',
  total_purchases: 'إجمالي المشتريات',
  total_expenses: 'إجمالي المصروفات',
  total_tax: 'إجمالي الضرائب',
}

const MONEY_KEYS = new Set([
  'total_sales',
  'revenue',
  'expense',
  'purchase',
  'profit',
  'total_purchases',
  'total_expenses',
  'total_tax',
  'total',
  'sale_price',
  'stock_value',
  'opening_cash',
  'expected_cash',
  'actual_cash',
  'difference',
])

const COLUMNS: Record<string, { key: string; label: string }[]> = {
  products: [
    { key: 'name', label: 'المنتج' },
    { key: 'sales_count', label: 'الكمية المباعة' },
    { key: 'revenue', label: 'الإيراد' },
    { key: 'sale_price', label: 'سعر البيع' },
  ],
  items: [
    { key: 'name', label: 'الصنف' },
    { key: 'current_stock', label: 'المخزون الحالي' },
    { key: 'min_stock', label: 'الحد الأدنى' },
    { key: 'unit', label: 'الوحدة' },
    { key: 'stock_value', label: 'قيمة المخزون' },
  ],
  staff: [
    { key: 'name', label: 'الموظف' },
    { key: 'username', label: 'اسم المستخدم' },
    { key: 'role', label: 'الدور' },
    { key: 'orders', label: 'عدد الطلبات' },
    { key: 'revenue', label: 'المبيعات' },
  ],
  methods: [
    { key: 'payment_method_label', label: 'طريقة الدفع' },
    { key: 'total', label: 'الإجمالي' },
    { key: 'count', label: 'عدد العمليات' },
  ],
  shifts: [
    { key: 'shift_date_formatted', label: 'التاريخ' },
    { key: 'name', label: 'الوردية' },
    { key: 'user_name', label: 'الكاشير' },
    { key: 'time_range', label: 'الوقت' },
    { key: 'status_label', label: 'الحالة' },
    { key: 'opening_cash', label: 'النقد الافتتاحي' },
    { key: 'expected_cash', label: 'المتوقع' },
    { key: 'actual_cash', label: 'الفعلي' },
    { key: 'difference', label: 'الفرق' },
  ],
}

const SECTION_LABELS: Record<string, string> = {
  products: 'المنتجات',
  items: 'أصناف المخزون',
  staff: 'الموظفون',
  methods: 'طرق الدفع',
  shifts: 'الورديات',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  closed: 'مغلقة',
  pending: 'قيد الانتظار',
  confirmed: 'مؤكدة',
  preparing: 'قيد التحضير',
  ready: 'جاهزة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

const toInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultFrom = () => {
  const now = new Date()
  return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

const formatDate = (value: unknown) => {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('ar-EG')
}

const formatTime = (value: unknown) => {
  if (!value) return ''
  const text = String(value)
  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5)
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(() => toInputDate(new Date()))
  const { symbol, paymentMethods, load } = useSettingsStore()

  const report = REPORTS.find((item) => item.id === reportType) || REPORTS[0]

  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report', reportType, fromDate, toDate],
    queryFn: async () => {
      void load()
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const res = await api.get(`${report.endpoint}?${params.toString()}`)
      return res.data
    },
  })

  const paymentLabel = (value: string) =>
    paymentMethods.find((method) => method.value === value)?.label || value || '-'

  const sections = useMemo(() => {
    if (!reportData) return []
    return report.sections
      .map((key) => {
        const raw = reportData[key]
        if (!Array.isArray(raw)) return null
        let rows = raw

        if (key === 'methods') {
          rows = raw.map((row: any) => ({
            ...row,
            payment_method_label: paymentLabel(row.payment_method),
          }))
        }

        if (key === 'shifts') {
          rows = raw.map((row: any) => ({
            ...row,
            user_name: row.user?.name || row.user_name || '-',
            shift_date_formatted: formatDate(row.shift_date || row.created_at),
            time_range: `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`,
            status_label: STATUS_LABELS[row.status] || row.status || '-',
          }))
        }

        return {
          key,
          label: SECTION_LABELS[key] || key,
          columns: COLUMNS[key] || Object.keys(raw[0] || {}).map((column) => ({
            key: column,
            label: column.replace(/_/g, ' '),
          })),
          rows,
        }
      })
      .filter(Boolean) as Array<{
      key: string
      label: string
      columns: { key: string; label: string }[]
      rows: any[]
    }>
  }, [reportData, report.sections, paymentMethods])

  const metrics = useMemo(() => {
    if (!reportData) return []
    return Object.entries(reportData)
      .filter(([key, value]) => !['from', 'to'].includes(key) && !Array.isArray(value))
      .map(([key, value]) => ({
        key,
        label: SCALAR_LABELS[key] || key.replace(/_/g, ' '),
        value,
      }))
  }, [reportData])

  const formatValue = (value: unknown, key: string) => {
    if (value === null || value === undefined || value === '') return '-'
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
    if (typeof value === 'number' || MONEY_KEYS.has(key)) {
      return formatMoney(value as number, symbol)
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const buildExportRows = () => {
    const rows: { section: string; values: Record<string, string> }[] = []
    metrics.forEach((metric) => {
      rows.push({
        section: metric.label,
        values: { value: formatValue(metric.value, metric.key) },
      })
    })
    sections.forEach((section) => {
      section.rows.forEach((row) => {
        const values: Record<string, string> = {}
        section.columns.forEach((column) => {
          values[column.label] = formatValue(row[column.key], column.key)
        })
        rows.push({ section: section.label, values })
      })
    })
    return rows
  }

  const handleExportCsv = () => {
    const rows = buildExportRows()
    const headers = ['القسم', ...Array.from(new Set(rows.flatMap((row) => Object.keys(row.values))))]
    const lines = [
      headers.map(csvCell).join(','),
      ...rows.map((row) =>
        headers.map((header) => csvCell(header === 'القسم' ? row.section : row.values[header] || '')).join(',')
      ),
    ]
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.id}-${fromDate || 'all'}-${toDate || 'all'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    const metricsHtml = metrics.length
      ? `<div class="metrics">${metrics
          .map(
            (metric) =>
              `<div class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(
                formatValue(metric.value, metric.key)
              )}</strong></div>`
          )
          .join('')}</div>`
      : ''

    const sectionsHtml = sections
      .map(
        (section) => `
          <h2>${escapeHtml(section.label)}</h2>
          ${
            section.rows.length
              ? `<table><thead><tr>${section.columns
                  .map((column) => `<th>${escapeHtml(column.label)}</th>`)
                  .join('')}</tr></thead><tbody>${section.rows
                  .map(
                    (row) =>
                      `<tr>${section.columns
                        .map(
                          (column) =>
                            `<td>${escapeHtml(formatValue(row[column.key], column.key))}</td>`
                        )
                        .join('')}</tr>`
                  )
                  .join('')}</tbody></table>`
              : '<p class="muted">لا توجد بيانات</p>'
          }
        `
      )
      .join('')

    win.document.write(`
      <html dir="rtl"><head><title>${escapeHtml(report.label)}</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111;}
        h1{margin:0 0 4px;font-size:22px;}
        h2{margin:24px 0 8px;font-size:16px;}
        .muted{color:#666;font-size:12px;}
        .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;}
        .metric{border:1px solid #ddd;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:4px;}
        .metric span{font-size:12px;color:#666;}
        .metric strong{font-size:16px;}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
        th,td{border-bottom:1px solid #e5e5e5;padding:8px;text-align:right;}
        th{background:#f5f5f5;}
        @media print{body{padding:8px;}}
      </style></head><body>
        <h1>${escapeHtml(report.label)}</h1>
        <p class="muted">الفترة: ${escapeHtml(fromDate || 'كل الفترات')} إلى ${escapeHtml(
          toDate || 'اليوم'
        )}</p>
        <p class="muted">${escapeHtml(report.description)}</p>
        ${metricsHtml}
        ${sectionsHtml}
        <p class="muted" style="margin-top:24px;">تم إنشاء التقرير في ${escapeHtml(
          new Date().toLocaleString('ar-EG')
        )}</p>
        <script>window.onload = function(){ window.print(); };</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">التقارير</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تقارير تشغيلية ومالية مبنية على بيانات النظام الفعلية
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw className="w-4 h-4" />
          تحديث البيانات
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              نوع التقرير
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {REPORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv}>
              <FileSpreadsheet className="w-4 h-4" />
              تصدير CSV / Excel
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              طباعة / PDF
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري تحميل التقرير...
          </div>
        </Card>
      ) : !reportData ? (
        <Card>
          <p className="text-center py-12 text-gray-500">لا توجد بيانات لهذا التقرير</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.key} padding="sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
                    {formatValue(metric.value, metric.key)}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {sections.map((section) => (
            <Card key={section.key} padding="sm">
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {section.label}
                </h2>
                <span className="text-sm text-gray-500">{section.rows.length} سجل</span>
              </div>
              {section.rows.length === 0 ? (
                <p className="text-center py-8 text-gray-500">لا توجد بيانات للفترة المحددة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {section.columns.map((column) => (
                          <th
                            key={column.key}
                            className="px-3 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr
                          key={row.id || index}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          {section.columns.map((column) => (
                            <td
                              key={column.key}
                              className="px-3 py-2.5 text-gray-700 dark:text-gray-200"
                            >
                              {formatValue(row[column.key], column.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}

          {metrics.length === 0 && sections.every((section) => section.rows.length === 0) && (
            <Card>
              <p className="text-center py-8 text-gray-500">لا توجد بيانات للفترة المحددة</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
