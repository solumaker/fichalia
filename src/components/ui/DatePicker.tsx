import React from 'react'

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function DatePicker({ label, value, onChange, className = '' }: DatePickerProps) {
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
      />
    </div>
  )
}