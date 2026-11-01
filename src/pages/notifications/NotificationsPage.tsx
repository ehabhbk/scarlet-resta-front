import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Bell } from 'lucide-react'
import Card from '../../components/common/cards/Card'
import DataTable from '../../components/common/tables/DataTable'
import Pagination from '../../components/common/Pagination'

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const queryClient = useQueryClient()

  const { data: notifRes, isLoading } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: async () => {
      const res = await api.get(`/notifications?unread_only=${unreadOnly}&page=${page}`)
      return res.data
    },
  })
  const notifications = notifRes?.data
  const meta = notifRes ? { current_page: notifRes.current_page, last_page: notifRes.last_page, total: notifRes.total, per_page: notifRes.per_page } : null

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => { await api.post(`/notifications/${id}/read`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const columns = [
    { key: 'title', header: 'العنوان', render: (n: any) => n.title || n.message || '-' },
    { key: 'type', header: 'النوع' },
    { key: 'is_read', header: 'مقروء', render: (n: any) => n.is_read ? 'نعم' : 'لا' },
    { key: 'created_at', header: 'التاريخ', render: (n: any) => new Date(n.created_at).toLocaleString('ar-SA') },
    { key: 'actions', header: 'الإجراءات', render: (n: any) => (
      !n.is_read && (
        <button onClick={() => markReadMutation.mutate(n.id)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">تعليم كمقروء</button>
      )
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-500" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            غير مقروءة فقط
          </label>
        </div>
      </div>
      <Card>
        <DataTable data={notifications || []} columns={columns} loading={isLoading} emptyMessage="لا توجد إشعارات" />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </div>
  )
}