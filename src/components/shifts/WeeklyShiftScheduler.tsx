import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Copy, Save, ChevronLeft, ChevronRight, User, AlertCircle, CheckCircle, Trash2, Edit3, RotateCcw, Grid3X3, CalendarDays } from 'lucide-react'
import { format, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, eachDayOfInterval, getWeeksInMonth, startOfWeekYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { PatternModal } from './PatternModal'

// Enhanced types for the new system
interface TimeSlot {
  id: string
  startTime: string // HH:MM
  endTime: string // HH:MM
  breakMinutes: number
}

interface DailyShift {
  id: string
  date: string // YYYY-MM-DD
  timeSlots: TimeSlot[]
  isActive: boolean
}

interface ShiftPattern {
  id: string
  name: string
  shifts: Omit<DailyShift, 'id' | 'date'>[]
  totalHours: number
}

interface ShiftSchedulerProps {
  userId: string
  userName?: string
  onSave?: () => void
}

type ViewMode = 'weekly' | 'monthly'
type TabMode = 'shifts' | 'history'

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 1 },
  { key: 'tuesday', label: 'Martes', index: 2 },
  { key: 'wednesday', label: 'Miércoles', index: 3 },
  { key: 'thursday', label: 'Jueves', index: 4 },
  { key: 'friday', label: 'Viernes', index: 5 },
  { key: 'saturday', label: 'Sábado', index: 6 },
  { key: 'sunday', label: 'Domingo', index: 0 }
]

export function WeeklyShiftScheduler({ userId, userName, onSave }: ShiftSchedulerProps) {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')
  const [currentPeriod, setCurrentPeriod] = useState(() => 
    viewMode === 'weekly' 
      ? startOfWeek(new Date(), { weekStartsOn: 1 })
      : startOfMonth(new Date())
  )
  const [dailyShifts, setDailyShifts] = useState<DailyShift[]>([])
  const [originalShifts, setOriginalShifts] = useState<DailyShift[]>([])
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabMode>('shifts')
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false)
  const [editingShift, setEditingShift] = useState<DailyShift | null>(null)
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null)

  // Modal state for time slots
  const [modalTimeSlot, setModalTimeSlot] = useState<TimeSlot>({
    id: '',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60
  })

  useEffect(() => {
    loadShiftData()
  }, [userId, currentPeriod, viewMode])

  const loadShiftData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for now - replace with actual API calls later
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
      
      // Mock daily shifts with multiple time slots
      const mockShifts: DailyShift[] = [
        {
          id: '1',
          date: format(addDays(currentPeriod, 0), 'yyyy-MM-dd'), // Monday
          timeSlots: [
            { id: '1-1', startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
            { id: '1-2', startTime: '15:00', endTime: '18:00', breakMinutes: 0 }
          ],
          isActive: true
        },
        {
          id: '2',
          date: format(addDays(currentPeriod, 1), 'yyyy-MM-dd'), // Tuesday
          timeSlots: [
            { id: '2-1', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }
          ],
          isActive: true
        }
      ]
      
      // Mock patterns
      const mockPatterns: ShiftPattern[] = [
        {
          id: '1',
          name: 'Horario Oficina Estándar',
          shifts: [
            { timeSlots: [{ id: 'p1-1', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }], isActive: true },
            { timeSlots: [{ id: 'p1-2', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }], isActive: true },
            { timeSlots: [{ id: 'p1-3', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }], isActive: true },
            { timeSlots: [{ id: 'p1-4', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }], isActive: true },
            { timeSlots: [{ id: 'p1-5', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }], isActive: true },
            { timeSlots: [], isActive: false },
            { timeSlots: [], isActive: false }
          ],
          totalHours: 35
        },
        {
          id: '2',
          name: 'Horario Partido Hostelería',
          shifts: [
            { timeSlots: [
              { id: 'p2-1-1', startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
              { id: 'p2-1-2', startTime: '19:00', endTime: '23:00', breakMinutes: 0 }
            ], isActive: true },
            { timeSlots: [
              { id: 'p2-2-1', startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
              { id: 'p2-2-2', startTime: '19:00', endTime: '23:00', breakMinutes: 0 }
            ], isActive: true },
            { timeSlots: [], isActive: false },
            { timeSlots: [
              { id: 'p2-4-1', startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
              { id: 'p2-4-2', startTime: '19:00', endTime: '23:00', breakMinutes: 0 }
            ], isActive: true },
            { timeSlots: [
              { id: 'p2-5-1', startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
              { id: 'p2-5-2', startTime: '19:00', endTime: '23:00', breakMinutes: 0 }
            ], isActive: true },
            { timeSlots: [
              { id: 'p2-6-1', startTime: '12:00', endTime: '16:00', breakMinutes: 0 },
              { id: 'p2-6-2', startTime: '20:00', endTime: '24:00', breakMinutes: 0 }
            ], isActive: true },
            { timeSlots: [
              { id: 'p2-7-1', startTime: '12:00', endTime: '16:00', breakMinutes: 0 },
              { id: 'p2-7-2', startTime: '20:00', endTime: '24:00', breakMinutes: 0 }
            ], isActive: true }
          ],
          totalHours: 42
        }
      ]
      
      setDailyShifts(mockShifts)
      setOriginalShifts(JSON.parse(JSON.stringify(mockShifts)))
      setShiftPatterns(mockPatterns)
      
    } catch (err) {
      setError('Error al cargar los datos de turnos')
      console.error('Error loading shift data:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newPeriod = viewMode === 'weekly'
      ? addWeeks(currentPeriod, direction === 'next' ? 1 : -1)
      : addMonths(currentPeriod, direction === 'next' ? 1 : -1)
    setCurrentPeriod(newPeriod)
    setSuccess(null)
    setError(null)
  }

  const goToCurrentPeriod = () => {
    const newPeriod = viewMode === 'weekly'
      ? startOfWeek(new Date(), { weekStartsOn: 1 })
      : startOfMonth(new Date())
    setCurrentPeriod(newPeriod)
  }

  const switchViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    const newPeriod = mode === 'weekly'
      ? startOfWeek(new Date(), { weekStartsOn: 1 })
      : startOfMonth(new Date())
    setCurrentPeriod(newPeriod)
  }

  const calculateTimeSlotHours = (timeSlot: TimeSlot): number => {
    const start = new Date(`2000-01-01T${timeSlot.startTime}:00`)
    const end = new Date(`2000-01-01T${timeSlot.endTime}:00`)
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours < 0) hours += 24 // Handle overnight shifts
    
    hours -= timeSlot.breakMinutes / 60
    return Math.max(0, hours)
  }

  const calculateDailyHours = (shift: DailyShift): number => {
    if (!shift.isActive) return 0
    return Array.isArray(shift.timeSlots) ? shift.timeSlots.reduce((total, slot) => total + calculateTimeSlotHours(slot), 0) : 0
  }

  const getTotalPeriodHours = (): number => {
    return dailyShifts.reduce((total, shift) => total + calculateDailyHours(shift), 0)
  }

  const hasChanges = (): boolean => {
    if (dailyShifts.length !== originalShifts.length) return true
    
    return dailyShifts.some(shift => {
      const original = originalShifts.find(o => o.date === shift.date)
      if (!original) return true
      if (shift.isActive !== original.isActive) return true
      if (shift.timeSlots.length !== original.timeSlots.length) return true
      
      return shift.timeSlots.some((slot, index) => {
        const originalSlot = original.timeSlots[index]
        return !originalSlot ||
               slot.startTime !== originalSlot.startTime ||
               slot.endTime !== originalSlot.endTime ||
               slot.breakMinutes !== originalSlot.breakMinutes
      })
    })
  }

  const openTimeSlotModal = (date: string, existingShift?: DailyShift, existingTimeSlot?: TimeSlot) => {
    setSelectedDate(date)
    setEditingShift(existingShift || null)
    setEditingTimeSlot(existingTimeSlot || null)
    
    if (existingTimeSlot) {
      setModalTimeSlot({
        id: existingTimeSlot.id,
        startTime: existingTimeSlot.startTime,
        endTime: existingTimeSlot.endTime,
        breakMinutes: existingTimeSlot.breakMinutes
      })
    } else {
      setModalTimeSlot({
        id: `temp-${Date.now()}`,
        startTime: '09:00',
        endTime: '17:00',
        breakMinutes: 60
      })
    }
    
    setShowTimeSlotModal(true)
  }

  const saveTimeSlot = () => {
    const existingShift = dailyShifts.find(s => s.date === selectedDate)
    
    if (existingShift) {
      // Update existing shift
      if (editingTimeSlot) {
        // Update existing time slot
        const updatedTimeSlots = existingShift.timeSlots.map(slot =>
          slot.id === editingTimeSlot.id ? modalTimeSlot : slot
        )
        const updatedShift = { ...existingShift, timeSlots: updatedTimeSlots, isActive: true }
        setDailyShifts(prev => prev.map(s => s.id === existingShift.id ? updatedShift : s))
      } else {
        // Add new time slot to existing shift
        const updatedTimeSlots = [...existingShift.timeSlots, modalTimeSlot]
        const updatedShift = { ...existingShift, timeSlots: updatedTimeSlots, isActive: true }
        setDailyShifts(prev => prev.map(s => s.id === existingShift.id ? updatedShift : s))
      }
    } else {
      // Create new shift with time slot
      const newShift: DailyShift = {
        id: `shift-${Date.now()}`,
        date: selectedDate,
        timeSlots: [modalTimeSlot],
        isActive: true
      }
      setDailyShifts(prev => [...prev, newShift])
    }

    setShowTimeSlotModal(false)
    setSuccess(editingTimeSlot ? 'Franja horaria actualizada' : 'Franja horaria agregada')
  }

  const deleteTimeSlot = (shiftId: string, timeSlotId: string) => {
    setDailyShifts(prev => prev.map(shift => {
      if (shift.id === shiftId) {
        const updatedTimeSlots = shift.timeSlots.filter(slot => slot.id !== timeSlotId)
        return {
          ...shift,
          timeSlots: updatedTimeSlots,
          isActive: updatedTimeSlots.length > 0
        }
      }
      return shift
    }).filter(shift => shift.timeSlots.length > 0)) // Remove shifts with no time slots
    
    setSuccess('Franja horaria eliminada')
  }

  const applyPattern = (pattern: ShiftPattern) => {
    const newShifts: DailyShift[] = []
    const periodStart = viewMode === 'weekly' ? currentPeriod : startOfWeek(currentPeriod, { weekStartsOn: 1 })
    
    DAYS_OF_WEEK.forEach((day, index) => {
      const patternShift = pattern.shifts[index]
      if (patternShift && patternShift.isActive && patternShift.timeSlots.length > 0) {
        newShifts.push({
          id: `pattern-${Date.now()}-${index}`,
          date: format(addDays(periodStart, index), 'yyyy-MM-dd'),
          timeSlots: patternShift.timeSlots.map(slot => ({
            ...slot,
            id: `pattern-slot-${Date.now()}-${index}-${slot.id}`
          })),
          isActive: true
        })
      }
    })
    
    setDailyShifts(newShifts)
    setSuccess(`Patrón "${pattern.name}" aplicado`)
  }

  const openCreatePatternModal = () => {
    setEditingPattern(null)
    setShowPatternModal(true)
  }

  const openEditPatternModal = (pattern: ShiftPattern) => {
    setEditingPattern(pattern)
    setShowPatternModal(true)
  }

  const handlePatternSave = (patternData: Omit<ShiftPattern, 'id' | 'createdAt'>) => {
    if (editingPattern) {
      // Update existing pattern
      const updatedPattern = {
        ...editingPattern,
        ...patternData
      }
      setShiftPatterns(prev => prev.map(p => p.id === editingPattern.id ? updatedPattern : p))
      setSuccess(`Patrón "${patternData.name}" actualizado`)
    } else {
      // Create new pattern
      const newPattern: ShiftPattern = {
        id: `pattern-${Date.now()}`,
        ...patternData,
        createdAt: new Date().toISOString()
      }
      setShiftPatterns(prev => [...prev, newPattern])
      setSuccess(`Patrón "${patternData.name}" creado`)
    }
    setShowPatternModal(false)
  }

  const deletePattern = (patternId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este patrón?')) {
      setShiftPatterns(prev => prev.filter(p => p.id !== patternId))
      setSuccess('Patrón eliminado')
    }
  }

  const copyPreviousPeriod = async () => {
    // Mock implementation - would load previous period's data
    const periodType = viewMode === 'weekly' ? 'semana' : 'mes'
    setSuccess(`Turnos del ${periodType} anterior copiados`)
  }

  const clearPeriod = () => {
    setDailyShifts([])
    const periodType = viewMode === 'weekly' ? 'Semana' : 'Mes'
    setSuccess(`${periodType} limpiado`)
  }

  const publishSchedule = async () => {
    setSaving(true)
    setError(null)
    const periodType = viewMode === 'weekly' ? 'semanal' : 'mensual'
    setSuccess(`⏳ Publicando horario ${periodType}...`)
    
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log(`Publishing ${periodType} schedule:`, {
        userId,
        period: format(currentPeriod, 'yyyy-MM-dd'),
        shifts: dailyShifts,
        viewMode
      })
      
      // Update original shifts to reflect saved state
      setOriginalShifts(JSON.parse(JSON.stringify(dailyShifts)))
      setSuccess(`✅ Horario ${periodType} publicado correctamente`)
      onSave?.()
      
    } catch (err) {
      setError(`Error al publicar el horario ${periodType}`)
      console.error('Error publishing schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  const getShiftForDate = (date: string): DailyShift | undefined => {
    return dailyShifts.find(shift => shift.date === date)
  }

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  const renderCalendarView = () => {
    if (viewMode === 'weekly') {
      return renderWeeklyView()
    } else {
      return renderMonthlyView()
    }
  }

  const getPeriodDates = () => {
    return viewMode === 'weekly'
      ? eachDayOfInterval({ start: currentPeriod, end: endOfWeek(currentPeriod, { weekStartsOn: 1 }) })
      : eachDayOfInterval({ start: startOfMonth(currentPeriod), end: endOfMonth(currentPeriod) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const periodStart = viewMode === 'weekly' 
    ? format(currentPeriod, 'dd MMM', { locale: es })
    : format(startOfMonth(currentPeriod), 'dd MMM', { locale: es })
  const periodEnd = viewMode === 'weekly'
    ? format(endOfWeek(currentPeriod, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: es })
    : format(endOfMonth(currentPeriod), 'dd MMM yyyy', { locale: es })
  const totalHours = getTotalPeriodHours()
  const changesDetected = hasChanges()

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Gestión de Turnos {viewMode === 'weekly' ? 'Semanales' : 'Mensuales'}
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
              {dailyShifts.length} día{dailyShifts.length !== 1 ? 's' : ''} con turnos
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => switchViewMode('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                viewMode === 'weekly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Vista Semanal
            </button>
            <button
              onClick={() => switchViewMode('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Vista Mensual
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {periodStart} - {periodEnd}
              </p>
              <p className="text-xs text-gray-500">
                {viewMode === 'weekly' 
                  ? `Semana ${format(currentPeriod, 'w', { locale: es })} de ${format(currentPeriod, 'yyyy')}`
                  : format(currentPeriod, 'MMMM yyyy', { locale: es })
                }
              </p>
            </div>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <Button variant="secondary" size="sm" onClick={goToCurrentPeriod}>
            Ir a {viewMode === 'weekly' ? 'esta semana' : 'este mes'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'shifts' as const, label: `Turnos ${viewMode === 'weekly' ? 'Semanales' : 'Mensuales'}`, icon: Calendar },
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
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={copyPreviousPeriod}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar {viewMode === 'weekly' ? 'semana' : 'mes'} anterior
              </Button>
              <Button variant="secondary" size="sm" onClick={clearPeriod}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar {viewMode === 'weekly' ? 'semana' : 'mes'}
              </Button>
            </div>

            {/* Calendar View */}
            {renderCalendarView()}

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">
                Resumen {viewMode === 'weekly' ? 'Semanal' : 'Mensual'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Días laborables</p>
                  <p className="font-semibold text-blue-900">{dailyShifts.length}</p>
                </div>
                <div>
                  <p className="text-blue-700">Horas totales</p>
                  <p className="font-semibold text-blue-900">{formatHours(totalHours)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Promedio diario</p>
                  <p className="font-semibold text-blue-900">
                    {dailyShifts.length > 0 ? formatHours(totalHours / dailyShifts.length) : '0h 0m'}
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
        {activeTab === 'shifts' && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button
              onClick={publishSchedule}
              loading={saving}
              disabled={saving || !changesDetected}
              size="lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Publicando...' : `Publicar Horario ${viewMode === 'weekly' ? 'Semanal' : 'Mensual'}`}
            </Button>
          </div>
        )}
      </div>
    </div>
      {/* Time Slot Modal */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTimeSlot ? 'Editar Franja Horaria' : 'Agregar Franja Horaria'}
                </h3>
                <button
                  onClick={() => setShowTimeSlotModal(false)}
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
                    value={modalTimeSlot.startTime}
                    onChange={(e) => setModalTimeSlot({ ...modalTimeSlot, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={modalTimeSlot.endTime}
                    onChange={(e) => setModalTimeSlot({ ...modalTimeSlot, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowTimeSlotModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveTimeSlot}>
                {editingTimeSlot ? 'Actualizar' : 'Guardar'} Franja
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Pattern Modal */}
      <PatternModal
        isOpen={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        onSave={handlePatternSave}
        editingPattern={editingPattern}
        currentWeekData={dailyShifts}
      />
    </>
  )

  function renderWeeklyView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const date = format(addDays(currentPeriod, index), 'yyyy-MM-dd')
          const shift = getShiftForDate(date)
          const dayHours = shift ? calculateDailyHours(shift) : 0
          
          return (
            <div key={day.key} className="border border-gray-200 rounded-lg p-4">
              <div className="text-center mb-3">
                <p className="text-sm font-medium text-gray-900">{day.label}</p>
                <p className="text-xs text-gray-500">
                  {format(addDays(currentPeriod, index), 'dd MMM', { locale: es })}
                </p>
              </div>

              {shift && shift.timeSlots.length > 0 ? (
                <div className="space-y-2">
                  {(shift?.timeSlots ?? []).map((timeSlot, slotIndex) => (
                    <div key={timeSlot.id} className="bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="text-xs font-semibold text-blue-700">
                            {timeSlot.startTime} - {timeSlot.endTime}
                          </p>
                          <p className="text-xs text-blue-600">
                            {formatHours(calculateTimeSlotHours(timeSlot))}
                          </p>
                          {timeSlot.breakMinutes > 0 && (
                            <p className="text-xs text-blue-500">
                              Descanso: {timeSlot.breakMinutes}min
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => openTimeSlotModal(date, shift, timeSlot)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTimeSlot(shift.id, timeSlot.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Total: {formatHours(dayHours)}
                    </p>
                    <button
                      onClick={() => openTimeSlotModal(date, shift)}
                      className="w-full p-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-3 h-3 mx-auto mb-1" />
                      Agregar Franja
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-2">Sin turnos</p>
                  <button
                    onClick={() => openTimeSlotModal(date)}
                    className="w-full p-2 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3 h-3 mx-auto mb-1" />
                    Agregar Turno
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderMonthlyView() {
    const monthStart = startOfMonth(currentPeriod)
    const monthEnd = endOfMonth(currentPeriod)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.key} className="bg-gray-50 p-2 text-center">
              <p className="text-xs font-medium text-gray-700">{day.label}</p>
            </div>
          ))}
        </div>
        
        {/* Calendar Body */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map(day => {
            const date = format(day, 'yyyy-MM-dd')
            const shift = getShiftForDate(date)
            const dayHours = shift ? calculateDailyHours(shift) : 0
            const isCurrentMonth = day >= monthStart && day <= monthEnd
            const isToday = isSameDay(day, new Date())
            
            return (
              <div 
                key={date} 
                className={`bg-white p-2 min-h-[100px] ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && (
                    <button
                      onClick={() => openTimeSlotModal(date)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {isCurrentMonth && shift && shift.timeSlots.length > 0 && (
                  <div className="space-y-1">
                    {Array.isArray(shift.timeSlots) ? shift.timeSlots.slice(0, 2).map((timeSlot) => (
                      <div 
                        key={timeSlot.id}
                        className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                        onClick={() => openTimeSlotModal(date, shift, timeSlot)}
                      >
                        {timeSlot.startTime}-{timeSlot.endTime}
                      </div>
                    )) : null}
                    {Array.isArray(shift.timeSlots) && shift.timeSlots.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{shift.timeSlots.length - 2} más
                      </div>
                    )}
                    <div className="text-xs text-gray-600 font-medium">
                      {formatHours(dayHours)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}