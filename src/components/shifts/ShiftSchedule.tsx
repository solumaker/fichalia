import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Save, Plus, X, ChevronDown, ChevronUp, Check, AlertCircle, Loader2, Minus } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { WorkShift, ShiftValidationError } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  isNew?: boolean
}

interface DaySchedule {
  day_of_week: number
  slots: TimeSlot[]
  expanded: boolean
}

interface ShiftScheduleProps {
  userId: string
  onSave?: () => void
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 0, label: 'Domingo', short: 'D' }
]

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

export function ShiftSchedule({ userId, onSave }: ShiftScheduleProps) {
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [errors, setErrors] = useState<{ [key: string]: ShiftValidationError }>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [userId])

  const loadSchedules = async () => {
    try {
      const existingShifts = await ShiftManagementService.getWorkShifts(userId)
      
      // Group shifts by day
      const scheduleMap = new Map<number, TimeSlot[]>()
      
      existingShifts.forEach(shift => {
        if (!scheduleMap.has(shift.day_of_week)) {
          scheduleMap.set(shift.day_of_week, [])
        }
        scheduleMap.get(shift.day_of_week)!.push({
          id: shift.id,
          start_time: shift.start_time,
          end_time: shift.end_time
        })
      })

      // Create day schedules
      const schedules: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
        day_of_week: day.value,
        slots: scheduleMap.get(day.value) || [],
        expanded: (scheduleMap.get(day.value) || []).length > 0
      }))

      setDaySchedules(schedules)
    } catch (error) {
      console.error('Error loading schedules:', error)
      setSyncStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const debouncedSave = useCallback(async (schedules: DaySchedule[]) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    const timeout = setTimeout(async () => {
      setSyncStatus('saving')
      
      try {
        // Convert schedules to shifts format
        const shiftsToSave = schedules.flatMap(schedule => 
          schedule.slots.map(slot => ({
            day_of_week: schedule.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_active: true,
            break_duration_minutes: 0
          }))
        )

        await ShiftManagementService.saveWorkShifts(userId, shiftsToSave)
        setSyncStatus('saved')
        onSave?.()
        
        // Auto-hide success status after 2 seconds
        setTimeout(() => {
          setSyncStatus('idle')
        }, 2000)
        
      } catch (error) {
        console.error('Error saving shifts:', error)
        setSyncStatus('error')
        setTimeout(() => {
          setSyncStatus('idle')
        }, 3000)
      }
    }, 1500) // 1.5 second debounce

    setSaveTimeout(timeout)
  }, [userId, onSave, saveTimeout])

  const updateSchedules = (newSchedules: DaySchedule[]) => {
    setDaySchedules(newSchedules)
    debouncedSave(newSchedules)
  }

  const addTimeSlot = (dayOfWeek: number) => {
    const newSchedules = daySchedules.map(schedule => {
      if (schedule.day_of_week === dayOfWeek) {
        const newSlot: TimeSlot = {
          id: `temp-${Date.now()}`,
          start_time: '09:00',
          end_time: '17:00',
          isNew: true
        }
        return {
          ...schedule,
          slots: [...schedule.slots, newSlot],
          expanded: true
        }
      }
      return schedule
    })
    
    updateSchedules(newSchedules)
  }

  const removeTimeSlot = (dayOfWeek: number, slotId: string) => {
    const newSchedules = daySchedules.map(schedule => {
      if (schedule.day_of_week === dayOfWeek) {
        return {
          ...schedule,
          slots: schedule.slots.filter(slot => slot.id !== slotId)
        }
      }
      return schedule
    })
    
    updateSchedules(newSchedules)
  }

  const updateTimeSlot = (dayOfWeek: number, slotId: string, field: keyof TimeSlot, value: string) => {
    const newSchedules = daySchedules.map(schedule => {
      if (schedule.day_of_week === dayOfWeek) {
        return {
          ...schedule,
          slots: schedule.slots.map(slot => 
            slot.id === slotId 
              ? { ...slot, [field]: value, isNew: false }
              : slot
          )
        }
      }
      return schedule
    })
    
    updateSchedules(newSchedules)
  }

  const adjustTime = (dayOfWeek: number, slotId: string, field: 'start_time' | 'end_time', increment: number) => {
    const schedule = daySchedules.find(s => s.day_of_week === dayOfWeek)
    const slot = schedule?.slots.find(s => s.id === slotId)
    if (!slot) return

    const currentTime = slot[field]
    const [hours, minutes] = currentTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + increment
    
    // Ensure time stays within 24-hour format
    const newTotalMinutes = Math.max(0, Math.min(1439, totalMinutes)) // 0 to 23:59
    const newHours = Math.floor(newTotalMinutes / 60)
    const newMinutes = newTotalMinutes % 60
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    updateTimeSlot(dayOfWeek, slotId, field, newTime)
  }

  const toggleDayExpansion = (dayOfWeek: number) => {
    setDaySchedules(schedules => 
      schedules.map(schedule => 
        schedule.day_of_week === dayOfWeek 
          ? { ...schedule, expanded: !schedule.expanded }
          : schedule
      )
    )
  }

  const calculateSlotHours = (slot: TimeSlot) => {
    const start = new Date(`2000-01-01T${slot.start_time}:00`)
    const end = new Date(`2000-01-01T${slot.end_time}:00`)
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours < 0) hours += 24
    
    return Math.max(0, hours)
  }

  const calculateTotalHours = () => {
    return daySchedules.reduce((total, schedule) => {
      return total + schedule.slots.reduce((dayTotal, slot) => {
        return dayTotal + calculateSlotHours(slot)
      }, 0)
    }, 0)
  }

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'saved':
        return <Check className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'saving':
        return 'Guardando...'
      case 'saved':
        return 'Guardado'
      case 'error':
        return 'Error al guardar'
      default:
        return ''
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
  const totalSlots = daySchedules.reduce((total, schedule) => total + schedule.slots.length, 0)
  const activeDays = daySchedules.filter(schedule => schedule.slots.length > 0).length

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
            <div className="flex items-center space-x-2 mb-1">
              {getSyncStatusIcon()}
              <span className="text-sm text-gray-600">{getSyncStatusText()}</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {ShiftManagementService.formatHours(totalHours)}
            </p>
            <p className="text-xs text-gray-500">
              {totalSlots} franja{totalSlots !== 1 ? 's' : ''} • {activeDays} día{activeDays !== 1 ? 's' : ''}
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

        <div className="space-y-3">
          {daySchedules.map((schedule) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)!
            const dayHours = schedule.slots.reduce((total, slot) => total + calculateSlotHours(slot), 0)
            
            return (
              <div key={schedule.day_of_week} className="border border-gray-200 rounded-lg">
                {/* Day Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleDayExpansion(schedule.day_of_week)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {schedule.expanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">{dayInfo.label}</span>
                    </div>
                    {schedule.slots.length > 0 && (
                      <span className="text-sm text-gray-500">
                        {schedule.slots.length} franja{schedule.slots.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {dayHours > 0 && (
                      <span className="text-sm font-medium text-blue-600">
                        {ShiftManagementService.formatHours(dayHours)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addTimeSlot(schedule.day_of_week)
                      }}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="Agregar franja"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Time Slots */}
                {schedule.expanded && (
                  <div className="border-t border-gray-200 p-4 space-y-3">
                    {schedule.slots.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay franjas configuradas</p>
                        <button
                          onClick={() => addTimeSlot(schedule.day_of_week)}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Agregar primera franja
                        </button>
                      </div>
                    ) : (
                      schedule.slots.map((slot, index) => (
                        <div key={slot.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          slot.isNew ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}>
                          {/* Slot Number */}
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>

                          {/* Start Time */}
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Inicio</label>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => adjustTime(schedule.day_of_week, slot.id, 'start_time', -15)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                                title="Restar 15 min"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) => updateTimeSlot(schedule.day_of_week, slot.id, 'start_time', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => adjustTime(schedule.day_of_week, slot.id, 'start_time', 15)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                                title="Sumar 15 min"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* End Time */}
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Fin</label>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => adjustTime(schedule.day_of_week, slot.id, 'end_time', -15)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                                title="Restar 15 min"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) => updateTimeSlot(schedule.day_of_week, slot.id, 'end_time', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => adjustTime(schedule.day_of_week, slot.id, 'end_time', 15)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                                title="Sumar 15 min"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Duration */}
                          <div className="text-center min-w-[60px]">
                            <label className="block text-xs text-gray-600 mb-1">Duración</label>
                            <div className="text-sm font-medium text-blue-600">
                              {ShiftManagementService.formatHours(calculateSlotHours(slot))}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeTimeSlot(schedule.day_of_week, slot.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar franja"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {totalSlots > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Resumen Semanal</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Días activos</p>
                <p className="font-semibold text-blue-900">{activeDays}/7</p>
              </div>
              <div>
                <p className="text-blue-700">Total franjas</p>
                <p className="font-semibold text-blue-900">{totalSlots}</p>
              </div>
              <div>
                <p className="text-blue-700">Horas totales</p>
                <p className="font-semibold text-blue-900">{ShiftManagementService.formatHours(totalHours)}</p>
              </div>
              <div>
                <p className="text-blue-700">Promedio diario</p>
                <p className="font-semibold text-blue-900">
                  {activeDays > 0 ? ShiftManagementService.formatHours(totalHours / activeDays) : '0h 0m'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-save Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
            {getSyncStatusIcon()}
            <span>Los cambios se guardan automáticamente</span>
          </p>
        </div>
      </div>
    </div>
  )
}