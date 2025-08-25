import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile, AuthCredentials, SignUpData } from '../types'
import { AuthService } from '../services/authService'
import { useErrorHandler } from './useErrorHandler'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { handleAsync } = useErrorHandler()
  
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    return await handleAsync(
      () => AuthService.getProfile(userId),
      undefined,
      (error) => console.error('Error loading profile:', handleAsync.formatError ? handleAsync.formatError(error) : error)
    )
  }

  useEffect(() => {
    let mounted = true
    let subscription: any = null

    const initializeAuth = async () => {
      try {
        const session = await AuthService.getCurrentSession()
        
        if (session?.user) {
          setUser(session.user)
          console.log('User found, loading profile...')
          const profileData = await loadProfile(session.user.id)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }

      // Set up auth state change listener
      const { data: { subscription: authSubscription } } = (await import('../config/supabase')).supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in, loading profile...')
            setUser(session.user)
            const profileData = await loadProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
              setLoading(false)
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out')
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      )
      subscription = authSubscription
    }
    
    initializeAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const user = await AuthService.signIn({ email, password })
      return user
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const user = await AuthService.signUp({ email, password, fullName })
      return user
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await AuthService.signOut()
    } catch (error) {
      console.warn('Sign out error:', error)
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }
}