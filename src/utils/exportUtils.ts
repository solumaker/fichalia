import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TimeEntry, TimeEntryWithProfile, PairedTimeEntry, Profile } from '../types'
import { TimeEntryUtils } from './timeEntryUtils'

export class ExportUtils {
  static exportTimeEntriesToCSV(
    entries: TimeEntryWithProfile[], 
    filename: string = 'fichajes.csv'
  ): void {
    const headers = ['Empleado', 'Email', 'Tipo', 'Fecha', 'Hora', 'Ubicación']
    const rows = entries.map(entry => [
      entry.profiles?.full_name || 'N/A',
      entry.profiles?.email || 'N/A',
      entry.entry_type === 'check_in' ? 'Entrada' : 'Salida',
      format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: es }),
      format(new Date(entry.timestamp), 'HH:mm', { locale: es }),
      entry.address || `${entry.latitude?.toFixed(4)}, ${entry.longitude?.toFixed(4)}` || 'N/A'
    ])

    this.downloadCSV(headers, rows, filename)
  }

  static exportEmployeeTimeEntriesToCSV(
    entries: TimeEntry[], 
    employee: Profile,
    dateRange: { start: string; end: string }
  ): void {
    const headers = ['Fecha', 'Hora', 'Tipo', 'Latitud', 'Longitud', 'Dirección']
    const rows = entries.map(entry => [
      format(new Date(entry.timestamp), 'dd/MM/yyyy', { locale: es }),
      format(new Date(entry.timestamp), 'HH:mm:ss', { locale: es }),
      entry.entry_type === 'check_in' ? 'Entrada' : 'Salida',
      entry.latitude?.toString() || '',
      entry.longitude?.toString() || '',
      entry.address || ''
    ])

    const filename = `fichajes_${employee.full_name.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}.csv`
    this.downloadCSV(headers, rows, filename)
  }

  static exportAllEmployeesTimesheet(
    employees: Profile[],
    timeEntries: TimeEntry[],
    dateRange: { start: string; end: string }
  ): void {
    const headers = ['Empleado', 'Email', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Duración', 'Ubicación Entrada', 'Ubicación Salida']
    const rows: string[][] = []

    employees.forEach(employee => {
      const employeeEntries = timeEntries.filter(e => e.user_id === employee.id)
      const pairedEntries = TimeEntryUtils.createPairedEntries(employeeEntries)

      pairedEntries.forEach(pair => {
        rows.push([
          employee.full_name,
          employee.email,
          format(new Date(pair.checkIn.timestamp), 'dd/MM/yyyy', { locale: es }),
          format(new Date(pair.checkIn.timestamp), 'HH:mm:ss', { locale: es }),
          pair.checkOut ? format(new Date(pair.checkOut.timestamp), 'HH:mm:ss', { locale: es }) : 'Pendiente',
          TimeEntryUtils.formatDuration(pair.duration),
          pair.checkIn.address || `${pair.checkIn.latitude?.toFixed(4)}, ${pair.checkIn.longitude?.toFixed(4)}` || 'N/A',
          pair.checkOut ? (pair.checkOut.address || `${pair.checkOut.latitude?.toFixed(4)}, ${pair.checkOut.longitude?.toFixed(4)}` || 'N/A') : 'N/A'
        ])
      })
    })

    const filename = `fichajes_todos_empleados_${dateRange.start}_${dateRange.end}.csv`
    this.downloadCSV(headers, rows, filename)
  }

  private static downloadCSV(headers: string[], rows: string[][], filename: string): void {
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }
}