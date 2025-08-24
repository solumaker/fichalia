import React, { useState, useEffect } from 'react'
import { Clock, Save, Plus, X } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, TimeSlot, ShiftValidationError } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ShiftScheduleProps {
  userId: string
  onSave?: () => void
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

export function ShiftSchedule({ userId, onSave }: ShiftScheduleProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: ShiftValidationError }>({})
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadTimeSlots()
  }, [userId])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const loadTimeSlots = async () => {
    try {
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      // Convert shifts to time slots
      const slots: TimeSlot[] = existingShifts.map(shift => ({
        id: generateId(),
        day_of_week: shift.day_of_week,
        start_time: shift.start_time,
        end_time: shift.end_time
      }))

      setTimeSlots(slots)
    } catch (error) {
      console.error('Error loading time slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTimeSlot = () => {
    // Default to Monday (1) for new slots
    const newSlot: TimeSlot = {
      id: generateId(),
      day_of_week: 1, // Monday by default
      start_time: '09:00',
      end_time: '17:00'
    }
    
    setTimeSlots([...timeSlots, newSlot])
    setSuccess(null)
  }

  const removeTimeSlot = (slotId: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== slotId))
    setSuccess(null)
    
    // Clear errors for this slot
    const newErrors = { ...errors }
    delete newErrors[slotId]
    setErrors(newErrors)
  }

  const updateTimeSlot = (slotId: string, field: keyof TimeSlot, value: string | number) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === slotId ? { ...slot, [field]: value } : slot
    ))
    setSuccess(null)
    
    // Clear errors for this slot
    const newErrors = { ...errors }
    delete newErrors[slotId]
    setErrors(newErrors)
  }

  const validateTimeSlot = (slot: TimeSlot): ShiftValidationError => {
    const errors: ShiftValidationError = {}

    if (!slot.start_time) {
      errors.start_time = 'Hora de inicio requerida'
    }

    if (!slot.end_time) {
      errors.end_time = 'Hora de fin requerida'
    }

    if (slot.start_time && slot.end_time) {
      if (!ShiftManagementService.validateShiftTime(slot.start_time, slot.end_time)) {
        errors.end_time = 'La hora de fin debe ser diferente a la de inicio'
      }
    }

    return errors
  }

  const calculateTotalHours = () => {
    return timeSlots.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.start_time}:00`)
      const end = new Date(`2000-01-01T${slot.end_time}:00`)
      
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (hours < 0) hours += 24 // Handle overnight shifts
      
      return total + Math.max(0, hours)
    }, 0)
  }

  const calculateSlotHours = (slot: TimeSlot) => {
    const start = new Date(`2000-01-01T${slot.start_time}:00`)
    const end = new Date(`2000-01-01T${slot.end_time}:00`)
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours < 0) hours += 24
    
    return Math.max(0, hours)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrors({})

    // Validate all time slots
    const newErrors: { [key: string]: ShiftValidationError } = {}
    let hasErrors = false

    timeSlots.forEach(slot => {
      const slotErrors = validateTimeSlot(slot)
      if (Object.keys(slotErrors).length > 0) {
        newErrors[slot.id] = slotErrors
        hasErrors = true
      }
    })

    setErrors(newErrors)

    if (hasErrors) {
      setSaving(false)
      return
    }

    // Process time slots to handle multiple slots per day
    // Keep only the last time slot for each day to comply with unique constraint
    const daySlotMap = new Map<number, TimeSlot>()
    
    timeSlots.forEach(slot => {
      daySlotMap.set(slot.day_of_week, slot)
    })
    
    // Convert processed slots to shifts format
    const shiftsToSave = Array.from(daySlotMap.values()).map(slot => ({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_active: true,
      break_duration_minutes: 0
    }))

    try {
      await ShiftManagementService.saveWorkShifts(userId, shiftsToSave)
      setSuccess('✅ Turnos guardados correctamente')
      onSave?.()
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error('Error saving shifts:', error)
      setSuccess('❌ Error al guardar los turnos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalHours = calculateTotalHours()
  const weeklyHours = totalHours // This is now total hours across all slots
  const monthlyHours = weeklyHours * 4.33

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Gestión de Turnos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Crea múltiples franjas horarias para cualquier día
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total de horas</p>
            <p className="text-lg font-semibold text-blue-600">
              {ShiftManagementService.formatHours(totalHours)}
            </p>
            <p className="text-xs text-gray-500">
              {timeSlots.length} franja{timeSlots.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {success && (
          <div className={`mb-6 p-4 rounded-lg transition-all duration-300 ${
            success.includes('✅') 
              ? 'bg-green-100 border border-green-200 text-green-800' 
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}>
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Add Time Slot Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Franjas Horarias</h3>
            <Button
              onClick={addTimeSlot}
              variant="secondary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Franja
            </Button>
          </div>

          {/* Time Slots List */}
          {timeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-4">No hay franjas horarias configuradas</p>
              <Button onClick={addTimeSlot} variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Franja
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {timeSlots.map((slot, index) => {
                const slotErrors = errors[slot.id] || {}
                const slotHours = calculateSlotHours(slot)
                
                return (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-4">
                      {/* Day Selector */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Día
                        </label>
                        <select
                          value={slot.day_of_week}
                          onChange={(e) => updateTimeSlot(slot.id, 'day_of_week', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Time */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Inicio
                        </label>
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => updateTimeSlot(slot.id, 'start_time', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            slotErrors.start_time ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {slotErrors.start_time && (
                          <p className="text-xs text-red-600 mt-1">{slotErrors.start_time}</p>
                        )}
                      </div>

                      {/* End Time */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fin
                        </label>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => updateTimeSlot(slot.id, 'end_time', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            slotErrors.end_time ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {slotErrors.end_time && (
                          <p className="text-xs text-red-600 mt-1">{slotErrors.end_time}</p>
                        )}
                      </div>

                      {/* Duration Display */}
                      <div className="text-center min-w-[80px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Duración
                        </label>
                        <div className="text-sm font-semibold text-blue-600 py-2">
                          {ShiftManagementService.formatHours(slotHours)}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="flex items-end pb-2">
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(slot.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar franja"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {timeSlots.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Resumen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Total de franjas</p>
                <p className="font-semibold text-blue-900">{timeSlots.length}</p>
              </div>
              <div>
                <p className="text-blue-700">Horas totales</p>
                <p className="font-semibold text-blue-900">{ShiftManagementService.formatHours(totalHours)}</p>
              </div>
              <div>
                <p className="text-blue-700">Promedio por franja</p>
                <p className="font-semibold text-blue-900">
                  {timeSlots.length > 0 ? ShiftManagementService.formatHours(totalHours / timeSlots.length) : '0h 0m'}
                </p>
              </div>
              <div>
                <p className="text-blue-700">Días únicos</p>
                <p className="font-semibold text-blue-900">
                  {new Set(timeSlots.map(slot => slot.day_of_week)).size}
                </p>
                <div>
                  <p className="text-blue-700">Días con múltiples franjas</p>
                  <p className="font-semibold text-blue-900">
                    {(() => {
                      const dayCount = new Map<number, number>()
                      timeSlots.forEach(slot => {
                        dayCount.set(slot.day_of_week, (dayCount.get(slot.day_of_week) || 0) + 1)
                      })
                      return Array.from(dayCount.values()).filter(count => count > 1).length
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving || timeSlots.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Turnos'}
          </Button>
        </div>
      </div>
    </div>
  )
}