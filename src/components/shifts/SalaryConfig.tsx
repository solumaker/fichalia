import React, { useState, useEffect } from 'react'
import { DollarSign, Save, Calculator } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { SalaryConfig, SalaryConfigInput, SalaryValidationError } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface SalaryConfigProps {
  userId: string
  onSave?: () => void
}

export function SalaryConfigComponent({ userId, onSave }: SalaryConfigProps) {
  const [config, setConfig] = useState<SalaryConfigInput>({
    gross_salary: 0,
    salary_type: 'monthly',
    overtime_multiplier: 1.5,
    currency: 'EUR',
    effective_from: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<SalaryValidationError>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [weeklyHours, setWeeklyHours] = useState(40)

  useEffect(() => {
    loadSalaryConfig()
    loadWeeklyHours()
  }, [userId])

  const loadSalaryConfig = async () => {
    try {
      const existingConfig = await ShiftManagementService.getSalaryConfig(userId)
      if (existingConfig) {
        setConfig({
          gross_salary: existingConfig.gross_salary,
          salary_type: existingConfig.salary_type,
          overtime_multiplier: existingConfig.overtime_multiplier,
          currency: existingConfig.currency,
          effective_from: existingConfig.effective_from
        })
      }
    } catch (error) {
      console.error('Error loading salary config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklyHours = async () => {
    try {
      const shifts = await ShiftManagementService.getWorkShifts(userId)
      const totalHours = shifts.reduce((total, shift) => {
        if (!shift.is_active) return total

        const start = new Date(`2000-01-01T${shift.start_time}:00`)
        const end = new Date(`2000-01-01T${shift.end_time}:00`)
        
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        if (hours < 0) hours += 24
        
        hours -= shift.break_duration_minutes / 60
        return total + Math.max(0, hours)
      }, 0)
      
      setWeeklyHours(totalHours || 40)
    } catch (error) {
      console.error('Error loading weekly hours:', error)
    }
  }

  const validateConfig = (config: SalaryConfigInput): SalaryValidationError => {
    const errors: SalaryValidationError = {}

    if (!config.gross_salary || config.gross_salary <= 0) {
      errors.gross_salary = 'El salario debe ser mayor a 0'
    }

    if (config.gross_salary > 1000000) {
      errors.gross_salary = 'El salario parece demasiado alto'
    }

    if (!config.salary_type) {
      errors.salary_type = 'Tipo de salario requerido'
    }

    if (!config.overtime_multiplier || config.overtime_multiplier < 1 || config.overtime_multiplier > 3) {
      errors.overtime_multiplier = 'Multiplicador debe estar entre 1.0 y 3.0'
    }

    if (!config.effective_from) {
      errors.effective_from = 'Fecha de vigencia requerida'
    }

    return errors
  }

  const updateConfig = (field: keyof SalaryConfigInput, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)

    const validationErrors = validateConfig(config)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSaving(false)
      return
    }

    try {
      await ShiftManagementService.saveSalaryConfig(userId, config)
      setSuccess('Configuración salarial guardada correctamente')
      onSave?.()
    } catch (error) {
      console.error('Error saving salary config:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateHourlyRate = () => {
    if (!config.gross_salary || weeklyHours === 0) return 0

    const monthlySalary = config.salary_type === 'monthly' 
      ? config.gross_salary 
      : config.gross_salary / 12

    const monthlyHours = weeklyHours * 4.33
    return monthlySalary / monthlyHours
  }

  const calculateOvertimeRate = () => {
    return calculateHourlyRate() * config.overtime_multiplier
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const hourlyRate = calculateHourlyRate()
  const overtimeRate = calculateOvertimeRate()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Configuración Salarial
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Define tu salario y parámetros para el cálculo de horas extra
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Tarifa por hora</p>
            <p className="text-lg font-semibold text-green-600">
              {ShiftManagementService.formatCurrency(hourlyRate, config.currency)}
            </p>
            <p className="text-xs text-gray-500">
              Extra: {ShiftManagementService.formatCurrency(overtimeRate, config.currency)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salario Bruto
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.gross_salary}
                onChange={(e) => updateConfig('gross_salary', parseFloat(e.target.value) || 0)}
                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.gross_salary ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {config.currency === 'EUR' ? '€' : '$'}
              </span>
            </div>
            {errors.gross_salary && (
              <p className="text-sm text-red-600 mt-1">{errors.gross_salary}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Salario
            </label>
            <select
              value={config.salary_type}
              onChange={(e) => updateConfig('salary_type', e.target.value as 'monthly' | 'annual')}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.salary_type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
            {errors.salary_type && (
              <p className="text-sm text-red-600 mt-1">{errors.salary_type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multiplicador Horas Extra
            </label>
            <input
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={config.overtime_multiplier}
              onChange={(e) => updateConfig('overtime_multiplier', parseFloat(e.target.value) || 1.5)}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.overtime_multiplier ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.overtime_multiplier && (
              <p className="text-sm text-red-600 mt-1">{errors.overtime_multiplier}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: 1.5 = 150% del salario normal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moneda
            </label>
            <select
              value={config.currency}
              onChange={(e) => updateConfig('currency', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dólar ($)</option>
              <option value="GBP">Libra (£)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Vigencia
            </label>
            <input
              type="date"
              value={config.effective_from}
              onChange={(e) => updateConfig('effective_from', e.target.value)}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.effective_from ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.effective_from && (
              <p className="text-sm text-red-600 mt-1">{errors.effective_from}</p>
            )}
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Resumen de Cálculos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Horas semanales</p>
              <p className="font-semibold">{ShiftManagementService.formatHours(weeklyHours)}</p>
            </div>
            <div>
              <p className="text-gray-600">Horas mensuales</p>
              <p className="font-semibold">{ShiftManagementService.formatHours(weeklyHours * 4.33)}</p>
            </div>
            <div>
              <p className="text-gray-600">Tarifa normal</p>
              <p className="font-semibold text-green-600">
                {ShiftManagementService.formatCurrency(hourlyRate, config.currency)}/h
              </p>
            </div>
            <div>
              <p className="text-gray-600">Tarifa extra</p>
              <p className="font-semibold text-orange-600">
                {ShiftManagementService.formatCurrency(overtimeRate, config.currency)}/h
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  )
}