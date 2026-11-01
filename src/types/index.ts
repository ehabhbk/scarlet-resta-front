export interface Role {
  id: number
  name: string
  guard_name: string
}

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  restaurant_id: number
  is_active: boolean
  roles: Role[]
  restaurant?: {
    id: number
    name: string
    slug: string
    currency: string
    symbol: string
    tax_rate: number
    logo?: string
  }
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface Category {
  id: number
  name: string
  slug?: string
  color?: string
  is_active: boolean
  restaurant_id: number
}

export interface Product {
  id: number
  name: string
  sku?: string
  sale_price: number
  cost_price: number
  current_stock: number
  is_available: boolean
  category?: Category
  image?: string
}

export interface Order {
  id: number
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: PaginationMeta
}
