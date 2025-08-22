export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role: 'employee' | 'admin'
}

export interface UpdateUserRequest {
  full_name?: string
  email?: string
  role?: 'employee' | 'admin'
  active?: boolean
}

export interface TimeEntriesQuery {
  selectedUser?: string
  startDate?: string
  endDate?: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface SignUpData extends AuthCredentials {
  fullName: string
}