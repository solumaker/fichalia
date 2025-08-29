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
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
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
      (users) => {
        // Sort users alphabetically by name
        const sortedUsers = users.sort((a, b) => a.full_name.localeCompare(b.full_name))
        setUsers(sortedUsers)
      },
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
    if (!editingUser && !formData.password) {
      setError('La contraseña es requerida para nuevos usuarios')
      return
    }
    
    if (editingUser) {
      // Update existing user
      await handleAsync(
        () => UserService.updateUser(editingUser.id, {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role
        }),
        () => {
          closeUserModal()
          loadUsers()
        }
      )
    } else {
      // Create new user
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

  // Filter users based on status
  const filteredUsers = users.filter(user => {
    if (statusFilter === 'active') return user.active
    if (statusFilter === 'inactive') return !user.active
    return true // 'all'
  })

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
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={backToTimeTracking}
              className="inline-flex items-center px-2 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Panel Admin</h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Gestión de usuarios</p>
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="hidden sm:inline text-sm text-gray-600">Admin: {profile?.full_name}</span>
            <button
              onClick={signOut}
              className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
          {/* Mobile-optimized header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Usuarios</h2>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-2 sm:order-first sm:mr-4">
                <span className="text-xs text-gray-500">Filtrar:</span>
                <div className="flex rounded-md overflow-hidden bg-gray-50 border border-gray-200">
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'active'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Activos ({users.filter(u => u.active).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('inactive')}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'inactive'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Inactivos ({users.filter(u => !u.active).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Todos ({users.length})
                  </button>
                </div>
              </div>
              
              {/* Mobile: Stack buttons vertically, Desktop: Horizontal */}
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
                <Button 
                  onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                  className="w-full sm:w-auto justify-center"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="sm:hidden">Nuevo Usuario</span>
                  <span className="hidden sm:inline">Agregar Usuario</span>
                </Button>
                <Button 
                  variant="success" 
                  onClick={viewAllTimesheet}
                  className="w-full sm:w-auto justify-center"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Todos los Fichajes
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <UserList
              users={filteredUsers}
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