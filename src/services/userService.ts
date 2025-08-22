import { supabase } from '../config/supabase'
import type { Profile, CreateUserRequest, UpdateUserRequest, ApiResponse } from '../types'

export class UserService {
  static async getAllUsers(): Promise<Profile[]> {
    // Refresh session to ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al cargar usuarios')
    }

    return result.users || []
  }

  static async createUser(userData: CreateUserRequest): Promise<ApiResponse<Profile>> {
    // Refresh session to ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al crear usuario')
    }

    return { success: true, data: result.user }
  }

  static async updateUser(userId: string, updates: UpdateUserRequest): Promise<void> {
    // Refresh session to ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, updates })
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al actualizar usuario')
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    // Refresh session to ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError || !session) {
      throw new Error('No hay sesión activa')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al eliminar usuario')
    }
  }

  static async toggleUserStatus(userId: string, currentStatus: boolean): Promise<void> {
    await this.updateUser(userId, { active: !currentStatus })
  }
}