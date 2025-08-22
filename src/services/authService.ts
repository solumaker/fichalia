import { supabase } from '../config/supabase'
import type { Profile, AuthCredentials, SignUpData } from '../types'
import type { User } from '@supabase/supabase-js'

export class AuthService {
  static async signIn(credentials: AuthCredentials): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials)

      if (error) {
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut()
        }
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('No user returned from sign in')
      }

      return data.user
    } catch (error: any) {
      if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
        await supabase.auth.signOut()
      }
      throw error
    }
  }

  static async signUp(signUpData: SignUpData): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
          },
        },
      })

      if (error) {
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut()
        }
        throw error
      }

      if (!data.user) {
        throw new Error('No user returned from sign up')
      }

      return data.user
    } catch (error: any) {
      if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
        await supabase.auth.signOut()
      }
      throw error
    }
  }

  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut()
          return null
        }
        throw error
      }
      return session
    } catch (error: any) {
      if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
        await supabase.auth.signOut()
        return null
      }
      throw error
    }
  }

  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No profile found
        }
        if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
          await supabase.auth.signOut()
          return null
        }
        throw error
      }

      return data
    } catch (error: any) {
      if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
        await supabase.auth.signOut()
        return null
      }
      throw error
    }
  }
}