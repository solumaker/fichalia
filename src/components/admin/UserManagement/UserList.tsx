import React from 'react'
import { Eye, Edit, Trash2, User, Mail, Shield, MoreVertical } from 'lucide-react'
import type { Profile } from '../../../types'
import { Button } from '../../ui/Button'
import { useErrorHandler } from '../../../hooks/useErrorHandler'
import { UserService } from '../../../services/userService'

interface UserListProps {
  users: Profile[]
  onViewEmployee: (employeeId: string) => void
  onReloadUsers: () => void
}

export function UserList({ 
  users, 
  onViewEmployee,
  onReloadUsers
}: UserListProps) {
  const { handleAsync } = useErrorHandler()

  const handleUserClick = async (userId: string) => {
    await handleAsync(
      () => Promise.resolve(onViewEmployee(userId)),
      undefined,
      (error) => {
        console.error('Error navigating to user:', error)
        // Don't block navigation on error, just log it
        onViewEmployee(userId)
      }
    )
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await handleAsync(
      () => UserService.toggleUserStatus(userId, currentStatus),
      () => onReloadUsers(),
      (error) => console.error('Error toggling user status:', error)
    )
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${userName}?`)) {
      await handleAsync(
        () => UserService.deleteUser(userId),
        () => onReloadUsers(),
        (error) => console.error('Error deleting user:', error)
      )
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 text-lg mb-2">No hay usuarios registrados</p>
        <p className="text-gray-400 text-sm">Agrega el primer usuario para comenzar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Mobile: Card layout, Desktop: Table-like layout */}
      {users.map(user => (
        <div 
          key={user.id} 
          className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Mobile Layout */}
          <div className="block sm:hidden">
            <div className="p-4">
              {/* User Info Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center ${user.profile_image_url ? 'hidden' : ''}`}>
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {user.email}
                    </p>
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              {/* Role and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role === 'admin' ? 'Admin' : 'Empleado'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUserClick(user.id)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {user.role === 'employee' && (
                    <>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-12 gap-4 items-center p-4">
              {/* Profile Image + Name */}
              <div className="col-span-4 flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {user.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      alt={user.full_name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center ${user.profile_image_url ? 'hidden' : ''}`}>
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Role */}
              <div className="col-span-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role === 'admin' ? 'Admin' : 'Empleado'}
                </span>
              </div>
              
              {/* Status */}
              <div className="col-span-2 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-600">
                  {user.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              {/* Actions */}
              <div className="col-span-4 flex items-center justify-end space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUserClick(user.id)
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Detalles
                </button>
                
                {user.role === 'employee' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUserStatus(user.id, user.active)
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        user.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteUser(user.id, user.full_name)
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}