import React from 'react'
import { Clock } from 'lucide-react'
import type { HeaderProps } from '../../types'

export function Header({ leftContent, rightContent }: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 py-3 sm:px-6 lg:px-8 lg:py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 space-x-3 sm:space-x-6 min-w-0">
            {/* Fichalia Brand */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">Fichalia</h1>
                <p className="text-xs text-gray-500 leading-tight truncate hidden sm:block">Control de Fichajes</p>
              </div>
            </div>
            
            {/* Separator */}
            <div className="h-6 sm:h-8 w-px bg-gray-200 flex-shrink-0"></div>
            
            {/* Left Content */}
            <div className="flex-1 min-w-0">
              {leftContent}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  )
}