import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Calendar, Edit, Trash2 } from 'lucide-react'
import type { Profile, TimeEntry, DateRange, UserFormData } from '../../types'
import { UserService } from '../../services/userService'
import { TimeEntryService } from '../../services/timeEntryService'
import { TimeEntryUtils } from '../../utils/timeEntryUtils'
import { DateUtils } from '../../utils/dateUtils'
import { ExportUtils } from '../../utils/exportUtils'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { Header } from '../layout/Header'
import { PageLayout } from '../layout/PageLayout'
import { DatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { TimeEntriesHistory } from './TimeEntriesHistory'
import { UserModal } from '../admin/UserManagement/UserModal'

interface EmployeeDetailPageProps {
  employeeId: string
  onBack: () => void
}

export function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const [employee, setEmployee] = useState<Profile | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: DateUtils.getLastNDaysRange(30).start, // Last 30 days
    end: DateUtils.getLastNDaysRange(30).end,
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    loadEmployeeData()
  }, [employeeId])

  useEffect(() => {
    if (employee) {
      loadTimeEntries()
    }
  }, [dateRange, employee])

  const loadEmployeeData = async () => {
    const { handleAsync } = useErrorHandler()
    const users = await handleAsync(() => UserService.getAllUsers())
    if (users) {
      const foundEmployee = users.find((u: Profile) => u.id === employeeId)
      
      if (!foundEmployee) {
        console.error('Employee not found')
        return
      }

      setEmployee(foundEmployee)
    } else {
      console.error('Error loading employee:', err)
    }
    setLoading(false)
  } // Removed finally block as handleAsync handles loading state

  const loadTimeEntries = async () => {
    if (!employee) return

    try {
      // Use Edge Function to get time entries (bypasses RLS)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
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
        return
      }

      // Extract just the time entries from the result
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
    setEditError(null)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditError(null)
  }

  const handleEditSubmit = async (formData: UserFormData) => {
    if (!employee) return

    setEditError(null)
    try {
      await UserService.updateUser(employee.id, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
      })
      await loadEmployeeData() // Reload employee data to reflect changes
      closeEditModal()
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el usuario')
    }
  }

  const toggleUserStatus = async () => {
    if (!employee) return

    try {
      await UserService.toggleUserStatus(employee.id, employee.active)
      await loadEmployeeData() // Reload employee data to reflect changes
    } catch (err: any) {
      alert('Error al cambiar el estado del usuario: ' + err.message)
    }
  }

  const deleteUser = async () => {
    if (!employee) return

    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${employee.full_name}?`)) {
      try {
        await UserService.deleteUser(employee.id)
        onBack() // Go back to admin dashboard after deletion
      } catch (err: any) {
        alert('Error al eliminar el usuario: ' + err.message)
      }
    }
  }

  const pairedEntries = TimeEntryUtils.createPairedEntries(timeEntries)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del empleado...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Empleado no encontrado</p>
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
        </div>
      </div>
    )
  }

  // Moved to TimeEntryUtils
  // const formatTotalDuration = (minutes: number) => {
  //   const hours = Math.floor(minutes / 60)
  //   const mins = minutes % 60
  //   if (hours === 0) {
  //     return `${mins}m`
  //   }
  //   return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
  // }

  // Moved to TimeEntryUtils
  // const formatDuration = (minutes: number | null) => {
  //   if (!minutes) return 'En curso...'
  //   const hours = Math.floor(minutes / 60)
  //   const mins = minutes % 60
  //   return `${hours}h ${mins}m`
  // }

  return (
    <PageLayout>
      <Header
        title={employee.full_name}
        subtitle={employee.email}
        actions={
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              employee.active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {employee.active ? 'Activo' : 'Inactivo'}
            </span>
            <Button variant="secondary" onClick={openEditModal} size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              variant={employee.active ? 'danger' : 'success'}
              size="sm"
              onClick={toggleUserStatus}
            >
              {employee.active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button variant="danger" size="sm" onClick={deleteUser}>
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
            <Button onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setPresetDateRange('today')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hoy
                </button>
                <Button variant="secondary" size="sm" onClick={() => setPresetDateRange('week')}>
                  Esta semana
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPresetDateRange('month')}>
                  Este mes
                </Button>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={exportToCSV}
              disabled={timeEntries.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          </div>

        </div>

        {/* Time Entries History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Fichajes</h2>
          </div>
          
          <div className="p-6">
            {pairedEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No hay fichajes en el rango seleccionado</p>
                <p className="text-sm">Ajusta las fechas para ver más registros</p>
              </div>
            ) : (
              <div className="space-y-6">
                <TimeEntriesHistory pairedEntries={pairedEntries} />
              </div>
            )}
          </div>
        </div>
      </div>

      {employee && (
        <UserModal
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSubmit={handleEditSubmit}
          editingUser={employee}
          error={editError || ''}
        />
      )}
    </PageLayout>
  )
}