export interface GeolocationData {
  latitude: number
  longitude: number
  address?: string
}

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface PaginationOptions {
  page: number
  limit: number
  total: number
}

export type ViewMode = 'dashboard' | 'employee-detail' | 'all-timesheet'

export interface NotificationMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}