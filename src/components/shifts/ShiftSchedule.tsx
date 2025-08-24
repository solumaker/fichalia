import React, { useState, useEffect } from 'react'
import { Clock, Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, WorkShiftInput, ShiftValidationError } from '../../types/shift-management.types'
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
  const [shifts, setShifts] = useState<WorkShiftInput[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: number]: ShiftValidationError }>({})
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadShifts()
  }, [userId])

  const loadShifts = async () => {
    try {
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      // Initialize with existing shifts or empty template
      const shiftMap = new Map(existingShifts.map(shift => [shift.day_of_week, {
        day_of_week: shift.day_of_week,
        start_time: shift.start_time,
        end_time: shift.end_time,
        is_active: shift.is_active,
        break_duration_minutes: shift.break_duration_minutes
      }]))

      const initialShifts = DAYS_OF_WEEK.map(day => 
        shiftMap.get(day.value) || {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          is_active: false,
          break_duration_minutes: 60
        }
      )

      setShifts(initialShifts)
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateShift = (shift: WorkShiftInput): ShiftValidationError => {
    const errors: ShiftValidationError = {}

    if (!shift.start_time) {
      errors.start_time = 'Hora de inicio requerida'
    }

    if (!shift.end_time) {
      errors.end_time = 'Hora de fin requerida'
    }

    if (shift.start_time && shift.end_time) {
      if (!ShiftManagementService.validateShiftTime(shift.start_time, shift.end_time)) {
        errors.end_time = 'La hora de fin debe ser diferente a la de inicio'
      }
    }

    if (shift.break_duration_minutes < 0 || shift.break_duration_minutes > 480) {
      errors.break_duration_minutes = 'Descanso debe estar entre 0 y 480 minutos'
    }

    return errors
  }

  const updateShift = (index: number, field: keyof WorkShiftInput, value: any) => {
    const newShifts = [...shifts]
    newShifts[index] = { ...newShifts[index], [field]: value }
    setShifts(newShifts)

    // Clear errors for this shift
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrors({})

    // Validate all active shifts
    const newErrors: { [key: number]: ShiftValidationError } = {}
    let hasErrors = false

    shifts.forEach((shift, index) => {
      if (shift.is_active) {
        const shiftErrors = validateShift(shift)
        if (Object.keys(shiftErrors).length > 0) {
          newErrors[index] = shiftErrors
          hasErrors = true
        }
      }
    })

    setErrors(newErrors)

    if (hasErrors) {
      setSaving(false)
      return
    }

    try {
      await ShiftManagementService.saveWorkShifts(userId, shifts)
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
    return shifts.reduce((total, shift) => {
      if (!shift.is_active) return total

      const start = new Date(`2000-01-01T${shift.start_time}:00`)
      const end = new Date(`2000-01-01T${shift.end_time}:00`)
      
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (hours < 0) hours += 24 // Handle overnight shifts
      
      hours -= shift.break_duration_minutes / 60
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
              Configura tus horarios de trabajo semanales
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
          {DAYS_OF_WEEK.map((day, index) => {
            const shift = shifts[index]
            const shiftErrors = errors[index] || {}

            return (
              <div key={day.value} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shift.is_active}
                      onChange={(e) => updateShift(index, 'is_active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="ml-3 text-sm font-medium text-gray-900">
                      {day.label}
                    </label>
                  </div>
                  {shift.is_active && (
                    <span className="text-xs text-gray-500">
                      {(() => {
                        const start = new Date(`2000-01-01T${shift.start_time}:00`)
                        const end = new Date(`2000-01-01T${shift.end_time}:00`)
                        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                        if (hours < 0) hours += 24
                        hours -= shift.break_duration_minutes / 60
                        return ShiftManagementService.formatHours(Math.max(0, hours))
                      })()}
                    </span>
                  )}
                </div>

                {shift.is_active && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hora inicio
                      </label>
                      <input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => updateShift(index, 'start_time', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          shiftErrors.start_time ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {shiftErrors.start_time && (
                        <p className="text-xs text-red-600 mt-1">{shiftErrors.start_time}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hora fin
                      </label>
                      <input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => updateShift(index, 'end_time', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          shiftErrors.end_time ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {shiftErrors.end_time && (
                        <p className="text-xs text-red-600 mt-1">{shiftErrors.end_time}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descanso (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={shift.break_duration_minutes}
                        onChange={(e) => updateShift(index, 'break_duration_minutes', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          shiftErrors.break_duration_minutes ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {shiftErrors.break_duration_minutes && (
                        <p className="text-xs text-red-600 mt-1">{shiftErrors.break_duration_minutes}</p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <div className="text-xs text-gray-500">
                        <p>Turno nocturno: {shift.start_time > shift.end_time ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
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