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
    // Delete existing shifts first
    const { error: deleteError } = await supabase
      .from('work_shifts')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // Insert new shifts with unique identifiers
    const shiftsToInsert = shifts.map((shift, index) => ({
      user_id: userId,
      day_of_week: shift.day_of_week,
      start_time: shift.start_time,
      end_time: shift.end_time,
      is_active: shift.is_active,
      break_duration_minutes: shift.break_duration_minutes || 0
    }))

    const { error } = await supabase
      .from('work_shifts')
      .insert(shiftsToInsert)

    if (error) throw error
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