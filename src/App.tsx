import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'
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

const queryClient = new QueryClient()

function App() {
  const { isAuthenticated } = useAuthStore()

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
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
