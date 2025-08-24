import React, { useState, useEffect } from 'react'
import { Clock, Save, Plus, Trash2, AlertCircle, X } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, DaySchedule, TimeSlot, ShiftValidationError } from '../../types/shift-management.types'
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
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: number]: ShiftValidationError }>({})
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [userId])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const loadSchedules = async () => {
    try {
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      // Group shifts by day and convert to time slots
      const dayGroups = new Map<number, WorkShift[]>()
      existingShifts.forEach(shift => {
        if (!dayGroups.has(shift.day_of_week)) {
          dayGroups.set(shift.day_of_week, [])
        }
        dayGroups.get(shift.day_of_week)!.push(shift)
      })

      const initialSchedules = DAYS_OF_WEEK.map(day => {
        const dayShifts = dayGroups.get(day.value) || []
        return {
          day_of_week: day.value,
          is_active: dayShifts.length > 0,
          time_slots: dayShifts.length > 0 
            ? dayShifts.map(shift => ({
                id: generateId(),
                start_time: shift.start_time,
                end_time: shift.end_time
              }))
            : [{
                id: generateId(),
                start_time: '09:00',
                end_time: '17:00'
              }]
        }
      })

      setSchedules(initialSchedules)
    } catch (error) {
      console.error('Error loading schedules:', error)
    } finally {
      setLoading(false)
    }
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

  const toggleDay = (dayIndex: number) => {
    const newSchedules = [...schedules]
    newSchedules[dayIndex].is_active = !newSchedules[dayIndex].is_active
    setSchedules(newSchedules)
    setSuccess(null)
  }

  const addTimeSlot = (dayIndex: number) => {
    const newSchedules = [...schedules]
    const lastSlot = newSchedules[dayIndex].time_slots[newSchedules[dayIndex].time_slots.length - 1]
    
    // Smart default: start where last slot ended
    const newStartTime = lastSlot ? lastSlot.end_time : '09:00'
    const newEndTime = lastSlot ? 
      String(parseInt(lastSlot.end_time.split(':')[0]) + 1).padStart(2, '0') + ':00' : 
      '17:00'
    
    newSchedules[dayIndex].time_slots.push({
      id: generateId(),
      start_time: newStartTime,
      end_time: newEndTime
    })
    
    setSchedules(newSchedules)
    setSuccess(null)
  }

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    const newSchedules = [...schedules]
    newSchedules[dayIndex].time_slots = newSchedules[dayIndex].time_slots.filter(slot => slot.id !== slotId)
    
    // If no slots left, add a default one
    if (newSchedules[dayIndex].time_slots.length === 0) {
      newSchedules[dayIndex].time_slots.push({
        id: generateId(),
        start_time: '09:00',
        end_time: '17:00'
      })
    }
    
    setSchedules(newSchedules)
    setSuccess(null)
  }

  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'start_time' | 'end_time', value: string) => {
    const newSchedules = [...schedules]
    const slotIndex = newSchedules[dayIndex].time_slots.findIndex(slot => slot.id === slotId)
    if (slotIndex !== -1) {
      newSchedules[dayIndex].time_slots[slotIndex][field] = value
    }
    setSchedules(newSchedules)

    // Clear errors for this shift
    const newErrors = { ...errors }
    delete newErrors[dayIndex]
    setErrors(newErrors)
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrors({})

    // Convert schedules to shifts format
    const shiftsToSave: any[] = []
    
    schedules.forEach(schedule => {
      if (schedule.is_active) {
        schedule.time_slots.forEach(slot => {
          shiftsToSave.push({
            day_of_week: schedule.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_active: true,
            break_duration_minutes: 0 // Default value for compatibility
          })
        })
      }
    })

    // Validate all active time slots
    const newErrors: { [key: number]: ShiftValidationError } = {}
    let hasErrors = false

    schedules.forEach((schedule, dayIndex) => {
      if (schedule.is_active) {
        schedule.time_slots.forEach(slot => {
          const slotErrors = validateTimeSlot(slot)
          if (Object.keys(slotErrors).length > 0) {
            newErrors[dayIndex] = slotErrors
            hasErrors = true
          }
        })
      }
    })

    setErrors(newErrors)

    if (hasErrors) {
      setSaving(false)
      return
    }

    try {
      await ShiftManagementService.saveWorkShifts(userId, shiftsToSave)
      setSuccess('✅ Turnos guardados correctamente')
      onSave?.()
    } catch (error) {
      console.error('Error saving shifts:', error)
      setSuccess('❌ Error al guardar los turnos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
      
      // Auto-hide success message after 3 seconds
      if (success?.includes('✅')) {
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      }
    }
  }

  const calculateWeeklyHours = () => {
    return schedules.reduce((total, schedule) => {
      if (!schedule.is_active) return total

      return total + schedule.time_slots.reduce((dayTotal, slot) => {
        const start = new Date(`2000-01-01T${slot.start_time}:00`)
        const end = new Date(`2000-01-01T${slot.end_time}:00`)
        
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        if (hours < 0) hours += 24 // Handle overnight shifts
        
        return dayTotal + Math.max(0, hours)
      }, 0)
    }, 0)
  }

  const getTotalSlotsForDay = (dayIndex: number) => {
    return schedules[dayIndex]?.time_slots.length || 0
  }

  const getDayTotalHours = (dayIndex: number) => {
    const schedule = schedules[dayIndex]
    if (!schedule?.is_active) return 0

    return schedule.time_slots.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.start_time}:00`)
      const end = new Date(`2000-01-01T${slot.end_time}:00`)
      
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (hours < 0) hours += 24
      
      return total + Math.max(0, hours)
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const weeklyHours = calculateWeeklyHours()
  const monthlyHours = weeklyHours * 4.33 // Average weeks per month

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
              Configura múltiples franjas horarias por día
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Horas semanales</p>
            <p className="text-lg font-semibold text-blue-600">
              {ShiftManagementService.formatHours(weeklyHours)}
            </p>
            <p className="text-xs text-gray-500">
              ~{ShiftManagementService.formatHours(monthlyHours)} mensuales
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
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const schedule = schedules[dayIndex]
            const dayErrors = errors[dayIndex] || {}
            const totalSlots = getTotalSlotsForDay(dayIndex)
            const dayHours = getDayTotalHours(dayIndex)

            return (
              <div key={day.value} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={schedule?.is_active || false}
                      onChange={() => toggleDay(dayIndex)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="ml-3 text-sm font-medium text-gray-900">
                      {day.label}
                    </label>
                    {schedule?.is_active && totalSlots > 1 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {totalSlots} franjas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {schedule?.is_active && (
                      <>
                        <span className="text-xs text-gray-500">
                          {ShiftManagementService.formatHours(dayHours)}
                        </span>
                        <button
                          type="button"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Franja
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {schedule?.is_active && (
                  <div className="space-y-3">
                    {schedule.time_slots.map((slot, slotIndex) => (
                      <div key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Inicio
                            </label>
                            <input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) => updateTimeSlot(dayIndex, slot.id, 'start_time', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                dayErrors.start_time ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) => updateTimeSlot(dayIndex, slot.id, 'end_time', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                dayErrors.end_time ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div className="text-xs text-gray-500 min-w-[60px] text-center">
                            {(() => {
                              const start = new Date(`2000-01-01T${slot.start_time}:00`)
                              const end = new Date(`2000-01-01T${slot.end_time}:00`)
                              let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                              if (hours < 0) hours += 24
                              return ShiftManagementService.formatHours(Math.max(0, hours))
                            })()}
                          </div>
                        </div>
                        {schedule.time_slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(dayIndex, slot.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar franja"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {dayErrors.start_time && (
                      <p className="text-xs text-red-600">{dayErrors.start_time}</p>
                    )}
                    {dayErrors.end_time && (
                      <p className="text-xs text-red-600">{dayErrors.end_time}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            className={saving ? 'cursor-wait' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Turnos'}
          </Button>
        </div>
      </div>
    </div>
  )
}