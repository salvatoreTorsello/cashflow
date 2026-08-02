import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import WorkspaceBar from './components/WorkspaceBar'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import CommitmentsPage from './pages/CommitmentsPage'
import CategoriesPage from './pages/CategoriesPage'
import PredictionsPage from './pages/PredictionsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateWorkspacePage from './pages/CreateWorkspacePage'
import { useAuth } from './context/AuthContext'
import { useWorkspace } from './context/WorkspaceContext'

export default function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="app-shell app-shell--centered">Loading…</div>
  }

  if (!user) {
    return (
      <div className="app-shell app-shell--centered">
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </div>
    )
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { workspaces, currentWorkspace, isLoading } = useWorkspace()

  if (isLoading) {
    return <div className="app-shell app-shell--centered">Loading…</div>
  }

  if (workspaces.length === 0 || !currentWorkspace) {
    return (
      <div className="app-shell app-shell--centered">
        <CreateWorkspacePage />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <WorkspaceBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/commitments" element={<CommitmentsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
