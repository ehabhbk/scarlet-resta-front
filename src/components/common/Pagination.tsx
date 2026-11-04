import { ChevronRight, ChevronLeft } from 'lucide-react'

interface PaginationProps {
  meta: { current_page: number; last_page: number; total: number; per_page: number } | null
  onPageChange: (page: number) => void
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta || meta.last_page <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        صفحه {meta.current_page} من {meta.last_page} (إجمالي {meta.total})
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page <= 1}
          className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page >= meta.last_page}
          className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}