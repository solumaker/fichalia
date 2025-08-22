import React, { useState, useEffect } from 'react'
import { Plus, FileText, LogOut, ArrowLeft } from 'lucide-react'
import type { Profile, UserFormData, ViewMode } from '../../types'
import { UserService } from '../../services/userService'
import { useAuth } from '../../hooks/useAuth'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { Header } from '../layout/Header'
import { PageLayout } from '../layout/PageLayout'
import { UserList } from './UserManagement/UserList'
import { UserModal } from './UserManagement/UserModal'
import { EmployeeDetailPage } from '../employee/EmployeeDetailPage'
import { AllEmployeesTimesheet } from '../AllEmployeesTimesheet'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { AdminTimeTrackingDashboard } from './AdminTimeTrackingDashboard'

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const { error, setError, clearError, handleAsync } = useErrorHandler()
  
  const [currentView, setCurrentView] = useState<ViewMode | 'time-tracking'>('time-tracking')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  // Monitor for session errors and force logout
  useEffect(() => {
    if (error && (error.includes('No hay sesión activa') || error.includes('Invalid Refresh Token'))) {
      console.log('Session error detected, signing out user')
      signOut()
    }
  }, [error, signOut])

  const loadUsers = async () => {
    const result = await handleAsync(
      () => UserService.getAllUsers(),
      (users) => setUsers(users),
      (error) => console.error('Error loading users:', error)
    )
    setLoading(false)
  }

  const openUserModal = (user?: Profile) => {
    setEditingUser(user || null)
    setShowUserModal(true)
    clearError()
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    clearError()
  }

  const handleUserSubmit = async (formData: UserFormData) => {
    if (!formData.password) {
      setError('La contraseña es requerida para nuevos usuarios')
      return
    }
    
    await handleAsync(
      () => UserService.createUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role
      }),
      () => {
        closeUserModal()
        loadUsers()
      }
    )
  }

  const viewEmployeeDetail = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setCurrentView('employee-detail')
  }

  const backToDashboard = () => {
    setCurrentView('dashboard')
    setSelectedEmployeeId(null)
  }

  const viewAllTimesheet = () => {
    setCurrentView('all-timesheet')
  }
  
  const navigateToUsers = () => {
    setCurrentView('dashboard')
  }
  
  const backToTimeTracking = () => {
    setCurrentView('time-tracking')
  }

  if (currentView === 'time-tracking') {
    return <AdminTimeTrackingDashboard onNavigateToUsers={navigateToUsers} />
  }

  if (currentView === 'employee-detail' && selectedEmployeeId) {
    return (
      <EmployeeDetailPage 
        employeeId={selectedEmployeeId} 
        onBack={backToDashboard}
      />
    )
  }

  if (currentView === 'all-timesheet') {
    return (
      <AllEmployeesTimesheet onBack={backToDashboard} />
    )
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Cargando panel administrativo...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Header
        leftContent={
          <div>
            <div className="flex items-center space-x-3">
              <button
                onClick={backToTimeTracking}
                className="inline-flex items-center px-2 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Panel Administrativo</h2>
            <p className="text-sm text-gray-600">Gestión de fichajes y usuarios</p>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Admin: {profile?.full_name}</span>
            <button
              onClick={signOut}
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h2>
              <div className="flex gap-3">
                <Button onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Usuario
                </Button>
                <Button variant="success" onClick={viewAllTimesheet}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Todos los Fichajes
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <UserList
              users={users}
              onViewEmployee={viewEmployeeDetail}
              onReloadUsers={loadUsers}
            />
          </div>
        </div>
      </div>

      <UserModal
        isOpen={showUserModal}
        onClose={closeUserModal}
        onSubmit={handleUserSubmit}
        editingUser={editingUser}
        error={error || ''}
      />
    </PageLayout>
  )
}