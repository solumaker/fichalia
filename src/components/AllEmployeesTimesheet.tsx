import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Calendar, Filter, Users, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { supabase, Profile, TimeEntry } from '../lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Header } from './layout/Header'

interface AllEmployeesTimesheetProps {
  onBack: () => void
}

export function AllEmployeesTimesheet({ onBack }: AllEmployeesTimesheetProps) {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Last 7 days
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    loadTimeEntries()
  }, [dateRange, employees])

  const loadEmployees = async () => {
    try {
      // Use Edge Function to get all users (bypasses RLS)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
      }

      const accessToken = session.access_token

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar usuarios')
      }

      // Get all employees (active and inactive) - we'll filter by time entries later
      const allUsers = (result || [])
        .filter((user: Profile) => user.role === 'employee' || user.role === 'admin')
        .sort((a: Profile, b: Profile) => a.full_name.localeCompare(b.full_name))
        
      setEmployees(allUsers)
    } catch (err) {
      console.error('Error loading employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTimeEntries = async () => {
    if (employees.length === 0) return

    try {
      // Use Edge Function to get time entries (bypasses RLS)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
      }

      const accessToken = session.access_token

      const params = new URLSearchParams({
        selectedUser: 'all',
        startDate: dateRange.start,
        endDate: dateRange.end
      })

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-time-entries?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar fichajes')
      }

      // Get all time entries for employees in the date range
      const userIds = employees.map(e => e.id)
      const allEntries = (result.timeEntries || [])
        .map((entry: any) => ({
          id: entry.id,
          user_id: entry.user_id,
          entry_type: entry.entry_type,
          timestamp: entry.timestamp,
          latitude: entry.latitude,
          longitude: entry.longitude,
          address: entry.address,
          created_at: entry.created_at
        }))
      
      setTimeEntries(allEntries)
    } catch (err) {
      console.error('Error loading time entries:', err)
    }
  }

  const setPresetDateRange = (preset: 'today' | 'week' | 'month') => {
    const today = new Date()
    
    switch (preset) {
      case 'today':
        setDateRange({
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        })
        break
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
        setDateRange({
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd')
        })
        break
      case 'month':
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)
        setDateRange({
          start: format(monthStart, 'yyyy-MM-dd'),
          end: format(monthEnd, 'yyyy-MM-dd')
        })
        break
    }
  }

  const exportToCSV = () => {
    const headers = ['Usuario', 'Email', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Duración', 'Ubicación Entrada', 'Ubicación Salida']
    const rows: string[][] = []

    const groupedData = employees.map(employee => {
      const employeeEntries = timeEntries.filter(e => e.user_id === employee.id)
      
      // Group by date
      const groupedByDate = employeeEntries.reduce((acc, entry) => {
        const date = format(new Date(entry.timestamp), 'yyyy-MM-dd')
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(entry)
        return acc
      }, {} as Record<string, TimeEntry[]>)

      // Create pairs for each date
      return Object.entries(groupedByDate).flatMap(([date, dayEntries]) => {
        const sorted = dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const pairs = []
        
        for (let i = 0; i < sorted.length; i++) {
          const entry = sorted[i]
          if (entry.entry_type === 'check_in') {
            const checkOut = sorted.find((e, idx) => idx > i && e.entry_type === 'check_out')
            pairs.push({
              employee,
              date,
              checkIn: entry,
              checkOut: checkOut || null,
              duration: checkOut ? 
                Math.round((new Date(checkOut.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60)) : 
                null
            })
          }
        }
        
        return pairs
      })
    }).flat()

    groupedData.forEach(pair => {
      const formatDuration = (minutes: number | null) => {
        if (!minutes) return 'En curso'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
      }

      rows.push([
        pair.employee.full_name,
        pair.employee.email,
        format(new Date(pair.checkIn.timestamp), 'dd/MM/yyyy', { locale: es }),
        format(new Date(pair.checkIn.timestamp), 'HH:mm', { locale: es }),
        pair.checkOut ? format(new Date(pair.checkOut.timestamp), 'HH:mm', { locale: es }) : 'Pendiente',
        formatDuration(pair.duration),
        pair.checkIn.address || `${pair.checkIn.latitude?.toFixed(4)}, ${pair.checkIn.longitude?.toFixed(4)}` || 'N/A',
        pair.checkOut ? (pair.checkOut.address || `${pair.checkOut.latitude?.toFixed(4)}, ${pair.checkOut.longitude?.toFixed(4)}` || 'N/A') : 'N/A'
      ])
    })

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `fichajes_todos_empleados_${dateRange.start}_${dateRange.end}.csv`
    link.click()
  }

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees)
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId)
    } else {
      newExpanded.add(employeeId)
    }
    setExpandedEmployees(newExpanded)
  }

  // Group entries by employee and then by date
  const employeeData = employees.filter(employee => {
    // Only include employees that have time entries in the selected date range
    const hasEntriesInRange = timeEntries.some(entry => entry.user_id === employee.id)
    
    // Also apply search filter
    const matchesSearch = !searchTerm || employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return hasEntriesInRange && matchesSearch
  }).map(employee => {
    const employeeEntries = timeEntries.filter(e => e.user_id === employee.id)
    
    // Group by date
    const groupedByDate = employeeEntries.reduce((acc, entry) => {
      const date = format(new Date(entry.timestamp), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(entry)
      return acc
    }, {} as Record<string, TimeEntry[]>)

    // Create pairs for each date
    const pairedEntries = Object.entries(groupedByDate).flatMap(([date, dayEntries]) => {
      const sorted = dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const pairs = []
      
      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i]
        if (entry.entry_type === 'check_in') {
          // Look for check_out in the same day first, then in all employee entries
          let checkOut = sorted.find((e, idx) => idx > i && e.entry_type === 'check_out')
          
          // If no check_out found in the same day, look in all employee entries for the next check_out
          if (!checkOut) {
            checkOut = employeeEntries
              .filter(e => e.entry_type === 'check_out')
              .find(e => new Date(e.timestamp).getTime() > new Date(entry.timestamp).getTime())
          }
          
          const checkInDate = format(new Date(entry.timestamp), 'yyyy-MM-dd')
          const checkOutDate = checkOut ? format(new Date(checkOut.timestamp), 'yyyy-MM-dd') : null
          const isCrossMidnight = checkOut && checkInDate !== checkOutDate
          
          pairs.push({
            date,
            checkIn: entry,
            checkOut: checkOut || null,
            duration: checkOut ? 
              Math.round((new Date(checkOut.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60)) : 
              null,
            isCrossMidnight
          })
        }
      }
      
      return pairs
    }).sort((a, b) => new Date(b.checkIn.timestamp).getTime() - new Date(a.checkIn.timestamp).getTime())

    return {
      employee,
      pairedEntries
    }
  })

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return 'En curso'
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }

  const formatTotalDuration = (minutes: number) => {
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando fichajes de empleados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 lg:px-8 lg:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={onBack}
                className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md mr-3 sm:mr-4 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  <span className="hidden sm:inline">Fichajes de Todos los Empleados</span>
                  <span className="sm:hidden">Todos los Fichajes</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Vista consolidada por empleado</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{employeeData.length} empleados</span>
                <span className="sm:hidden">{employeeData.length}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8">
          <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-4 lg:items-center lg:justify-between">
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPresetDateRange('today')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setPresetDateRange('week')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Esta semana
                </button>
                <button
                  onClick={() => setPresetDateRange('month')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Este mes
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={exportToCSV}
              disabled={employeeData.length === 0}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">Exportar</span>
            </button>
          </div>
        </div>

        {/* Employee Time Entries */}
        {employeeData.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No se encontraron empleados</p>
              <p className="text-sm">Verifica el término de búsqueda o que existan empleados activos</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {employeeData.map(({ employee, pairedEntries }) => {
              // Group pairs by date for this employee
              const groupedByDate = pairedEntries.reduce((acc, pair) => {
                if (!acc[pair.date]) {
                  acc[pair.date] = []
                }
                acc[pair.date].push(pair)
                return acc
              }, {} as Record<string, typeof pairedEntries>)

              const isExpanded = expandedEmployees.has(employee.id)
              const totalDuration = pairedEntries.reduce((total, pair) => total + (pair.duration || 0), 0)
              
              return (
                <div key={employee.id} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
                  {/* Employee Header */}
                  <div 
                    className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50/80 cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => toggleEmployeeExpansion(employee.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-4">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{employee.full_name}</h2>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{employee.email}</p>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                        {pairedEntries.length > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {formatTotalDuration(totalDuration)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            Sin fichajes
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Entries by Date */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                      {pairedEntries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay fichajes en el rango seleccionado</p>
                        </div>
                      ) : (
                        Object.entries(groupedByDate).map(([date, dayPairs]) => {
                        const dailyDuration = dayPairs.reduce((total, pair) => total + (pair.duration || 0), 0)
                        
                        return (
                          <div key={date} className="border border-gray-200 rounded-lg">
                            {/* Day Header */}
                            <div className="bg-gray-50/80 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center justify-between">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mr-2">
                                <span className="hidden sm:inline">
                                  {format(new Date(date), 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                                </span>
                                <span className="sm:hidden">
                                  {format(new Date(date), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              </h3>
                              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                {formatTotalDuration(dailyDuration)}
                              </span>
                            </div>
                            
                            {/* Day Entries */}
                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                              {dayPairs.map((pair, pairIndex) => (
                                <div key={pairIndex} className="space-y-2">
                                  {/* Duration badge - positioned at top right */}
                                  <div className="flex justify-end">
                                    <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                                      {formatDuration(pair.duration)}
                                    </span>
                                  </div>
                                  
                                  {/* Time entries */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1">
                                    {/* Check In */}
                                    <div className="bg-green-50 rounded-lg p-2 sm:p-3 flex items-center justify-between">
                                      <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-green-500 mr-3" />
                                        <span className="text-base sm:text-lg font-bold text-green-900">
                                          {format(new Date(pair.checkIn.timestamp), 'HH:mm', { locale: es })}
                                        </span>
                                      </div>
                                      {pair.checkIn.latitude && pair.checkIn.longitude && (
                                        <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${pair.checkIn.latitude},${pair.checkIn.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-green-700 hover:text-green-800 flex items-center"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Ver
                                        </a>
                                      )}
                                    </div>
                                    
                                    {/* Check Out */}
                                    {pair.checkOut ? (
                                      <div className="bg-red-50 rounded-lg p-2 sm:p-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                          <div className="w-3 h-3 rounded-full bg-red-500 mr-3" />
                                          <div>
                                            <span className="text-base sm:text-lg font-bold text-red-900">
                                              {format(new Date(pair.checkOut.timestamp), 'HH:mm', { locale: es })}
                                            </span>
                                            {pair.isCrossMidnight && (
                                              <div className="text-xs text-red-600 mt-1">
                                               {format(new Date(pair.checkOut.timestamp), 'dd/MM/yyyy', { locale: es })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {pair.checkOut.latitude && pair.checkOut.longitude && (
                                          <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${pair.checkOut.latitude},${pair.checkOut.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-red-700 hover:text-red-800 flex items-center"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Ver
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3 flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                          <div className="w-3 h-3 rounded-full bg-gray-400 mx-auto mb-2" />
                                          <p className="text-sm">Salida pendiente</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}