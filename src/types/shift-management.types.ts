// Extended user profile types
export interface UserProfileExtended {
  id: string
  profile_image_url?: string
  phone?: string
  department?: string
  position?: string
  hire_date?: string
  updated_at: string
}

// Work shift types
export interface WorkShift {
  id: string
  user_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkShiftInput {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

export interface TimeSlot {
  id: string
  start_time: string
  end_time: string
}

export interface DaySchedule {
  day_of_week: number
  is_active: boolean
  time_slots: TimeSlot[]
}

// Salary configuration types
export interface SalaryConfig {
  id: string
  user_id: string
  gross_salary: number
  salary_type: 'monthly' | 'annual'
  overtime_multiplier: number
  currency: string
  effective_from: string
  created_at: string
  updated_at: string
}

export interface SalaryConfigInput {
  gross_salary: number
  salary_type: 'monthly' | 'annual'
  overtime_multiplier: number
  currency: string
  effective_from: string
}

// Holiday types
export interface Holiday {
  id: string
  name: string
  date: string
  is_recurring: boolean
  created_at: string
}

// Overtime calculation types
export interface OvertimeCalculation {
  id: string
  user_id: string
  year: number
  month: number
  scheduled_hours: number
  worked_hours: number
  regular_hours: number
  overtime_hours: number
  regular_pay: number
  overtime_pay: number
  total_pay: number
  calculation_date: string
  created_at: string
}

// UI component types
export interface ShiftScheduleProps {
  userId: string
  onSave: (shifts: WorkShiftInput[]) => Promise<void>
}

export interface SalaryConfigProps {
  userId: string
  onSave: (config: SalaryConfigInput) => Promise<void>
}

export interface OvertimeReportProps {
  userId: string
  year: number
  month: number
}

// Calculation helpers
export interface DailyWorkSummary {
  date: string
  scheduled_hours: number
  worked_hours: number
  regular_hours: number
  overtime_hours: number
  is_holiday: boolean
}

export interface MonthlyWorkSummary {
  year: number
  month: number
  total_scheduled_hours: number
  total_worked_hours: number
  total_regular_hours: number
  total_overtime_hours: number
  total_regular_pay: number
  total_overtime_pay: number
  total_pay: number
  daily_summaries: DailyWorkSummary[]
}

// Form validation types
export interface ShiftValidationError {
  day_of_week?: string
  start_time?: string
  end_time?: string
  break_duration_minutes?: string
}

export interface SalaryValidationError {
  gross_salary?: string
  salary_type?: string
  overtime_multiplier?: string
  effective_from?: string
}