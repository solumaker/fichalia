import React, { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, RefreshCw, TrendingUp } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { OvertimeCalculation } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface OvertimeReportProps {
  userId: string
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function OvertimeReport({ userId }: OvertimeReportProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [currentCalculation, setCurrentCalculation] = useState<OvertimeCalculation | null>(null)
  const [history, setHistory] = useState<OvertimeCalculation[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadData()
  }, [userId, selectedYear, selectedMonth])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load current month calculation
      const calculation = await ShiftManagementService.getOvertimeCalculation(
        userId, 
        selectedYear, 
        selectedMonth
      )
      setCurrentCalculation(calculation)

      // Load history
      const historyData = await ShiftManagementService.getOvertimeHistory(userId, 12)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading overtime data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    setCalculating(true)
    try {
      await ShiftManagementService.calculateMonthlyOvertime(userId, selectedYear, selectedMonth)
      await loadData()
    } catch (error) {
      console.error('Error calculating overtime:', error)
    } finally {
      setCalculating(false)
    }
  }

  const exportToCSV = () => {
    if (!history.length) return

    const headers = [
      'Año', 'Mes', 'Horas Programadas', 'Horas Trabajadas', 
      'Horas Regulares', 'Horas Extra', 'Pago Regular', 'Pago Extra', 'Total'
    ]
    
    const rows = history.map(calc => [
      calc.year,
      MONTHS[calc.month - 1],
      calc.scheduled_hours.toFixed(2),
      calc.worked_hours.toFixed(2),
      calc.regular_hours.toFixed(2),
      calc.overtime_hours.toFixed(2),
      calc.regular_pay.toFixed(2),
      calc.overtime_pay.toFixed(2),
      calc.total_pay.toFixed(2)
    ])

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_horas_extra_${selectedYear}.csv`
    link.click()
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalOvertimeThisYear = history
    .filter(calc => calc.year === selectedYear)
    .reduce((sum, calc) => sum + calc.overtime_hours, 0)

  const totalEarningsThisYear = history
    .filter(calc => calc.year === selectedYear)
    .reduce((sum, calc) => sum + calc.total_pay, 0)

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Reporte de Horas Extra
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Análisis detallado de horas trabajadas y pagos
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button
                onClick={handleRecalculate}
                loading={calculating}
                variant="secondary"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalcular
              </Button>
            </div>
          </div>
        </div>

        {/* Current Month Summary */}
        <div className="p-6">
          {currentCalculation ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Programadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {ShiftManagementService.formatHours(currentCalculation.scheduled_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Trabajadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {ShiftManagementService.formatHours(currentCalculation.worked_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Extra</p>
                <p className="text-2xl font-bold text-orange-600">
                  {ShiftManagementService.formatHours(currentCalculation.overtime_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Pago Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {ShiftManagementService.formatCurrency(currentCalculation.total_pay)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No hay datos para {MONTHS[selectedMonth - 1]} {selectedYear}</p>
              <Button onClick={handleRecalculate} loading={calculating}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Calcular Mes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Historial Mensual</h3>
            <Button onClick={exportToCSV} variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Programadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Trabajadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Ordinarias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Extra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago H. Ordinarias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago H. Extra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((calc) => (
                <tr key={`${calc.year}-${calc.month}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {MONTHS[calc.month - 1]} {calc.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ShiftManagementService.formatHours(calc.scheduled_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ShiftManagementService.formatHours(calc.worked_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {ShiftManagementService.formatHours(calc.regular_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {ShiftManagementService.formatHours(calc.overtime_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.regular_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.overtime_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.total_pay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay historial disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

      calc.regular_hours.toFixed(2),
      calc.overtime_hours.toFixed(2),
      calc.regular_pay.toFixed(2),
      calc.overtime_pay.toFixed(2),
      calc.total_pay.toFixed(2)
    ])

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_horas_extra_${selectedYear}.csv`
    link.click()
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalOvertimeThisYear = history
    .filter(calc => calc.year === selectedYear)
    .reduce((sum, calc) => sum + calc.overtime_hours, 0)

  const totalEarningsThisYear = history
    .filter(calc => calc.year === selectedYear)
    .reduce((sum, calc) => sum + calc.total_pay, 0)

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Reporte de Horas Extra
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Análisis detallado de horas trabajadas y pagos
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button
                onClick={handleRecalculate}
                loading={calculating}
                variant="secondary"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalcular
              </Button>
            </div>
          </div>
        </div>

        {/* Current Month Summary */}
        <div className="p-6">
          {currentCalculation ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Programadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {ShiftManagementService.formatHours(currentCalculation.scheduled_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Trabajadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {ShiftManagementService.formatHours(currentCalculation.worked_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Horas Extra</p>
                <p className="text-2xl font-bold text-orange-600">
                  {ShiftManagementService.formatHours(currentCalculation.overtime_hours)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Pago Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {ShiftManagementService.formatCurrency(currentCalculation.total_pay)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No hay datos para {MONTHS[selectedMonth - 1]} {selectedYear}</p>
              <Button onClick={handleRecalculate} loading={calculating}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Calcular Mes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Historial Mensual</h3>
            <Button onClick={exportToCSV} variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Programadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Trabajadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Ordinarias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  H. Extra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago H. Ordinarias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago H. Extra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((calc) => (
                <tr key={`${calc.year}-${calc.month}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {MONTHS[calc.month - 1]} {calc.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ShiftManagementService.formatHours(calc.scheduled_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ShiftManagementService.formatHours(calc.worked_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {ShiftManagementService.formatHours(calc.regular_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {ShiftManagementService.formatHours(calc.overtime_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.regular_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.overtime_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {ShiftManagementService.formatCurrency(calc.total_pay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay historial disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}