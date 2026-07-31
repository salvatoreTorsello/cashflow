import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import CommitmentsPage from './pages/CommitmentsPage'
import CategoriesPage from './pages/CategoriesPage'

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/commitments" element={<CommitmentsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
