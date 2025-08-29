import React, { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, X } from 'lucide-react'
import type { Profile, UserFormData } from '../../../types'
import { Button } from '../../ui/Button'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: UserFormData) => Promise<void>
  editingUser: Profile | null
  error: string
}

export function UserModal({ isOpen, onClose, onSubmit, editingUser, error }: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    role: 'employee',
    password: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [passwordMismatchError, setPasswordMismatchError] = useState('')

  // Reset form when modal opens/closes or editing user changes
  useEffect(() => {
    if (editingUser) {
      setFormData({
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        password: ''
      })
    } else {
      setFormData({
        full_name: '',
        email: '',
        role: 'employee',
        password: ''
      })
    }
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setValidationError('')
    setPasswordMismatchError('')
  }, [editingUser, isOpen])

  // Real-time password validation
  useEffect(() => {
    setValidationError('')
    setPasswordMismatchError('')
    
    // Only validate password mismatch for new users when both fields have content
    if (!editingUser && formData.password && confirmPassword) {
      if (formData.password !== confirmPassword) {
        setPasswordMismatchError('Las contraseñas no coinciden')
      }
    }
  }, [formData.password, confirmPassword, editingUser])

  const validateForm = () => {
    setValidationError('')
    setPasswordMismatchError('')
    
    if (!formData.full_name.trim()) {
      setValidationError('El nombre completo es requerido')
      return false
    }
    
    if (!formData.email.trim()) {
      setValidationError('El correo electrónico es requerido')
      return false
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      setValidationError('Por favor ingresa un correo electrónico válido')
      return false
    }
    
    // Password validation for new users
    if (!editingUser) {
      if (!formData.password.trim()) {
        setValidationError('La contraseña es requerida para nuevos usuarios')
        return false
      }
      
      if (formData.password.length < 6) {
        setValidationError('La contraseña debe tener al menos 6 caracteres')
        return false
      }
      
      if (!confirmPassword.trim()) {
        setValidationError('Debes confirmar la contraseña')
        return false
      }
      
      if (formData.password !== confirmPassword) {
        setPasswordMismatchError('Las contraseñas no coinciden')
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      await onSubmit(formData)
      // Modal will be closed by parent component if successful
    } catch (err) {
      console.error('Error in onSubmit:', err)
      // Error is handled by parent component
    } finally {
      setLoading(false)
    }
  }

  // Calculate if form is valid for button state
  const isFormValid = () => {
    const hasRequiredFields = formData.full_name.trim() && 
                             formData.email.trim() && 
                             formData.role

    if (editingUser) {
      // For editing, we don't require password
      return hasRequiredFields
    } else {
      // For new users, require password and confirmation
      return hasRequiredFields && 
             formData.password.trim() && 
             formData.password.length >= 6 &&
             confirmPassword.trim() &&
             formData.password === confirmPassword
    }
  }

  const formValid = isFormValid()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header - Mobile optimized */}
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingUser ? 'Editar Usuario' : 'Agregar Usuario'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {/* General Error Messages */}
          {(error || validationError) && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm">
              {error || validationError}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500 mr-1">*</span>
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Ingresa el nombre completo"
                autoComplete="name"
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500 mr-1">*</span>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="correo@empresa.com"
                autoComplete="email"
              />
            </div>
            
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500 mr-1">*</span>
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'employee' | 'admin' })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {!editingUser && <span className="text-red-500 mr-1">*</span>}
                Contraseña {editingUser && '(dejar vacío para mantener actual)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Confirm Password - Only for new users */}
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500 mr-1">*</span>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
                      passwordMismatchError 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password Mismatch Error */}
                {passwordMismatchError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                    {passwordMismatchError}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Form Actions - Mobile optimized */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={loading || !formValid}
              className={`w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 px-4 py-3 sm:py-2 text-base sm:text-sm ${
                loading || !formValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:shadow-md'
              }`}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              )}
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Procesando...' : (editingUser ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}