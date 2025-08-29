import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from '../types'

export class DateUtils {
  static getTodayRange(): DateRange {
    const today = new Date()
    const dateString = format(today, 'yyyy-MM-dd')
    return {
      start: dateString,
      end: dateString
    }
  }

  static getWeekRange(): DateRange {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd')
    }
  }

  static getMonthRange(): DateRange {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    
    return {
      start: format(monthStart, 'yyyy-MM-dd'),
      end: format(monthEnd, 'yyyy-MM-dd')
    }
  }

  static getLastNDaysRange(days: number): DateRange {
    const today = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd')
    }
  }

  static formatDisplayDate(date: string | Date): string {
    return format(new Date(date), 'dd/MM/yyyy (EEEE)', { locale: es })
  }

  static formatShortDate(date: string | Date): string {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es })
  }

  static formatTime(date: string | Date): string {
    return format(new Date(date), 'HH:mm:ss', { locale: es })
  }
}