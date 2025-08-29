import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Calendar, Edit, Trash2, Save, User, Settings, Camera, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile, TimeEntry, DateRange, UserFormData } from '../../types'
import { UserService } from '../../services/userService'
import { TimeEntryService } from '../../services/timeEntryService'
import { TimeEntryUtils } from '../../utils/timeEntryUtils'
import { DateUtils } from '../../utils/dateUtils'
import { ExportUtils } from '../../utils/exportUtils'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { useAuth } from '../../hooks/useAuth'
import { Header } from '../layout/Header'
import { PageLayout } from '../layout/PageLayout'
import { DatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { TimeEntriesHistory } from './TimeEntriesHistory'

interface EmployeeDetailPageProps {
  employeeId: string
  onBack: () => void
}

export function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const { handleAsync } = useErrorHandler()
  const [employee, setEmployee] = useState<Profile | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(DateUtils.getLastNDaysRange(30))
  const [showEditModal, setShowEditModal] = useState(false)
  const { signOut } = useAuth()
  const [employeeImage, setEmployeeImage] = useState<string>('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'profile' | 'shifts' | 'salary' | 'reports'>('history')
  const [editError, setEditError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: 'employee' as 'employee' | 'admin',
    active: true,
    profile_image_url: ''
  })

  useEffect(() => {
    loadEmployeeData()
  }, [employeeId])

  useEffect(() => {
    if (employee) {
      loadTimeEntries()
      setEditFormData({
        full_name: employee.full_name,
        email: employee.email,
        role: employee.role,
        active: employee.active,
        profile_image_url: employee.profile_image_url || ''
      })
      setImagePreview(employee.profile_image_url || '')
    }
  }, [dateRange, employee])

  const loadEmployeeData = async () => {
    const users = await handleAsync(() => UserService.getAllUsers(), undefined, (error) => {
        console.error('Error loading employee:', error)
        if (error instanceof Error && error.message.includes('No hay sesión activa')) {
          signOut()
        }
      })
    if (users) {
      const foundEmployee = users.find(u => u.id === employeeId)
      setEmployee(foundEmployee || null)
    }
    setLoading(false)
  }

  const updateProfileImage = (value: string) => {
    setEditFormData(prev => ({ ...prev, profile_image_url: value }))
    setSuccess(null)
    setImagePreview(value)
  }

  const handleImageError = () => {
    setImagePreview('')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setEditError('Por favor selecciona un archivo de imagen válido')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setEditError('El archivo es demasiado grande. Máximo 5MB permitido.')
      return
    }

    setEditError(null)
    setSuccess(null)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      setImagePreview(imageUrl)
      setEditFormData(prev => ({ ...prev, profile_image_url: imageUrl }))
    }
    reader.readAsDataURL(file)
  }

  const loadTimeEntries = async () => {
    if (!employee) return

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        signOut()
        return
      }

      const accessToken = session.access_token

      const params = new URLSearchParams({
        selectedUser: employee.id,
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

      const entries = (result.timeEntries || []).map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        entry_type: entry.entry_type,
        timestamp: entry.timestamp,
        latitude: entry.latitude,
        longitude: entry.longitude,
        address: entry.address,
        created_at: entry.created_at
      }))
      
      setTimeEntries(entries)
    } catch (err) {
      console.error('Error loading time entries:', err)
      if (err instanceof Error && err.message.includes('No hay sesión activa')) {
        signOut()
      }
    }
  }

  const setPresetDateRange = (preset: 'today' | 'week' | 'month') => {
    switch (preset) {
      case 'today':
        setDateRange(DateUtils.getTodayRange())
        break
      case 'week':
        setDateRange(DateUtils.getWeekRange())
        break
      case 'month':
        setDateRange(DateUtils.getMonthRange())
        break
    }
  }

  const exportToCSV = () => {
    if (!employee) return
    ExportUtils.exportEmployeeTimeEntriesToCSV(timeEntries, employee, dateRange)
  }

  const openEditModal = () => {
    if (employee) {
      setEditFormData({
        full_name: employee.full_name,
        email: employee.email,
        role: employee.role,
        active: employee.active,
        profile_image_url: employee.profile_image_url || ''
      })
      setEditError(null)
      setNewPassword('')
      setShowPasswordField(false)
    }
  }


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    setEditError(null)
    setSuccess(null)
    setSaving(true)
    try {
      console.log('Updating user with data:', editFormData)
      await UserService.updateUser(employee.id, {
        full_name: editFormData.full_name,
        email: editFormData.email,
        role: editFormData.role,
        active: editFormData.active,
        profile_image_url: editFormData.profile_image_url
      })
      setSuccess('✅ Cambios guardados correctamente')
      await loadEmployeeData()
      
      // Update password if provided
      if (newPassword.trim()) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            throw new Error('No hay sesión activa')
          }

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: employee.id,
              newPassword: newPassword
            })
          })

          const result = await response.json()
          if (!response.ok) {
            throw new Error(result.error || 'Error al actualizar contraseña')
          }
        } catch (passwordError: any) {
          setEditError('Usuario actualizado, pero error al cambiar contraseña: ' + passwordError.message)
          setSaving(false)
          return
        }
      }
      
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el usuario')
    } finally {
      setSaving(false)
    }
  }

  const toggleUserStatus = async () => {
    if (!employee) return

    try {
      await UserService.toggleUserStatus(employee.id, employee.active)
      await loadEmployeeData()
      // Force a small delay to ensure the UI updates
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err: any) {
      alert('Error al cambiar el estado del usuario: ' + err.message)
    }
  }

  const deleteUser = async () => {
    if (!employee) return

    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${employee.full_name}?`)) {
      try {
        await UserService.deleteUser(employee.id)
        onBack()
      } catch (err: any) {
        alert('Error al eliminar el usuario: ' + err.message)
      }
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Cargando datos del empleado...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!employee) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="flex items-center space-x-3">
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const pairedEntries = TimeEntryUtils.createPairedEntries(timeEntries)

  const tabs = [
    { id: 'history' as const, label: 'Historial', icon: Calendar },
    { id: 'profile' as const, label: 'Perfil', icon: User }
  ]

  return (
    <>
    <PageLayout>
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 sm:px-6 lg:px-8 lg:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Perfil de Empleado</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Información detallada y gestión del empleado</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Empty space for future actions if needed */}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6">
              {/* Employee Info Section */}
              <div className="flex items-center space-x-3 sm:space-x-4 py-4 sm:pr-8 sm:border-r sm:border-gray-200">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={employee.full_name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{employee.full_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{employee.email}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    employee.active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {employee.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
              <nav className="flex space-x-4 sm:space-x-8 flex-1 sm:pl-8 py-2 sm:py-0 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
        </div>

        {/* Filters and Summary - Only show for history tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-8">
            <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:justify-between">
              <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPresetDateRange('today')}>
                    Hoy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPresetDateRange('week')}>
                    Esta semana
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPresetDateRange('month')}>
                    Este mes
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
                  <DatePicker
                    label="Desde"
                    value={dateRange.start}
                    onChange={(value) => setDateRange({ ...dateRange, start: value })}
                  />
                  <DatePicker
                    label="Hasta"
                    value={dateRange.end}
                    onChange={(value) => setDateRange({ ...dateRange, end: value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={exportToCSV}
                  variant="primary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">Exportar</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Historial de Fichajes</h2>
              </div>
              
              <div className="p-4 sm:p-6">
                {pairedEntries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No hay fichajes en el rango seleccionado</p>
                    <p className="text-sm">Ajusta las fechas para ver más registros</p>
                  </div>
                ) : (
                  <TimeEntriesHistory pairedEntries={pairedEntries} />
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'profile' && employee && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <form onSubmit={handleEditSubmit} className="p-6" autoComplete="off">
                {editError && (
                  <div className="mb-6 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm">
                    {editError}
                  </div>
                )}
                
                {success && (
                  <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm font-medium">
                      {success}
                    </div>
                  </div>
                )}
                
                {/* Professional Form Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
                  {/* Profile Image Section - Left Column */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <div className="relative inline-block">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Profile"
                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-200"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                            <User className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL de la imagen
                        </label>
                        <input
                          type="url"
                          value={editFormData.profile_image_url?.startsWith('data:') ? '' : (editFormData.profile_image_url || '')}
                          onChange={(e) => updateProfileImage(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                        
                        <div className="flex items-center justify-center">
                          <span className="text-xs text-gray-500">o</span>
                        </div>
                        
                        <div>
                          <input
                            type="file"
                            id="profile-image-upload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="profile-image-upload"
                            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 cursor-pointer transition-colors"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Subir desde ordenador
                          </label>
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          Formatos: JPG, PNG, GIF (máx. 5MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields - Two Columns */}
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Required Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="text-red-500 mr-1">*</span>
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.full_name}
                          onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ingresa el nombre completo"
                          autoComplete="name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="text-red-500 mr-1">*</span>
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          required
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="correo@empresa.com"
                          autoComplete="email"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="text-red-500 mr-1">*</span>
                          Rol
                        </label>
                        <select
                          required
                          value={editFormData.role}
                          onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'employee' | 'admin' })}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="employee">Empleado</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>

                      {/* Optional Fields */}

                      {/* Password Change Button */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Contraseña
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPasswordField(!showPasswordField)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          >
                            {showPasswordField ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </>
                            ) : (
                              <>
                                <Edit className="w-4 h-4 mr-1" />
                                Cambiar contraseña
                              </>
                            )}
                          </button>
                        </div>
                        {showPasswordField && (
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nueva contraseña (mínimo 6 caracteres)"
                            minLength={6}
                            autoComplete="new-password"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-200">
                  <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <span className="text-sm font-medium text-gray-700">Estado del usuario:</span>
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                          editFormData.active
                            ? 'bg-green-100 text-green-800 border-2 border-green-300'
                            : 'bg-red-100 text-red-800 border-2 border-red-300'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          editFormData.active ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        {editFormData.active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que quieres ${editFormData.active ? 'desactivar' : 'activar'} a ${employee.full_name}?`)) {
                            toggleUserStatus()
                          }
                        }}
                      >
                        {editFormData.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que quieres eliminar permanentemente a ${employee.full_name}? Esta acción no se puede deshacer.`)) {
                            deleteUser()
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={`w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm ${
                          saving 
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                        }`}
                        onClick={(e) => {
                          e.preventDefault()
                          if (window.confirm(`¿Confirmas que quieres guardar los cambios para ${employee.full_name}?`)) {
                            handleEditSubmit(e as any)
                          }
                        }}
                      >
                        {saving && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        )}
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
          
        </div>
      </div>
    </PageLayout>
    </>
  )
}