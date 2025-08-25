import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Copy, Save, ChevronLeft, ChevronRight, User, AlertCircle, CheckCircle, Trash2, Edit3, RotateCcw } from 'lucide-react'
import { format, addWeeks, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

// Types for the new system
interface WeeklyShift {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  breakMinutes: number
  isActive: boolean
}

interface ShiftPattern {
  id: string
  name: string
  shifts: Omit<WeeklyShift, 'id' | 'date'>[]
  totalHours: number
}

interface WeeklyShiftSchedulerProps {
  userId: string
  userName?: string
  onSave?: () => void
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 1 },
  { key: 'tuesday', label: 'Martes', index: 2 },
  { key: 'wednesday', label: 'Miércoles', index: 3 },
  { key: 'thursday', label: 'Jueves', index: 4 },
  { key: 'friday', label: 'Viernes', index: 5 },
  { key: 'saturday', label: 'Sábado', index: 6 },
  { key: 'sunday', label: 'Domingo', index: 0 }
]

export function WeeklyShiftScheduler({ userId, userName, onSave }: WeeklyShiftSchedulerProps) {
  // State management
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weeklyShifts, setWeeklyShifts] = useState<WeeklyShift[]>([])
  const [originalShifts, setOriginalShifts] = useState<WeeklyShift[]>([])
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'weekly' | 'patterns' | 'history'>('weekly')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editingShift, setEditingShift] = useState<WeeklyShift | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Modal state
  const [modalShift, setModalShift] = useState({
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    isActive: true
  })

  useEffect(() => {
    loadWeeklyData()
  }, [userId, currentWeek])

  const loadWeeklyData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for now - replace with actual API calls later
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
      
      // Mock weekly shifts
      const mockShifts: WeeklyShift[] = [
        {
          id: '1',
          date: format(addDays(currentWeek, 0), 'yyyy-MM-dd'), // Monday
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isActive: true
        },
        {
          id: '2',
          date: format(addDays(currentWeek, 1), 'yyyy-MM-dd'), // Tuesday
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isActive: true
        }
      ]
      
      // Mock patterns
      const mockPatterns: ShiftPattern[] = [
        {
          id: '1',
          name: 'Horario Oficina Estándar',
          shifts: [
            { startTime: '09:00', endTime: '17:00', breakMinutes: 60, isActive: true },
            { startTime: '09:00', endTime: '17:00', breakMinutes: 60, isActive: true },
            { startTime: '09:00', endTime: '17:00', breakMinutes: 60, isActive: true },
            { startTime: '09:00', endTime: '17:00', breakMinutes: 60, isActive: true },
            { startTime: '09:00', endTime: '17:00', breakMinutes: 60, isActive: true },
            { startTime: '', endTime: '', breakMinutes: 0, isActive: false },
            { startTime: '', endTime: '', breakMinutes: 0, isActive: false }
          ],
          totalHours: 35
        }
      ]
      
      setWeeklyShifts(mockShifts)
      setOriginalShifts(JSON.parse(JSON.stringify(mockShifts)))
      setShiftPatterns(mockPatterns)
      
    } catch (err) {
      setError('Error al cargar los datos de turnos')
      console.error('Error loading weekly data:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addWeeks(currentWeek, direction === 'next' ? 1 : -1)
    setCurrentWeek(newWeek)
    setSuccess(null)
    setError(null)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const calculateShiftHours = (shift: WeeklyShift): number => {
    if (!shift.isActive || !shift.startTime || !shift.endTime) return 0
    
    const start = new Date(`2000-01-01T${shift.startTime}:00`)
    const end = new Date(`2000-01-01T${shift.endTime}:00`)
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours < 0) hours += 24 // Handle overnight shifts
    
    hours -= shift.breakMinutes / 60
    return Math.max(0, hours)
  }

  const getTotalWeeklyHours = (): number => {
    return weeklyShifts.reduce((total, shift) => total + calculateShiftHours(shift), 0)
  }

  const hasChanges = (): boolean => {
    if (weeklyShifts.length !== originalShifts.length) return true
    
    return weeklyShifts.some(shift => {
      const original = originalShifts.find(o => o.date === shift.date)
      return !original || 
             shift.startTime !== original.startTime ||
             shift.endTime !== original.endTime ||
             shift.breakMinutes !== original.breakMinutes ||
             shift.isActive !== original.isActive
    })
  }

  const openShiftModal = (date: string, existingShift?: WeeklyShift) => {
    setSelectedDate(date)
    setEditingShift(existingShift || null)
    
    if (existingShift) {
      setModalShift({
        startTime: existingShift.startTime,
        endTime: existingShift.endTime,
        breakMinutes: existingShift.breakMinutes,
        isActive: existingShift.isActive
      })
    } else {
      setModalShift({
        startTime: '09:00',
        endTime: '17:00',
        breakMinutes: 60,
        isActive: true
      })
    }
    
    setShowShiftModal(true)
  }

  const saveShift = () => {
    const shiftData: WeeklyShift = {
      id: editingShift?.id || `temp-${Date.now()}`,
      date: selectedDate,
      ...modalShift
    }

    if (editingShift) {
      // Update existing shift
      setWeeklyShifts(prev => prev.map(s => s.id === editingShift.id ? shiftData : s))
    } else {
      // Add new shift
      setWeeklyShifts(prev => [...prev, shiftData])
    }

    setShowShiftModal(false)
    setSuccess(editingShift ? 'Turno actualizado' : 'Turno agregado')
  }

  const deleteShift = (shiftId: string) => {
    setWeeklyShifts(prev => prev.filter(s => s.id !== shiftId))
    setSuccess('Turno eliminado')
  }

  const applyPattern = (pattern: ShiftPattern) => {
    const newShifts: WeeklyShift[] = []
    
    DAYS_OF_WEEK.forEach((day, index) => {
      const patternShift = pattern.shifts[index]
      if (patternShift && patternShift.isActive) {
        newShifts.push({
          id: `pattern-${Date.now()}-${index}`,
          date: format(addDays(currentWeek, index), 'yyyy-MM-dd'),
          ...patternShift
        })
      }
    })
    
    setWeeklyShifts(newShifts)
    setSuccess(`Patrón "${pattern.name}" aplicado`)
  }

  const copyPreviousWeek = async () => {
    // Mock implementation - would load previous week's data
    setSuccess('Turnos de la semana anterior copiados')
  }

  const clearWeek = () => {
    setWeeklyShifts([])
    setSuccess('Semana limpiada')
  }

  const publishWeeklySchedule = async () => {
    setSaving(true)
    setError(null)
    setSuccess('⏳ Publicando horario semanal...')
    
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Publishing weekly schedule:', {
        userId,
        week: format(currentWeek, 'yyyy-MM-dd'),
        shifts: weeklyShifts
      })
      
      // Update original shifts to reflect saved state
      setOriginalShifts(JSON.parse(JSON.stringify(weeklyShifts)))
      setSuccess('✅ Horario semanal publicado correctamente')
      onSave?.()
      
    } catch (err) {
      setError('Error al publicar el horario semanal')
      console.error('Error publishing schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  const getShiftForDate = (date: string): WeeklyShift | undefined => {
    return weeklyShifts.find(shift => shift.date === date)
  }

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const weekStart = format(currentWeek, 'dd MMM', { locale: es })
  const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: es })
  const totalHours = getTotalWeeklyHours()
  const changesDetected = hasChanges()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Gestión de Turnos Semanales
            </h2>
            {userName && (
              <p className="text-sm text-gray-600 mt-1">
                Empleado: {userName}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-blue-600">
              {formatHours(totalHours)}
            </p>
            <p className="text-xs text-gray-500">
              {weeklyShifts.length} turno{weeklyShifts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {weekStart} - {weekEnd}
              </p>
              <p className="text-xs text-gray-500">
                Semana {format(currentWeek, 'w', { locale: es })} de {format(currentWeek, 'yyyy')}
              </p>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <Button variant="secondary" size="sm" onClick={goToCurrentWeek}>
            Ir a esta semana
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'weekly' as const, label: 'Turnos Semanales', icon: Calendar },
            { id: 'patterns' as const, label: 'Patrones', icon: Copy },
            { id: 'history' as const, label: 'Historial', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
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

      {/* Content */}
      <div className="p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-3" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'weekly' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={copyPreviousWeek}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar semana anterior
              </Button>
              <Button variant="secondary" size="sm" onClick={clearWeek}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar semana
              </Button>
            </div>

            {/* Weekly Calendar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {DAYS_OF_WEEK.map((day, index) => {
                const date = format(addDays(currentWeek, index), 'yyyy-MM-dd')
                const shift = getShiftForDate(date)
                const dayHours = shift ? calculateShiftHours(shift) : 0
                
                return (
                  <div key={day.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center mb-3">
                      <p className="text-sm font-medium text-gray-900">{day.label}</p>
                      <p className="text-xs text-gray-500">
                        {format(addDays(currentWeek, index), 'dd MMM', { locale: es })}
                      </p>
                    </div>

                    {shift ? (
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-blue-600">
                            {shift.startTime} - {shift.endTime}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatHours(dayHours)}
                          </p>
                          {shift.breakMinutes > 0 && (
                            <p className="text-xs text-gray-400">
                              Descanso: {shift.breakMinutes}min
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openShiftModal(date, shift)}
                            className="flex-1 p-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit3 className="w-3 h-3 mx-auto" />
                          </button>
                          <button
                            onClick={() => deleteShift(shift.id)}
                            className="flex-1 p-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-2">Sin turno</p>
                        <button
                          onClick={() => openShiftModal(date)}
                          className="w-full p-2 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          <Plus className="w-3 h-3 mx-auto mb-1" />
                          Agregar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Resumen Semanal</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Días laborables</p>
                  <p className="font-semibold text-blue-900">{weeklyShifts.length}</p>
                </div>
                <div>
                  <p className="text-blue-700">Horas totales</p>
                  <p className="font-semibold text-blue-900">{formatHours(totalHours)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Promedio diario</p>
                  <p className="font-semibold text-blue-900">
                    {weeklyShifts.length > 0 ? formatHours(totalHours / weeklyShifts.length) : '0h 0m'}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Estado</p>
                  <p className={`font-semibold ${changesDetected ? 'text-orange-600' : 'text-green-600'}`}>
                    {changesDetected ? 'Cambios pendientes' : 'Sincronizado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Patrones de Turno</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Crear Patrón
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shiftPatterns.map(pattern => (
                <div key={pattern.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{pattern.name}</h4>
                      <p className="text-sm text-gray-500">{formatHours(pattern.totalHours)} semanales</p>
                    </div>
                    <div className="flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {pattern.shifts.map((shift, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-gray-600">{DAYS_OF_WEEK[index].label}</span>
                        <span className={shift.isActive ? 'text-gray-900' : 'text-gray-400'}>
                          {shift.isActive ? `${shift.startTime} - ${shift.endTime}` : 'Descanso'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => applyPattern(pattern)}
                  >
                    Aplicar a semana actual
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Historial de Turnos</h3>
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Historial de turnos próximamente</p>
            </div>
          </div>
        )}

        {/* Publish Button */}
        {activeTab === 'weekly' && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button
              onClick={publishWeeklySchedule}
              loading={saving}
              disabled={saving || !changesDetected}
              size="lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Publicando...' : 'Publicar Horario Semanal'}
            </Button>
          </div>
        )}
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingShift ? 'Editar Turno' : 'Agregar Turno'}
                </h3>
                <button
                  onClick={() => setShowShiftModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={modalShift.startTime}
                    onChange={(e) => setModalShift({ ...modalShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={modalShift.endTime}
                    onChange={(e) => setModalShift({ ...modalShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descanso (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={modalShift.breakMinutes}
                  onChange={(e) => setModalShift({ ...modalShift, breakMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={modalShift.isActive}
                  onChange={(e) => setModalShift({ ...modalShift, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Turno activo
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveShift}>
                {editingShift ? 'Actualizar' : 'Guardar'} Turno
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}