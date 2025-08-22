export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'employee' | 'admin'
  active: boolean
  created_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  entry_type: 'check_in' | 'check_out'
  timestamp: string
  latitude?: number
  longitude?: number
  address?: string
  created_at: string
}

export interface TimeEntryWithProfile extends TimeEntry {
  profiles?: Profile
}

export interface PairedTimeEntry {
  date: string
  checkIn: TimeEntry
  checkOut: TimeEntry | null
  duration: number | null
  isCrossMidnight?: boolean
}