import React from 'react'
import { Eye } from 'lucide-react'
import type { Profile } from '../../../types'
import { Button } from '../../ui/Button'

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
  return (
    <div className="space-y-4">
      {users.map(user => (
        <div 
          key={user.id} 
          className="grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => {
            onViewEmployee(user.id)
          }}
        >
          <div className="col-span-3">
            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
          </div>
          <div className="col-span-3">
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div className="col-span-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              user.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role === 'admin' ? 'Admin' : 'Empleado'}
            </span>
          </div>
          <div className="col-span-1 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="col-span-3 flex items-center justify-end space-x-2">
          </div>
        </div>
      ))}
    </div>
  )
}