import React, { useState, useEffect } from 'react'
import { Clock, MapPin, LogOut, CheckCircle2, AlertCircle, Calendar, Filter, Square } from 'lucide-react'
import { supabase, TimeEntry } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function EmployeeDashboard() {
  const { user, profile, signOut } = useAuth()
  const { getCurrentLocation, loading: geoLoading } = useGeolocation()
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Last 7 days
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    if (user) {
      loadLastEntry()
      loadTimeEntries()
    }
  }, [user, profile])

  useEffect(() => {
    if (user && profile) {
      loadTimeEntries()
    }
  }, [dateRange, user, profile])
  
  const loadLastEntry = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error loading last entry:', error)
        return
      }

      setLastEntry(data || null)
    } catch (err) {
      console.error('Error loading last entry:', err)
    }
  }

  const loadTimeEntries = async () => {
    if (!profile) return

    try {
      const startDate = `${dateRange.start}T00:00:00`
      const endDate = `${dateRange.end}T23:59:59`
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', profile.id)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error loading time entries:', error)
        return
      }

      setTimeEntries(data || [])
    } catch (err) {
      console.error('Error loading time entries:', err)
    }
  }
  
  const handleTimeEntry = async (type: 'check_in' | 'check_out') => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Get current location
      const location = await getCurrentLocation()

      // Insert time entry
      const { error } = await supabase
        .from('time_entries')
        .insert({
        user_id: profile!.id,
        entry_type: type,
        timestamp: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      })

      if (error) {
        throw error
      }

      setSuccess(
        type === 'check_in' 
          ? '✅ Entrada registrada correctamente'
          : '✅ Salida registrada correctamente'
      )
      
      // Reload last entry
      await loadLastEntry()
      await loadTimeEntries()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar fichaje')
      console.error('Error in handleTimeEntry:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group entries by day and pair check-ins with check-outs
  const groupedEntries = timeEntries.reduce((acc, entry) => {
    const date = format(new Date(entry.timestamp), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {} as Record<string, TimeEntry[]>)

  // Create paired entries (check-in with corresponding check-out)
  const pairedEntries = Object.entries(groupedEntries).flatMap(([date, dayEntries]) => {
    const sorted = dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const pairs = []
    
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i]
      if (entry.entry_type === 'check_in') {
        // Find the next check_out for this check_in
        const checkOut = sorted.find((e, idx) => idx > i && e.entry_type === 'check_out')
        pairs.push({
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
  }).sort((a, b) => new Date(b.checkIn.timestamp).getTime() - new Date(a.checkIn.timestamp).getTime())

  // Calculate total duration for the selected date range
  const totalDuration = pairedEntries.reduce((total, pair) => {
    return total + (pair.duration || 0)
  }, 0)

  const formatTotalDuration = (minutes: number) => {
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }
  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return 'En curso...'
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }

  const canCheckIn = !lastEntry || lastEntry.entry_type === 'check_out'
  const canCheckOut = lastEntry && lastEntry.entry_type === 'check_in'


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fichalia</h1>
            <p className="text-sm text-gray-600">Bienvenido, {profile?.full_name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Page Title Section */}
        <div className="mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Control de Fichajes</h1>
          <p className="text-sm text-gray-600">Registra tu entrada y salida del trabajo</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {canCheckIn && (
            <button
              onClick={() => handleTimeEntry('check_in')}
              disabled={loading || geoLoading}
              className={`w-full py-6 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center ${
                !loading && !geoLoading
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 mr-3" />
              {loading || geoLoading ? 'Registrando...' : 'FICHAR ENTRADA'}
            </button>
          )}

          {canCheckOut && (
            <button
              onClick={() => handleTimeEntry('check_out')}
              disabled={loading || geoLoading}
              className={`w-full py-6 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center ${
                !loading && !geoLoading
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Square className="w-6 h-6 mr-3" />
              {loading || geoLoading ? 'Registrando...' : 'FICHAR SALIDA'}
            </button>
          )}
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Historial de Fichajes
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  Total: {formatTotalDuration(totalDuration)}
                </span>
                <Filter className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="p-4 max-h-80 overflow-y-auto">
            {pairedEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay fichajes en el rango seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pairedEntries.map((pair, index) => (
                  <div key={`${pair.date}-${index}`} className="p-3 border border-gray-200 rounded-lg">
                    {/* Date and Duration Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {format(new Date(pair.checkIn.timestamp), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {formatDuration(pair.duration)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Entry Details */}
                    <div className="space-y-2">
                      {/* Check In */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-3 bg-green-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Entrada</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(pair.checkIn.timestamp), 'HH:mm', { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {pair.checkIn.address && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${pair.checkIn.latitude},${pair.checkIn.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-700 max-w-32 truncate block"
                            >
                              <MapPin className="w-3 h-3 inline mr-1" />
                              Ver
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Check Out */}
                      {pair.checkOut ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-3 bg-red-500" />
                            <div>
                              <p className="text-xs font-medium text-gray-700">Salida</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(pair.checkOut.timestamp), 'HH:mm', { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {pair.checkOut.address && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${pair.checkOut.latitude},${pair.checkOut.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-700 max-w-32 truncate block"
                              >
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Ver
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-3 bg-gray-300" />
                            <div>
                              <p className="text-xs font-medium text-gray-500">Salida pendiente</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}