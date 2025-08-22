import React, { useState, useEffect } from 'react'
import { Users, Clock, Download, MapPin, LogOut, X, Save, Plus, Edit, Trash2, Eye, FileText } from 'lucide-react'
import { supabase, Profile, TimeEntry } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { EmployeeDetailPage } from './EmployeeDetailPage'
import { AllEmployeesTimesheet } from './AllEmployeesTimesheet'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [currentView, setCurrentView] = useState<'dashboard' | 'employee-detail' | 'all-timesheet'>('dashboard')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [timeEntries, setTimeEntries] = useState<(TimeEntry & { profiles?: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'employee' as 'employee' | 'admin',
    password: ''
  })
  const [userFormError, setUserFormError] = useState('')

  useEffect(() => {
    loadUsers()
    loadTimeEntries()
  }, [profile?.id])

  useEffect(() => {
    loadTimeEntries()
  }, [selectedUser, dateRange, profile?.id])

  const loadUsers = async () => {
    try {
      // Use Edge Function to get all users (bypasses RLS)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
      }

      const accessToken = session.access_token

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar usuarios')
      }

      setUsers(result.users || [])
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTimeEntries = async () => {
    try {
      // Use Edge Function to get time entries (bypasses RLS)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
      }

      const accessToken = session.access_token

      const params = new URLSearchParams({
        selectedUser,
        startDate: dateRange.start,
        endDate: dateRange.end
      })

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-time-entries?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar fichajes')
      }

      setTimeEntries(result.timeEntries || [])
    } catch (err) {
      console.error('Error loading time entries:', err)
    }
  }

  const exportToCSV = () => {
    const headers = ['Empleado', 'Email', 'Tipo', 'Fecha', 'Hora', 'Ubicación']
    const rows = timeEntries.map(entry => [
      entry.profiles?.full_name || 'N/A',
      entry.profiles?.email || 'N/A',
      entry.entry_type === 'check_in' ? 'Entrada' : 'Salida',
      format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: es }),
      format(new Date(entry.timestamp), 'HH:mm', { locale: es }),
      entry.address || `${entry.latitude?.toFixed(4)}, ${entry.longitude?.toFixed(4)}` || 'N/A'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `fichajes_${dateRange.start}_${dateRange.end}.csv`
    link.click()
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentStatus })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user status:', error)
        return
      }

      loadUsers()
    } catch (err) {
      console.error('Error updating user status:', err)
    }
  }

  const openUserModal = (user?: Profile) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        password: ''
      })
    } else {
      setEditingUser(null)
      setUserForm({
        full_name: '',
        email: '',
        role: 'employee',
        password: ''
      })
    }
    setUserFormError('')
    setShowUserModal(true)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    setUserForm({
      full_name: '',
      email: '',
      role: 'employee',
      password: ''
    })
    setUserFormError('')
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserFormError('')

    try {
      if (editingUser) {
        // Update existing user
        const updateData: Partial<Profile> = {
          full_name: userForm.full_name,
          email: userForm.email,
          role: userForm.role
        }
        
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id)

        if (error) {
          throw error
        }
      } else {
        // Create new user
        if (!userForm.password) {
          setUserFormError('La contraseña es requerida para nuevos usuarios')
          return
        }
        
        // Create user via Edge Function
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          throw new Error('No hay sesión activa')
        }

        const accessToken = session.access_token

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            full_name: userForm.full_name,
            role: userForm.role
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Error al crear usuario')
        }
      }
      
      closeUserModal()
      loadUsers()
    } catch (err: any) {
      setUserFormError(err.message || 'Error al procesar la solicitud')
    }
  }

  const deleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        // Delete user via Edge Function
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          throw new Error('No hay sesión activa')
        }

        const accessToken = session.access_token

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Error al eliminar usuario')
        }

        loadUsers()
      } catch (err) {
        console.error('Error deleting user:', err)
        alert('Error al eliminar usuario: ' + (err as Error).message)
      }
    }
  }

  const activeEmployees = users.filter(u => u.role === 'employee' && u.active).length
  const todayEntries = timeEntries.filter(e => 
    format(new Date(e.timestamp), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
              <p className="text-sm text-gray-600">Gestión de fichajes y usuarios</p>
            </div>
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        <div className="grid grid-cols-1 gap-8">
          {/* Users Management */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => openUserModal()}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Usuario
                  </button>
                  <button
                    onClick={viewAllTimesheet}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Todos los Fichajes
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {users.map(user => (
                  <div 
                    key={user.id} 
                    className={`grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
                      user.role === 'employee' ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    onClick={(e) => {
                      // Only navigate if clicking on the row itself, not on buttons
                      if (user.role === 'employee' && e.target === e.currentTarget) {
                        viewEmployeeDetail(user.id)
                      }
                    }}
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Empleado'}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="col-span-3 flex items-center justify-end space-x-2">
                      {user.role === 'employee' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            viewEmployeeDetail(user.id)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openUserModal(user)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar usuario"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.role === 'employee' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleUserStatus(user.id, user.active)
                            }}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              user.active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteUser(user.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Editar Usuario' : 'Agregar Usuario'}
                </h3>
                <button
                  onClick={closeUserModal}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUserSubmit} className="p-6">
              {userFormError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm">
                  {userFormError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingresa el nombre completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="correo@empresa.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'employee' | 'admin' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña {editingUser && '(dejar vacío para mantener actual)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}