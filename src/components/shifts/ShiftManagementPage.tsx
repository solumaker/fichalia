import React, { useState } from 'react'
import { ArrowLeft, Clock, DollarSign, BarChart3, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Header } from '../layout/Header'
import { PageLayout } from '../layout/PageLayout'
import { ShiftSchedule } from './ShiftSchedule'
import { SalaryConfigComponent } from './SalaryConfig'
import { OvertimeReport } from './OvertimeReport'
import { ProfileExtended } from './ProfileExtended'

interface ShiftManagementPageProps {
  onBack: () => void
}

type TabType = 'profile' | 'shifts' | 'salary' | 'reports'

export function ShiftManagementPage({ onBack }: ShiftManagementPageProps) {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  if (!user || !profile) {
    return null
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Perfil', icon: User },
    { id: 'shifts' as TabType, label: 'Turnos', icon: Clock },
    { id: 'salary' as TabType, label: 'Salario', icon: DollarSign },
    { id: 'reports' as TabType, label: 'Reportes', icon: BarChart3 }
  ]

  return (
    <PageLayout>
      <Header
        leftContent={
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="inline-flex items-center px-2 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gestión de Turnos</h2>
              <p className="text-sm text-gray-600">Configuración avanzada de horarios y salarios</p>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'profile' && (
            <ProfileExtended userId={user.id} />
          )}
          
          {activeTab === 'shifts' && (
            <ShiftSchedule userId={user.id} />
          )}
          
          {activeTab === 'salary' && (
            <SalaryConfigComponent userId={user.id} />
          )}
          
          {activeTab === 'reports' && (
            <OvertimeReport userId={user.id} />
          )}
        </div>
      </div>
    </PageLayout>
  )
}