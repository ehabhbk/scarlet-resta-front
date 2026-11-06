import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
import { toast } from 'sonner'
import api from './services/api'
import { useSettingsStore } from './store/settingsStore'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/products/ProductsPage'
import OrdersPage from './pages/orders/OrdersPage'
import TablesPage from './pages/tables/TablesPage'
import KitchenPage from './pages/kitchen/KitchenPage'
import InventoryPage from './pages/inventory/InventoryPage'
import CustomersPage from './pages/customers/CustomersPage'
import EmployeesPage from './pages/employees/EmployeesPage'
import FinancePage from './pages/finance/FinancePage'
import ChartOfAccountsPage from './pages/finance/ChartOfAccountsPage'
import TrialBalancePage from './pages/finance/TrialBalancePage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import InventoryUnitsPage from './pages/inventory-units/InventoryUnitsPage'
import IncomeStatementPage from './pages/finance/IncomeStatementPage'
import BalanceSheetPage from './pages/finance/BalanceSheetPage'
import LedgerPage from './pages/finance/LedgerPage'
import JournalEntriesPage from './pages/finance/JournalEntriesPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import RecipesPage from './pages/recipes/RecipesPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import UsersPage from './pages/users/UsersPage'
import ExpensesPage from './pages/expenses/ExpensesPage'
import AttendancePage from './pages/attendance/AttendancePage'
import ShiftsPage from './pages/shifts/ShiftsPage'
import StockMovementsPage from './pages/stock/StockMovementsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import AreasPage from './pages/areas/AreasPage'
import KitchenStationsPage from './pages/kitchen-stations/KitchenStationsPage'
import CategoriesPage from './pages/categories/CategoriesPage'
import RolesPage from './pages/roles/RolesPage'
import AutoTranslate from './i18n/AutoTranslate'

const queryClient = new QueryClient()

function App() {
  const { isAuthenticated } = useAuthStore()
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)
  const loadSettings = useSettingsStore((state) => state.load)

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    api.get('/auth/me')
      .then((response) => {
        if (active && response.data?.user) setUser(response.data.user)
      })
      .catch((error) => {
        if (!active) return
        if (error?.response?.status === 401) {
          logout()
          return
        }
        toast.error(error?.response?.data?.message || 'تعذر تحديث صلاحيات المستخدم')
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, logout, setUser])

  useEffect(() => {
    if (isAuthenticated) void loadSettings(true)
  }, [isAuthenticated, loadSettings])

  useEffect(() => {
    // Subscribe to kitchen orders via Reverb
    // In full implementation: window.Echo.join('kitchen').listen('KitchenOrderBroadcast', ...)
    const cleanup = () => {
      console.log('Reverb cleanup')
    }
    return cleanup
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            isAuthenticated ? (
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? (
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/pos" element={
            isAuthenticated ? (
              <MainLayout>
                <POSPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/products" element={
            isAuthenticated ? (
              <MainLayout>
                <ProductsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/orders" element={
            isAuthenticated ? (
              <MainLayout>
                <OrdersPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/tables" element={
            isAuthenticated ? (
              <MainLayout>
                <TablesPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/kitchen" element={
            isAuthenticated ? (
              <MainLayout>
                <KitchenPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/inventory" element={
            isAuthenticated ? (
              <MainLayout>
                <InventoryPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/suppliers" element={
            isAuthenticated ? (
              <MainLayout>
                <SuppliersPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/inventory-units" element={
            isAuthenticated ? (
              <MainLayout>
                <InventoryUnitsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/customers" element={
            isAuthenticated ? (
              <MainLayout>
                <CustomersPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/employees" element={
            isAuthenticated ? (
              <MainLayout>
                <EmployeesPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/finance" element={
            isAuthenticated ? (
              <MainLayout>
                <FinancePage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/finance/chart-of-accounts" element={isAuthenticated ? (<MainLayout><ChartOfAccountsPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/finance/trial-balance" element={isAuthenticated ? (<MainLayout><TrialBalancePage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/finance/income-statement" element={isAuthenticated ? (<MainLayout><IncomeStatementPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/finance/balance-sheet" element={isAuthenticated ? (<MainLayout><BalanceSheetPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/finance/ledger" element={isAuthenticated ? (<MainLayout><LedgerPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/finance/journal-entries" element={isAuthenticated ? (<MainLayout><JournalEntriesPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/reports" element={
            isAuthenticated ? (
              <MainLayout>
                <ReportsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/settings" element={
            isAuthenticated ? (
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/recipes" element={
            isAuthenticated ? (
              <MainLayout>
                <RecipesPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/purchases" element={
            isAuthenticated ? (
              <MainLayout>
                <PurchasesPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/users" element={
            isAuthenticated ? (
              <MainLayout>
                <UsersPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/expenses" element={
            isAuthenticated ? (
              <MainLayout>
                <ExpensesPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/attendance" element={isAuthenticated ? (<MainLayout><AttendancePage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/shifts" element={isAuthenticated ? (<MainLayout><ShiftsPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/stock-movements" element={isAuthenticated ? (<MainLayout><StockMovementsPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/notifications" element={isAuthenticated ? (<MainLayout><NotificationsPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/areas" element={isAuthenticated ? (<MainLayout><AreasPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/kitchen-stations" element={isAuthenticated ? (<MainLayout><KitchenStationsPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/categories" element={isAuthenticated ? (<MainLayout><CategoriesPage /></MainLayout>) : (<Navigate to="/login" />)} />
          <Route path="/roles" element={isAuthenticated ? (<MainLayout><RolesPage /></MainLayout>) : (<Navigate to="/login" />)} />
        </Routes>
        <Toaster position="top-center" richColors />
        <AutoTranslate />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App