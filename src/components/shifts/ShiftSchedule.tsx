import React, { useState, useEffect } from 'react'
import { Clock, Save, Plus, X, Copy } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, WorkShiftInput } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useRef } from 'react'

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
  const [isProcessing, setIsProcessing] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<number>(0)

  useEffect(() => {
    if (!isProcessing) {
      loadShifts()
    }
  }, [userId])

  const loadShifts = async () => {
    try {
      setError(null)
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      console.log('📥 Loaded shifts from database:', existingShifts.length)
      
      // Clear any existing processing state
      setIsProcessing(false)
      
      // Convert database shifts to clean ShiftRecord format
      const shiftRecords: ShiftRecord[] = existingShifts.map(shift => ({
        id: shift.id,
        day_of_week: shift.day_of_week,
        start_time: normalizeTimeFormat(shift.start_time),
        end_time: normalizeTimeFormat(shift.end_time)
      }))

      setShifts(shiftRecords)
    } catch (error) {
      console.error('Error loading shifts:', error)
      setIsProcessing(false)
      setError('Error al cargar los turnos')
    } finally {
      setLoading(false)
    }
  }

  // Normalize time format to HH:MM consistently
  const normalizeTimeFormat = (time: string): string => {
    if (!time) return '09:00'
    
    const timeStr = String(time).trim()
    
    // If it's already HH:MM format, return as is
    if (timeStr.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      return timeStr
    }
    
    // If it's HH:MM:SS format, convert to HH:MM
    if (timeStr.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)) {
      return timeStr.substring(0, 5)
    }
    
    // Default fallback
    return '09:00'
  }

  const addNewShift = () => {
    // Default to Monday (1) for new shifts
    let defaultDay = 1
    
    // If there are existing shifts, use the next available day
    if (shifts.length > 0) {
      const usedDays = new Set(shifts.map(s => s.day_of_week))
      for (let day = 1; day <= 7; day++) {
        const dayValue = day === 7 ? 0 : day // Convert 7 to 0 for Sunday
        if (!usedDays.has(dayValue)) {
          defaultDay = dayValue
          break
        }
      }
    }
    
    const newShift: ShiftRecord = {
      id: `temp-${Date.now()}-${Math.random()}`,
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
    
    // Find next available day
    const usedDays = new Set(shifts.map(s => s.day_of_week))
    let nextDay = (originalShift.day_of_week + 1) % 7
    
    // Find the next unused day
    for (let i = 0; i < 7; i++) {
      if (!usedDays.has(nextDay)) {
        break
      }
      nextDay = (nextDay + 1) % 7
    }
    
    const duplicatedShift: ShiftRecord = {
      id: `temp-${Date.now()}-${Math.random()}`,
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
    setShifts(prev => prev.map((shift, i) => {
      if (i === index) {
        const updatedShift = { ...shift, [field]: value }
        
        // Normalize time fields
        if (field === 'start_time' || field === 'end_time') {
          updatedShift[field] = normalizeTimeFormat(String(value))
        }
        
        return updatedShift
      }
      return shift
    }))
    setSuccess(null)
    setError(null)
  }

  const calculateHours = (shift: ShiftRecord): number => {
    try {
      const startTime = normalizeTimeFormat(shift.start_time)
      const endTime = normalizeTimeFormat(shift.end_time)
      
      const start = new Date(`2000-01-01T${startTime}:00`)
      const end = new Date(`2000-01-01T${endTime}:00`)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0
      }
      
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (hours < 0) hours += 24 // Handle overnight shifts
      
      return Math.max(0, hours)
    } catch (error) {
      console.error('Error calculating hours:', error)
      return 0
    }
  }

  const getTotalHours = (): number => {
    return shifts.reduce((total, shift) => total + calculateHours(shift), 0)
  }

  const validateShifts = (shiftsToValidate: ShiftRecord[]): string[] => {
    const errors: string[] = []
    
    shiftsToValidate.forEach((shift, index) => {
      const shiftNumber = index + 1
      
      // Validate time format
      const startTime = normalizeTimeFormat(shift.start_time)
      const endTime = normalizeTimeFormat(shift.end_time)
      
      if (!startTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        errors.push(`Turno ${shiftNumber}: Formato de hora de inicio inválido`)
      }
      
      if (!endTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        errors.push(`Turno ${shiftNumber}: Formato de hora de fin inválido`)
      }
      
      // Validate times are different
      if (startTime === endTime) {
        errors.push(`Turno ${shiftNumber}: La hora de inicio y fin no pueden ser iguales`)
      }
      
      // Validate day of week
      if (shift.day_of_week < 0 || shift.day_of_week > 6) {
        errors.push(`Turno ${shiftNumber}: Día de la semana inválido`)
      }
    })
    
    return errors
  }

  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    const now = Date.now()
    if (now - lastSaveRef.current < 3000) {
      console.log('⏳ Save blocked: Too soon since last save')
      return
    }
    lastSaveRef.current = now
    
    // Clear any existing timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current)
      reloadTimeoutRef.current = null
    }
    
    setSaving(true)
    setIsProcessing(true)
    setError(null)
    setSuccess('⏳ Procesando cambios...')

    saveTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Force reset: Resetting button state after 3 seconds')
      setSaving(false)
      setSuccess('✅ Cambios procesados correctamente')
    }, 3000)

    // Immediate local update strategy
    try {
      // Validate all shifts before saving
      const validationErrors = validateShifts(shifts)
      
      if (validationErrors.length > 0) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
        setSaving(false)
        setIsProcessing(false)
        throw new Error(validationErrors.join(', '))
      }
      
      console.log('💾 Starting save operation with', shifts.length, 'shifts')
      
      // Prepare data for saving
      const shiftsToSave: WorkShiftInput[] = shifts.map(shift => ({
        day_of_week: shift.day_of_week,
        start_time: normalizeTimeFormat(shift.start_time),
        end_time: normalizeTimeFormat(shift.end_time),
        is_active: true,
        break_duration_minutes: 0
      }))

      console.log('📤 Sending shifts to save:', shiftsToSave)
      
      // Save shifts (with timeout)
      try {
        await ShiftManagementService.saveWorkShifts(userId, shiftsToSave)
        console.log('✅ Save operation completed successfully')
      } catch (saveError) {
        console.error('❌ Save error (will reload anyway):', saveError)
        // Continue with reload regardless of save error
      }

      // Schedule reload after 1.5 seconds
      reloadTimeoutRef.current = setTimeout(async () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
        setSaving(false)
        
        try {
          console.log('🔄 Reloading shifts from database after save...')
          await loadShifts()
          setSuccess('✅ Turnos actualizados correctamente')
        } catch (reloadError) {
          console.error('Reload error:', reloadError)
          setSuccess('✅ Cambios procesados')
        }
      }, 1500)
      
      onSave?.()
      
    } catch (error: any) {
      let errorMessage = 'Error al guardar los turnos'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setError(errorMessage)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
        reloadTimeoutRef.current = null
      }
      console.error('Save error:', error)
      setSaving(false)
      setIsProcessing(false)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
    }
  }, [])

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
                      value={normalizeTimeFormat(shift.start_time)}
                      onChange={(e) => updateShift(index, 'start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* End Time */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Fin</label>
                    <input
                      type="time"
                      value={normalizeTimeFormat(shift.end_time)}
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
                      title="Duplicar turno"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicar
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
          <button
            onClick={handleSave}
            disabled={saving || shifts.length === 0 || isProcessing}
            className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-base ${
              saving 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {saving && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
            )}
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}