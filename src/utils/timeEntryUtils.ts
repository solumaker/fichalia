import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TimeEntry, PairedTimeEntry } from '../types'

export class TimeEntryUtils {
  static groupPairedEntriesByDate(pairedEntries: PairedTimeEntry[]): Record<string, PairedTimeEntry[]> {
    return pairedEntries.reduce((acc, pair) => {
      if (!acc[pair.date]) {
        acc[pair.date] = []
      }
      acc[pair.date].push(pair)
      return acc
    }, {} as Record<string, PairedTimeEntry[]>)
  }
  static groupEntriesByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
    return entries.reduce((acc, entry) => {
      const date = format(new Date(entry.timestamp), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(entry)
      return acc
    }, {} as Record<string, TimeEntry[]>)
  }

  static createPairedEntries(entries: TimeEntry[]): PairedTimeEntry[] {
    // Sort all entries by timestamp first
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    const pairs: PairedTimeEntry[] = []
    const usedCheckOuts = new Set<string>()
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      if (entry.entry_type === 'check_in') {
        // Find the next unused check_out entry
        const checkOut = sortedEntries.find((e, idx) => 
          idx > i && 
          e.entry_type === 'check_out' && 
          !usedCheckOuts.has(e.id)
        )
        
        // Mark this check_out as used if found
        if (checkOut) {
          usedCheckOuts.add(checkOut.id)
        }
        
        const checkInDate = format(new Date(entry.timestamp), 'yyyy-MM-dd')
        const checkOutDate = checkOut ? format(new Date(checkOut.timestamp), 'yyyy-MM-dd') : null
        
        // If check-out is on a different day, show it as a cross-midnight entry
        const isCrossMidnight = checkOut && checkInDate !== checkOutDate
        
        pairs.push({
          date: checkInDate,
          checkIn: entry,
          checkOut: checkOut || null,
          duration: checkOut ? 
            Math.max(0, Math.round((new Date(checkOut.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60))) : 
            null,
          isCrossMidnight
        })
      }
    }
    
    return pairs.sort((a, b) => 
      new Date(b.checkIn.timestamp).getTime() - new Date(a.checkIn.timestamp).getTime()
    )
  }

  static calculateTotalDuration(pairedEntries: PairedTimeEntry[]): number {
    return pairedEntries.reduce((total, pair) => {
      return total + (pair.duration || 0)
    }, 0)
  }

  static formatDuration(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return 'En curso...'
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }

  static formatTotalDuration(minutes: number): string {
    if (minutes === 0) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hoursStr = hours.toString().padStart(2, '0')
    const minsStr = mins.toString().padStart(2, '0')
    return `${hoursStr}:${minsStr}`
  }

  static formatTimestamp(timestamp: string, formatString: string = 'HH:mm:ss'): string {
    return format(new Date(timestamp), formatString, { locale: es })
  }

  static formatDate(date: string | Date, formatString: string = 'dd/MM/yyyy'): string {
    return format(new Date(date), formatString, { locale: es })
  }
}