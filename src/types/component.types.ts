export interface DateRange {
  start: string
  end: string
}

export interface UserFormData {
  full_name: string
  email: string
  role: 'employee' | 'admin'
  password: string
  active?: boolean
}

export interface FilterOptions {
  searchTerm: string
  dateRange: DateRange
  selectedUser: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export interface HeaderProps {
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  user?: Profile
  onSignOut?: () => void
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}