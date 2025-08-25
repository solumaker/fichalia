import React, { useState, useEffect } from 'react'
import { Save, X, Clock, Copy, Trash2, Edit3, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
}

interface DayPattern {
  dayIndex: number
  dayName: string
  isActive: boolean
  timeSlots: TimeSlot[]
}

interface ShiftPattern {
  id: string
  name: string
  description: string
  totalWeeklyHours: number
  days: DayPattern[]
  createdAt: string
}

interface PatternModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (pattern: Omit<ShiftPattern, 'id' | 'createdAt'>) => void
  editingPattern?: ShiftPattern | null
  currentWeekData?: any[] // Para crear patrón desde semana actual
}

const DAYS_OF_WEEK = [
  { index: 1, name: 'Lunes', short: 'L' },
  { index: 2, name: 'Martes', short: 'M' },
  { index: 3, name: 'Miércoles', short: 'X' },
  { index: 4, name: 'Jueves', short: 'J' },
  { index: 5, name: 'Viernes', short: 'V' },
  { index: 6, name: 'Sábado', short: 'S' },
  { index: 0, name: 'Domingo', short: 'D' }
]

export function PatternModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingPattern, 
  currentWeekData 
}: PatternModalProps) {
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')
  const [days, setDays] = useState<DayPattern[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule'>('basic')

  useEffect(() => {
    if (isOpen) {
      if (editingPattern) {
        // Editing existing pattern
        setPatternName(editingPattern.name)
        setPatternDescription(editingPattern.description)
        setDays(editingPattern.days)
        setActiveTab('basic')
      } else if (currentWeekData) {
        // Creating pattern from current week
        setPatternName('')
        setPatternDescription('Patrón creado desde semana actual')
        setDays(createDaysFromWeekData(currentWeekData))
        setActiveTab('basic')
      } else {
        // Creating new empty pattern
        setPatternName('')
        setPatternDescription('')
        setDays(createEmptyDays())
        setActiveTab('basic')
      }
      setErrors({})
    }
  }, [isOpen, editingPattern, currentWeekData])

  const createEmptyDays = (): DayPattern[] => {
    return DAYS_OF_WEEK.map(day => ({
      dayIndex: day.index,
      dayName: day.name,
      isActive: false,
      timeSlots: []
    }))
  }

  const createDaysFromWeekData = (weekData: any[]): DayPattern[] => {
    // Convert current week shifts to pattern format
    return DAYS_OF_WEEK.map(day => {
      const dayShift = weekData?.find(shift => {
        // Match day logic here based on your week data structure
        return false // Placeholder
      })
      
      return {
        dayIndex: day.index,
        dayName: day.name,
        isActive: dayShift ? dayShift.isActive : false,
        timeSlots: dayShift ? dayShift.timeSlots : []
      }
    })
  }

  const calculateTotalHours = (): number => {
    return days.reduce((total, day) => {
      if (!day.isActive) return total
      
      const dayHours = day.timeSlots.reduce((dayTotal, slot) => {
        const start = new Date(`2000-01-01T${slot.startTime}:00`)
        const end = new Date(`2000-01-01T${slot.endTime}:00`)
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        if (hours < 0) hours += 24
        return dayTotal + hours
      }, 0)
      
      return total + dayHours
    }, 0)
  }

  const validatePattern = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!patternName.trim()) {
      newErrors.name = 'El nombre del patrón es requerido'
    }

    if (patternName.length > 50) {
      newErrors.name = 'El nombre no puede exceder 50 caracteres'
    }

    // Validate time slots
    days.forEach((day, dayIndex) => {
      if (day.isActive) {
        day.timeSlots.forEach((slot, slotIndex) => {
          const start = new Date(`2000-01-01T${slot.startTime}:00`)
          const end = new Date(`2000-01-01T${slot.endTime}:00`)
          
          if (start >= end) {
            newErrors[`day_${dayIndex}_slot_${slotIndex}`] = 'La hora de inicio debe ser menor que la hora de fin'
          }

          // Check for overlaps within the same day
          day.timeSlots.forEach((otherSlot, otherIndex) => {
            if (slotIndex !== otherIndex) {
              const otherStart = new Date(`2000-01-01T${otherSlot.startTime}:00`)
              const otherEnd = new Date(`2000-01-01T${otherSlot.endTime}:00`)
              
              if ((start < otherEnd && end > otherStart)) {
                newErrors[`day_${dayIndex}_overlap`] = 'Las franjas horarias no pueden solaparse'
              }
            }
          })
        })

        if (day.timeSlots.length === 0) {
          newErrors[`day_${dayIndex}_empty`] = 'Los días activos deben tener al menos una franja horaria'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validatePattern()) return

    const pattern: Omit<ShiftPattern, 'id' | 'createdAt'> = {
      name: patternName.trim(),
      description: patternDescription.trim(),
      totalWeeklyHours: calculateTotalHours(),
      days: days
    }

    onSave(pattern)
    onClose()
  }

  const toggleDay = (dayIndex: number) => {
    setDays(prev => prev.map(day => 
      day.dayIndex === dayIndex 
        ? { ...day, isActive: !day.isActive, timeSlots: !day.isActive ? [] : day.timeSlots }
        : day
    ))
  }

  const addTimeSlot = (dayIndex: number) => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00'
    }

    setDays(prev => prev.map(day => 
      day.dayIndex === dayIndex 
        ? { ...day, timeSlots: [...day.timeSlots, newSlot] }
        : day
    ))
  }

  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setDays(prev => prev.map(day => 
      day.dayIndex === dayIndex 
        ? {
            ...day, 
            timeSlots: day.timeSlots.map(slot => 
              slot.id === slotId ? { ...slot, [field]: value } : slot
            )
          }
        : day
    ))
  }

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    setDays(prev => prev.map(day => 
      day.dayIndex === dayIndex 
        ? { ...day, timeSlots: day.timeSlots.filter(slot => slot.id !== slotId) }
        : day
    ))
  }

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  if (!isOpen) return null

  const totalHours = calculateTotalHours()
  const activeDays = days.filter(day => day.isActive).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPattern ? 'Editar Patrón' : 'Crear Nuevo Patrón'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {currentWeekData ? 'Basado en la semana actual' : 'Define un patrón de turnos reutilizable'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Información Básica
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Horarios por Día
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Pattern Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Patrón *
                </label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Horario Oficina, Turno Mañana, etc."
                  maxLength={50}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Pattern Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={patternDescription}
                  onChange={(e) => setPatternDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe cuándo usar este patrón..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Pattern Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Resumen del Patrón</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Días laborables</p>
                    <p className="font-semibold text-blue-900">{activeDays}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Horas semanales</p>
                    <p className="font-semibold text-blue-900">{formatHours(totalHours)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Promedio diario</p>
                    <p className="font-semibold text-blue-900">
                      {activeDays > 0 ? formatHours(totalHours / activeDays) : '0h 0m'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">Configuración Semanal</h4>
                <p className="text-xs text-gray-500">
                  Activa los días laborables y define sus horarios
                </p>
              </div>

              {days.map((day) => (
                <div key={day.dayIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleDay(day.dayIndex)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          day.isActive
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {day.isActive && <span className="text-xs">✓</span>}
                      </button>
                      <span className="font-medium text-gray-900">{day.dayName}</span>
                    </div>
                    {day.isActive && (
                      <button
                        onClick={() => addTimeSlot(day.dayIndex)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Agregar Franja
                      </button>
                    )}
                  </div>

                  {day.isActive && (
                    <div className="space-y-2 ml-9">
                      {day.timeSlots.map((slot, slotIndex) => (
                        <div key={slot.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(day.dayIndex, slot.id, 'startTime', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(day.dayIndex, slot.id, 'endTime', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-600 ml-2">
                              ({formatHours((() => {
                                const start = new Date(`2000-01-01T${slot.startTime}:00`)
                                const end = new Date(`2000-01-01T${slot.endTime}:00`)
                                let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                if (hours < 0) hours += 24
                                return hours
                              })())})
                            </span>
                          </div>
                          <button
                            onClick={() => removeTimeSlot(day.dayIndex, slot.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {errors[`day_${day.dayIndex}_empty`] && (
                        <p className="text-sm text-red-600">{errors[`day_${day.dayIndex}_empty`]}</p>
                      )}
                      {errors[`day_${day.dayIndex}_overlap`] && (
                        <p className="text-sm text-red-600">{errors[`day_${day.dayIndex}_overlap`]}</p>
                      )}

                      {day.timeSlots.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          Agrega al menos una franja horaria para este día
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeDays > 0 && (
              <span>
                {activeDays} día{activeDays !== 1 ? 's' : ''} • {formatHours(totalHours)} semanales
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!patternName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {editingPattern ? 'Actualizar Patrón' : 'Crear Patrón'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}