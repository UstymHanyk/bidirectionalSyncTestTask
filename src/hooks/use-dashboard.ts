import useSWR from 'swr'
import { authenticatedFetcher } from '@/lib/fetch-utils'

interface DashboardStats {
  totalContacts: number
  syncedToday: number
  activeConnections: number
  lastSyncMinutesAgo: number | null
  addedThisWeek: number
  isUpToDate: boolean
}

interface RecentActivity {
  id: string
  action: string
  timeAgo: string
  status: 'success' | 'warning' | 'info' | 'error'
  timestamp: Date
}

interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivity[]
}

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    '/api/dashboard',
    (url) => authenticatedFetcher<DashboardData>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  return {
    stats: data?.stats ?? {
      totalContacts: 0,
      syncedToday: 0,
      activeConnections: 0,
      lastSyncMinutesAgo: null,
      addedThisWeek: 0,
      isUpToDate: false,
    },
    recentActivity: data?.recentActivity ?? [],
    isLoading,
    isError: error,
    mutate,
  }
} 