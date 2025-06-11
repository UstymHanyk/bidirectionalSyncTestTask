"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  RefreshCw, 
  Activity,
  Settings,
  ArrowRight,
  BarChart3,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Database,
  AlertTriangle
} from "lucide-react"
import { useDashboard } from "@/hooks/use-dashboard"

export default function HomePage() {
  const { stats, recentActivity, isLoading, isError } = useDashboard()

  const formatTimeAgo = (minutesAgo: number | null) => {
    if (minutesAgo === null) return "Never"
    if (minutesAgo < 1) return "Just now"
    if (minutesAgo < 60) return `${minutesAgo}m`
    if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h`
    return `${Math.floor(minutesAgo / 1440)}d`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle
      case 'warning': return AlertTriangle
      case 'error': return AlertCircle
      default: return Activity
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Better spacing with proper responsive margins */}
        <section className="pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                Contact Sync Platform
              </h1>
            </div>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Seamlessly synchronize contacts across your CRM systems with real-time bidirectional sync powered by Integration.app
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <Badge variant="secondary" className="flex items-center space-x-1 px-3 py-1">
                <CheckCircle className="h-3 w-3" />
                <span>Production Ready</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1 px-3 py-1">
                <Zap className="h-3 w-3" />
                <span>Real-time Sync</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1 px-3 py-1">
                <Activity className="h-3 w-3" />
                <span>Enterprise Grade</span>
              </Badge>
            </div>
          </div>
        </section>

        {/* Stats Grid - Improved spacing and responsive design */}
        <section className="mb-12 lg:mb-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {/* Total Contacts Card */}
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold">{stats.totalContacts.toLocaleString()}</p>
                    )}
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : stats.addedThisWeek > 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                        +{stats.addedThisWeek} this week
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        No new contacts this week
                      </p>
                    )}
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Synced Today Card */}
            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Synced Today</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold">{stats.syncedToday}</p>
                    )}
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                        {stats.successRate}% success rate
                      </p>
                    )}
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Connections Card */}
            <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold">{stats.activeConnections}</p>
                    )}
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Activity className="inline h-3 w-3 mr-1" />
                        {stats.activeConnections > 0 ? 'All systems healthy' : 'Connect CRM systems'}
                      </p>
                    )}
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Sync Card */}
            <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold">
                        {formatTimeAgo(stats.lastSyncMinutesAgo)}
                      </p>
                    )}
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {stats.lastSyncMinutesAgo !== null ? 'ago' : 'Sync to get started'}
                      </p>
                    )}
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Actions - Better spacing and layout */}
        <section className="mb-12 lg:mb-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 ring-1 ring-gray-200 hover:ring-gray-300">
              <Link href="/contacts" className="block">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Contact Management</CardTitle>
                        <CardDescription className="mt-1">
                          View, edit, and manage all your contacts
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total contacts</span>
                      {isLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span className="font-medium">{stats.totalContacts.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Added this week</span>
                      {isLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="font-medium">{stats.addedThisWeek}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sync status</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <Badge variant="outline" className={`${
                          stats.isUpToDate 
                            ? 'text-green-600 border-green-600' 
                            : 'text-yellow-600 border-yellow-600'
                        }`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {stats.isUpToDate ? 'Up to date' : 'Needs sync'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 ring-1 ring-gray-200 hover:ring-gray-300">
              <Link href="/contacts?tab=sync" className="block">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <RefreshCw className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Sync Dashboard</CardTitle>
                        <CardDescription className="mt-1">
                          Monitor and control synchronization
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last sync</span>
                      {isLoading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <span className="font-medium">
                          {stats.lastSyncMinutesAgo !== null 
                            ? `${formatTimeAgo(stats.lastSyncMinutesAgo)} ago`
                            : 'Never'
                          }
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Success rate</span>
                      {isLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span className="font-medium">{stats.successRate}%</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active flows</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-16" />
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          <Activity className="h-3 w-3 mr-1" />
                          {stats.activeConnections} running
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        </section>

        {/* Recent Activity - Better spacing */}
        <section className="mb-8 lg:mb-12">
          <Card className="border-0 ring-1 ring-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                  <CardDescription className="mt-1">
                    Latest synchronization events and system updates
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/contacts?tab=sync">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))
                ) : isError ? (
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-red-50 text-red-700">
                    <AlertCircle className="h-8 w-8" />
                    <div>
                      <p className="text-sm font-medium">Unable to load recent activity</p>
                      <p className="text-xs text-red-600">Please try refreshing the page</p>
                    </div>
                  </div>
                ) : (
                  recentActivity.map((item) => {
                    const Icon = getStatusIcon(item.status)
                    return (
                      <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                          item.status === 'success' ? 'bg-green-100 text-green-600' :
                          item.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          item.status === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.action}</p>
                          <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                        </div>
                      </div>
                    )
                  })
                )}
        </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
