import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatCard({ label, value, icon, color = 'bg-primary', trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={clsx(
              'text-sm mt-1',
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
