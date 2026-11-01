import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
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

const queryClient = new QueryClient()

function App() {
  const { isAuthenticated } = useAuthStore()

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
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App