import { supabase } from '../config/supabase'
import type { 
  WorkShift, 
  WorkShiftInput, 
  SalaryConfig, 
  SalaryConfigInput,
  UserProfileExtended,
  OvertimeCalculation,
  Holiday
} from '../types/shift-management.types'

export class ShiftManagementService {
  // Extended Profile Management
  static async getExtendedProfile(userId: string): Promise<UserProfileExtended | null> {
    const { data, error } = await supabase
      .from('user_profiles_extended')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async updateExtendedProfile(userId: string, profile: Partial<UserProfileExtended>): Promise<void> {
    // Convert empty date strings to null to avoid Supabase date validation errors
    const sanitizedProfile = { ...profile }
    if (sanitizedProfile.hire_date === '') {
      sanitizedProfile.hire_date = null
    }

    const { error } = await supabase
      .from('user_profiles_extended')
      .upsert({
        id: userId,
        ...sanitizedProfile,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  // Work Shifts Management
  static async getWorkShifts(userId: string): Promise<WorkShift[]> {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week')

    if (error) throw error
    return data || []
  }

  static async saveWorkShifts(userId: string, shifts: WorkShiftInput[]): Promise<void> {
    // Get current session to authenticate with Edge Function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    try {
      // Validate shifts before saving
      const validationErrors = shifts.map((shift, index) => {
        const errors: string[] = []
        
        // Ensure times are strings, trimmed, and convert HH:MM:SS to HH:MM
        let startTime = String(shift.start_time || '').trim()
        let endTime = String(shift.end_time || '').trim()
        
        // Convert HH:MM:SS to HH:MM if needed
        startTime = startTime.length > 5 ? startTime.substring(0, 5) : startTime
        endTime = endTime.length > 5 ? endTime.substring(0, 5) : endTime
        
        if (!startTime || !endTime) {
          errors.push(`Turno ${index + 1}: Horarios requeridos`)
        }
        
        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (startTime && !timeRegex.test(startTime)) {
          errors.push(`Turno ${index + 1}: Formato de hora de inicio inválido (original: "${shift.start_time}", limpio: "${startTime}")`)
        }
        if (endTime && !timeRegex.test(endTime)) {
          errors.push(`Turno ${index + 1}: Formato de hora de fin inválido (original: "${shift.end_time}", limpio: "${endTime}")`)
        }
        
        return errors
      }).flat()

      if (validationErrors.length > 0) {
        throw new Error(`Errores de validación:\n${validationErrors.join('\n')}`)
      }

      // Convert shifts to the format expected by the service
      const shiftsToSave: WorkShiftInput[] = shifts.map(shift => ({
        day_of_week: shift.day_of_week,
        start_time: String(shift.start_time).trim().substring(0, 5), // Ensure HH:MM format
        end_time: String(shift.end_time).trim().substring(0, 5), // Ensure HH:MM format
        is_active: true,
        break_duration_minutes: 0
      }))

      // Call Edge Function to manage work shifts (bypasses RLS)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-work-shifts`
      
      const payload = { userId, shifts: shiftsToSave }
      
      // Add timeout to prevent hanging - reduced to 15 seconds for faster feedback
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error('Error al procesar la respuesta del servidor')
      }
    
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar los turnos')
      }
      
    } catch (error: any) {
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('La operación tardó demasiado tiempo. Por favor, inténtalo de nuevo.')
      }
      
      // Re-throw the error to be handled by the component
      throw error
    }
  }

  static async updateWorkShift(shiftId: string, updates: Partial<WorkShiftInput>): Promise<void> {
    const { error } = await supabase
      .from('work_shifts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftId)

    if (error) throw error
  }

  // Salary Configuration
  static async getSalaryConfig(userId: string): Promise<SalaryConfig | null> {
    const { data, error } = await supabase
      .from('salary_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async saveSalaryConfig(userId: string, config: SalaryConfigInput): Promise<void> {
    const { error } = await supabase
      .from('salary_config')
      .upsert({
        user_id: userId,
        ...config,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  // Overtime Calculations
  static async calculateMonthlyOvertime(userId: string, year: number, month: number): Promise<void> {
    const { error } = await supabase.rpc('calculate_monthly_overtime', {
      p_user_id: userId,
      p_year: year,
      p_month: month
    })

    if (error) throw error
  }

  static async getOvertimeCalculation(userId: string, year: number, month: number): Promise<OvertimeCalculation | null> {
    const { data, error } = await supabase
      .from('overtime_calculations')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async getOvertimeHistory(userId: string, limit: number = 12): Promise<OvertimeCalculation[]> {
    const { data, error } = await supabase
      .from('overtime_calculations')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Holidays Management
  static async getHolidays(year?: number): Promise<Holiday[]> {
    let query = supabase
      .from('holidays')
      .select('*')
      .order('date')

    if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Utility functions
  static calculateHourlyRate(salaryConfig: SalaryConfig, monthlyScheduledHours: number): number {
    const monthlySalary = salaryConfig.salary_type === 'monthly' 
      ? salaryConfig.gross_salary 
      : salaryConfig.gross_salary / 12

    return monthlyScheduledHours > 0 ? monthlySalary / monthlyScheduledHours : 0
  }

  static calculateScheduledHoursForMonth(shifts: WorkShift[], year: number, month: number): number {
    // Get number of each day of week in the month
    const daysInMonth = new Date(year, month, 0).getDate()
    const dayCount: { [key: number]: number } = {}
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month - 1, day).getDay()
      dayCount[dayOfWeek] = (dayCount[dayOfWeek] || 0) + 1
    }

    let totalHours = 0
    shifts.forEach(shift => {
      if (shift.is_active && dayCount[shift.day_of_week]) {
        const startTime = new Date(`2000-01-01T${shift.start_time}:00`)
        const endTime = new Date(`2000-01-01T${shift.end_time}:00`)
        
        let shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        if (shiftHours < 0) shiftHours += 24 // Handle overnight shifts
        
        shiftHours -= (shift.break_duration_minutes || 0) / 60
        totalHours += shiftHours * dayCount[shift.day_of_week]
      }
    })

    return totalHours
  }

  static validateShiftTime(startTime: string, endTime: string): boolean {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    
    // Allow overnight shifts
    return start.getTime() !== end.getTime()
  }

  static formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  static formatHours(hours: number): string {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }
}