import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/services/api'

export interface RestaurantSettings {
  id?: number
  name: string
  slug?: string
  phone?: string
  email?: string
  address?: string
  currency: string
  symbol: string
  tax_number?: string
  tax_rate: number
  timezone?: string
  locale?: string
  logo?: string
  primary_color?: string
}

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي' },
  { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
  { code: 'BHD', symbol: 'د.ب', name: 'دينار بحريني' },
  { code: 'OMR', symbol: 'ر.ع', name: 'ريال عماني' },
  { code: 'JOD', symbol: 'د.أ', name: 'دينار أردني' },
  { code: 'USD', symbol: '$', name: 'دولار أمريكي' },
  { code: 'EUR', symbol: '€', name: 'يورو' },
  { code: 'GBP', symbol: '£', name: 'جنيه إسترليني' },
  { code: 'TRY', symbol: '₺', name: 'ليرة تركية' },
]

export const symbolForCurrency = (code?: string): string =>
  CURRENCIES.find((c) => c.code === code)?.symbol || 'ر.س'

const DEFAULT_CURRENCY = 'SAR'
const DEFAULT_SYMBOL = symbolForCurrency(DEFAULT_CURRENCY)
const DEFAULT_TAX_RATE = 0.15

interface SettingsState {
  restaurant: RestaurantSettings | null
  currency: string
  symbol: string
  taxRate: number
  loaded: boolean
  loading: boolean
  load: (force?: boolean) => Promise<void>
  applyRestaurant: (restaurant: Partial<RestaurantSettings> | null | undefined) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      restaurant: null,
      currency: DEFAULT_CURRENCY,
      symbol: DEFAULT_SYMBOL,
      taxRate: DEFAULT_TAX_RATE,
      loaded: false,
      loading: false,
      load: async (force = false) => {
        if (get().loading) return
        if (get().loaded && !force) return
        set({ loading: true })
        try {
          const res = await api.get('/auth/restaurant')
          get().applyRestaurant(res.data?.restaurant)
        } catch {
          // Keep the last known settings (or defaults) when the API is unavailable.
        } finally {
          set({ loading: false, loaded: true })
        }
      },
      applyRestaurant: (restaurant) => {
        if (!restaurant) return
        const current = get()
        const currency = restaurant.currency || current.currency
        const symbol = restaurant.symbol || symbolForCurrency(currency) || current.symbol
        const taxRate =
          restaurant.tax_rate !== undefined && restaurant.tax_rate !== null
            ? Number(restaurant.tax_rate)
            : current.taxRate
        set({
          restaurant: { ...(current.restaurant || {}), ...restaurant } as RestaurantSettings,
          currency,
          symbol,
          taxRate: Number.isFinite(taxRate) ? taxRate : current.taxRate,
        })
      },
    }),
    {
      name: 'restaurant-settings',
      partialize: (state) => ({
        restaurant: state.restaurant,
        currency: state.currency,
        symbol: state.symbol,
        taxRate: state.taxRate,
        loaded: state.loaded,
      }),
    }
  )
)

export function formatMoney(
  value: number | string | null | undefined,
  symbol: string,
  withSymbol = true
): string {
  const amount = Number(value ?? 0)
  const safe = Number.isFinite(amount) ? amount : 0
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withSymbol ? `${formatted} ${symbol}` : formatted
}

export function useCurrency() {
  const currency = useSettingsStore((s) => s.currency)
  const symbol = useSettingsStore((s) => s.symbol)
  const taxRate = useSettingsStore((s) => s.taxRate)
  const format = (value: number | string | null | undefined, withSymbol = true) =>
    formatMoney(value, symbol, withSymbol)
  return { currency, symbol, taxRate, format }
}
