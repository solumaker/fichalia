import React, { useState, useEffect } from 'react'
import { Clock, Save, Plus, X, Copy } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, WorkShiftInput } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ShiftRecord {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  isNew?: boolean
}

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
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadShifts()
  }, [userId])

  const loadShifts = async () => {
    try {
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      const shiftRecords: ShiftRecord[] = existingShifts.map(shift => ({
        id: shift.id,
        day_of_week: shift.day_of_week,
        start_time: shift.start_time,
        end_time: shift.end_time
      }))

      setShifts(shiftRecords)
    } catch (error) {
      console.error('Error loading shifts:', error)
      setError('Error al cargar los turnos')
    } finally {
      setLoading(false)
    }
  }

  const addNewShift = () => {
    // Default to Monday (1) for new shifts
    let defaultDay = 1
    
    // If there are existing shifts, use the same day as the last shift
    if (shifts.length > 0) {
      defaultDay = shifts[shifts.length - 1].day_of_week
    }
    
    const newShift: ShiftRecord = {
      id: `temp-${Date.now()}`,
      day_of_week: defaultDay,
      start_time: '09:00',
      end_time: '17:00',
      isNew: true
    }
    
    setShifts(prev => [...prev, newShift])
    setSuccess(null)
    setError(null)
  }

  const duplicateShift = (index: number) => {
    const originalShift = shifts[index]
    
    // Find next day of the week (cycling through 1-7)
    let nextDay = (originalShift.day_of_week % 7) + 1
    if (nextDay === 0) nextDay = 7 // Convert 0 to 7 (Sunday)    
    
    const duplicatedShift: ShiftRecord = {
      id: `temp-${Date.now()}`,
      day_of_week: nextDay,
      start_time: originalShift.start_time,
      end_time: originalShift.end_time,
      isNew: true
    }
    
    setShifts(prev => [...prev, duplicatedShift])
    setSuccess(null)
    setError(null)
  }

  const removeShift = (index: number) => {
    setShifts(prev => prev.filter((_, i) => i !== index))
    setSuccess(null)
    setError(null)
  }

  const updateShift = (index: number, field: keyof ShiftRecord, value: any) => {
    setShifts(prev => prev.map((shift, i) => 
      i === index 
        ? { ...shift, [field]: value, isNew: shift.id.startsWith('temp-') }
        : shift
    ))
    setSuccess(null)
    setError(null)
  }

  const calculateHours = (shift: ShiftRecord) => {
    const start = new Date(`2000-01-01T${shift.start_time}:00`)
    const end = new Date(`2000-01-01T${shift.end_time}:00`)
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours < 0) hours += 24
    
    return Math.max(0, hours)
  }

  const getTotalHours = () => {
    return shifts.reduce((total, shift) => total + calculateHours(shift), 0)
  }

  const handleSave = async () => {
    console.log('🚀 handleSave started')
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    const startTime = Date.now()
    console.log('⏱️ Save operation started at:', new Date().toISOString())

    try {
      console.log('🔍 Validating shifts...')
      // Validate shifts before saving
      const validationErrors = shifts.map((shift, index) => {
        const errors: string[] = []
        
        if (!shift.start_time || !shift.end_time) {
          errors.push(`Turno ${index + 1}: Horarios requeridos`)
        }
        
        if (shift.start_time === shift.end_time) {
          errors.push(`Turno ${index + 1}: Hora inicio y fin no pueden ser iguales`)
        }
        
        return errors
      }).flat()
      
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors)
        throw new Error(validationErrors.join(', '))
      }
      console.log('✅ Validation passed')
      
      // Convert shifts to the format expected by the service
      console.log('🔄 Converting shifts to service format...')
      const shiftsToSave: WorkShiftInput[] = shifts.map(shift => ({
        day_of_week: shift.day_of_week,
        start_time: shift.start_time,
        end_time: shift.end_time,
        is_active: true,
        break_duration_minutes: 0
      }))
      console.log('📋 Shifts to save:', shiftsToSave)

      // Always save shifts - even if empty array (to delete all)
      console.log('💾 Calling ShiftManagementService.saveWorkShifts...')
      await ShiftManagementService.saveWorkShifts(userId, shiftsToSave)
      console.log('✅ ShiftManagementService.saveWorkShifts completed')
      
      setSuccess('✅ Turnos guardados correctamente')
      console.log('🎉 Success message set')
      onSave?.()
      console.log('📞 onSave callback called')
      
      // Reload to get the actual IDs from database
      console.log('🔄 Reloading shifts from database...')
      await loadShifts()
      console.log('✅ Shifts reloaded successfully')
      
    } catch (error: any) {
      console.error('❌ Error in handleSave:', error)
      // Handle different types of errors
      let errorMessage = 'Error al guardar los turnos'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      }
      
      console.error('❌ Final error message:', errorMessage)
      setError(errorMessage)
    } finally {
      const endTime = Date.now()
      const duration = endTime - startTime
      console.log('⏱️ Save operation completed in:', duration, 'ms')
      console.log('🔓 Setting saving to false...')
      setSaving(false)
      console.log('✅ handleSave completed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalHours = getTotalHours()

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
              Configura tus horarios de trabajo por día
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-blue-600">
              {ShiftManagementService.formatHours(totalHours)}
            </p>
            <p className="text-xs text-gray-500">
              {shifts.length} turno{shifts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {shifts.map((shift, index) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === shift.day_of_week)
            const hours = calculateHours(shift)
            
            return (
              <div 
                key={shift.id} 
                className={`p-4 rounded-lg border-2 transition-all ${
                  shift.isNew 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                } hover:shadow-md`}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Day Selector */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-600 mb-1">Día</label>
                    <select
                      value={shift.day_of_week}
                      onChange={(e) => updateShift(index, 'day_of_week', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Time */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Inicio</label>
                    <input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => updateShift(index, 'start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* End Time */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Fin</label>
                    <input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => updateShift(index, 'end_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 text-center">
                    <label className="block text-xs text-gray-600 mb-1">Duración</label>
                    <div className="text-sm font-semibold text-blue-600 py-2">
                      {ShiftManagementService.formatHours(hours)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => duplicateShift(index)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                      title="Duplicar +1 día"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      +1 día
                    </button>
                    <button
                      onClick={() => removeShift(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar turno"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add New Shift Button */}
          <button
            onClick={addNewShift}
            className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Agregar nuevo turno</span>
          </button>
        </div>

        {/* Summary */}
        {shifts.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Resumen</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Total turnos</p>
                <p className="font-semibold text-blue-900">{shifts.length}</p>
              </div>
              <div>
                <p className="text-blue-700">Horas totales</p>
                <p className="font-semibold text-blue-900">{ShiftManagementService.formatHours(totalHours)}</p>
              </div>
              <div>
                <p className="text-blue-700">Promedio por turno</p>
                <p className="font-semibold text-blue-900">
                  {shifts.length > 0 ? ShiftManagementService.formatHours(totalHours / shifts.length) : '0h 0m'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving || shifts.length === 0}
            size="lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}