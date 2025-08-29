import { supabase } from '../config/supabase'

export interface UserProfileExtended {
  id: string
  profile_image_url?: string
  phone?: string
  department?: string
  position?: string
  hire_date?: string
  updated_at?: string
}

export class ShiftManagementService {
  static async getExtendedProfile(userId: string): Promise<UserProfileExtended | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles_extended')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No extended profile found
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error loading extended profile:', error)
      return null
    }
  }

  static async updateExtendedProfile(userId: string, profileData: Partial<UserProfileExtended>): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles_extended')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating extended profile:', error)
      throw error
    }
  }
}