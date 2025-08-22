import { supabase } from '../config/supabase'
import type { TimeEntry, TimeEntryWithProfile, TimeEntriesQuery, GeolocationData } from '../types'

export class TimeEntryService {
  static async createTimeEntry(
    userId: string, 
    entryType: 'check_in' | 'check_out', 
    location: GeolocationData
  ): Promise<void> {
    const { error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        entry_type: entryType,
        timestamp: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      })

    if (error) {
      throw error
    }
  }

  static async getTimeEntries(
    userId?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<TimeEntry[]> {
    let query = supabase
      .from('time_entries')
      .select('*')
      .order('timestamp', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('timestamp', `${startDate}T00:00:00`)
    }

    if (endDate) {
      query = query.lte('timestamp', `${endDate}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  }

  static async getAllTimeEntries(query: TimeEntriesQuery): Promise<TimeEntryWithProfile[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    const params = new URLSearchParams({
      selectedUser: query.selectedUser || 'all',
      startDate: query.startDate || '',
      endDate: query.endDate || ''
    })

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-time-entries?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al cargar fichajes')
    }

    return result.timeEntries || []
  }

  static async getLastTimeEntry(userId: string): Promise<TimeEntry | null> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }
}