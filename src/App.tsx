import React from 'react'
import { useAuth } from './hooks/useAuth'
import { PageLayout } from './components/layout/PageLayout'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { AuthForm } from './components/AuthForm'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { EmployeeDashboard } from './components/EmployeeDashboard'

function App() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Cargando aplicación...</p>
            <p className="text-xs text-gray-500">Si esto toma mucho tiempo, verifica tu conexión</p>
          </div>
        </div>
      </PageLayout>
    )
  }
  if (!user || !profile) {
    return <AuthForm />
  }
  return (
    <ErrorBoundary>
      {profile.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
    </ErrorBoundary>
  )
}

export default App