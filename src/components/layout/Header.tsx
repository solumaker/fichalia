import React from 'react'
import { Clock } from 'lucide-react'
import type { HeaderProps } from '../../types'

export function Header({ leftContent, rightContent }: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 space-x-6">
            {/* Fichalia Brand */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Fichalia</h1>
                <p className="text-xs text-gray-500 leading-tight">Control de Fichajes</p>
              </div>
            </div>
            
            {/* Separator */}
            <div className="h-8 w-px bg-gray-200"></div>
            
            {/* Left Content */}
            <div className="flex-1">
              {leftContent}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  )
}