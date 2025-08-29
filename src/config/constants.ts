export const APP_CONFIG = {
  name: 'Fichagil',
  description: 'Control de Fichajes - Time Tracking Application',
  version: '1.0.0'
}

export const ROUTES = {
  dashboard: '/',
  login: '/login',
  admin: '/admin'
}

export const ROLES = {
  ADMIN: 'admin' as const,
  EMPLOYEE: 'employee' as const
}

export const TIME_ENTRY_TYPES = {
  CHECK_IN: 'check_in' as const,
  CHECK_OUT: 'check_out' as const
}

export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  INPUT: 'yyyy-MM-dd',
  TIME: 'HH:mm:ss',
  DATETIME: 'dd/MM/yyyy HH:mm'
}

export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000 // 5 minutes
}