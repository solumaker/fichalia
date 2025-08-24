import React, { useState, useEffect } from 'react'
import { User, Save, Camera, Phone, Building, Calendar, Briefcase } from 'lucide-react'
import { ShiftManagementService } from '../../services/shiftManagementService'
import type { UserProfileExtended } from '../../types/shift-management.types'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ProfileExtendedProps {
  userId: string
}

export function ProfileExtended({ userId }: ProfileExtendedProps) {
  const [profile, setProfile] = useState<Partial<UserProfileExtended>>({
    profile_image_url: '',
    phone: '',
    department: '',
    position: '',
    hire_date: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const existingProfile = await ShiftManagementService.getExtendedProfile(userId)
      if (existingProfile) {
        setProfile(existingProfile)
        setImagePreview(existingProfile.profile_image_url || '')
      }
    } catch (error) {
      console.error('Error loading extended profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = (field: keyof UserProfileExtended, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setSuccess(null)
    
    if (field === 'profile_image_url') {
      setImagePreview(value)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)

    try {
      await ShiftManagementService.updateExtendedProfile(userId, profile)
      setSuccess('Perfil actualizado correctamente')
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleImageError = () => {
    setImagePreview('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Perfil Extendido
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Completa tu información personal y profesional
        </p>
      </div>

      <div className="p-6">
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Image Section */}
          <div className="lg:col-span-1">
            <div className="text-center">
              <div className="relative inline-block">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de la imagen
                </label>
                <input
                  type="url"
                  value={profile.profile_image_url || ''}
                  onChange={(e) => updateProfile('profile_image_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pega la URL de tu foto de perfil
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-2" />
                  Departamento
                </label>
                <input
                  type="text"
                  value={profile.department || ''}
                  onChange={(e) => updateProfile('department', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Desarrollo, Marketing, Ventas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  Puesto
                </label>
                <input
                  type="text"
                  value={profile.position || ''}
                  onChange={(e) => updateProfile('position', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Desarrollador Senior, Gerente de Ventas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Fecha de Contratación
                </label>
                <input
                  type="date"
                  value={profile.hire_date || ''}
                  onChange={(e) => updateProfile('hire_date', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Información Adicional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tiempo en la empresa:</p>
                  <p className="font-semibold">
                    {profile.hire_date ? (
                      (() => {
                        const hireDate = new Date(profile.hire_date)
                        const now = new Date()
                        const diffTime = Math.abs(now.getTime() - hireDate.getTime())
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        const years = Math.floor(diffDays / 365)
                        const months = Math.floor((diffDays % 365) / 30)
                        
                        if (years > 0) {
                          return `${years} año${years > 1 ? 's' : ''} ${months > 0 ? `y ${months} mes${months > 1 ? 'es' : ''}` : ''}`
                        } else if (months > 0) {
                          return `${months} mes${months > 1 ? 'es' : ''}`
                        } else {
                          return `${diffDays} día${diffDays > 1 ? 's' : ''}`
                        }
                      })()
                    ) : 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Estado del perfil:</p>
                  <p className="font-semibold text-green-600">
                    {Object.values(profile).filter(v => v && v.toString().trim()).length > 2 
                      ? 'Completo' 
                      : 'Incompleto'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Perfil
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}