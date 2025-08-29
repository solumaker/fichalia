import React from 'react'
import type { HeaderProps } from '../../types'

export function Header({ leftContent, rightContent }: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 py-3 sm:px-6 lg:px-8 lg:py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {leftContent}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  )
}