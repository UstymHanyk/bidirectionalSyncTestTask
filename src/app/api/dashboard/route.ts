import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Contact } from '@/models/contact'
import { SyncOperationModel } from '@/models/sync-operation'
import { SyncEngine } from '@/lib/sync-engine'
import { getAuthFromRequest } from '@/lib/server-auth'
import { UniversalContact } from '@/types/contact'

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB()

    // Get real sync status from SyncEngine
    const syncEngine = new SyncEngine(auth);
    const syncStatus = await syncEngine.getSyncStatus();

    // Get total contacts count
    const totalContacts = await Contact.countDocuments({ customerId: auth.customerId })

    // Get contacts added in the last 7 days (this week)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const addedThisWeek = await Contact.countDocuments({
      customerId: auth.customerId,
      createdTime: { $gte: oneWeekAgo.toISOString() }
    })

    // Get contacts synced today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const syncedToday = await Contact.countDocuments({
      customerId: auth.customerId,
      updatedTime: { $gte: todayStart.toISOString() }
    })

    // Use sync status data for more accurate metrics
    const lastSyncMinutesAgo = syncStatus.lastSync 
      ? Math.floor((new Date().getTime() - new Date(syncStatus.lastSync).getTime()) / (1000 * 60))
      : null

    // We no longer get connectionStatuses from this endpoint in the new model.
    // This could be a separate call or part of a different status object if needed.
    const activeConnections = 0; // Placeholder

    // Calculate success rate from recent operations
    const recentSuccessfulOps = syncStatus.recentActivity?.filter(op => op.status === 'success').length || 0
    const recentTotalOps = syncStatus.recentActivity?.length || 0
    const successRate = recentTotalOps > 0 ? Math.round((recentSuccessfulOps / recentTotalOps) * 100) : 100

    // Check if data is up to date (synced within last hour)
    const isUpToDate = lastSyncMinutesAgo !== null && lastSyncMinutesAgo < 60

    // Get recent activity from sync operations
    const recentSyncOps = syncStatus.recentActivity || []

    const recentContacts = await Contact.find({ customerId: auth.customerId })
      .sort({ createdTime: -1 })
      .limit(5)
      .select('id fullName primaryEmail createdTime')
      .lean<UniversalContact[]>()

    // Combine and format recent activity
    const recentActivity: Array<{
      id: string
      action: string
      timeAgo: string
      status: 'success' | 'warning' | 'info' | 'error'
      timestamp: Date
    }> = []

    // Add sync operations
    recentSyncOps.forEach(op => {
      const createdAt = op.timestamp
      if (!createdAt) return
      
      const minutesAgo = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60))
      let timeAgo = 'Just now'
      if (minutesAgo >= 1) {
        if (minutesAgo < 60) timeAgo = `${minutesAgo}m ago`
        else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)}h ago`
        else timeAgo = `${Math.floor(minutesAgo / 1440)}d ago`
      }

      recentActivity.push({
        id: `sync-${op.id}`,
        action: `${op.type} sync ${op.status}`,
        timeAgo,
        status: op.status === 'success' ? 'success' : op.status.startsWith('fail') ? 'error' : 'info',
        timestamp: new Date(createdAt)
      })
    })

    // Add recent contact additions
    recentContacts.forEach(contact => {
      const createdTime = contact.createdTime
      if (!createdTime) return
      
      const minutesAgo = Math.floor((new Date().getTime() - new Date(createdTime).getTime()) / (1000 * 60))
      let timeAgo = 'Just now'
      if (minutesAgo >= 1) {
        if (minutesAgo < 60) timeAgo = `${minutesAgo}m ago`
        else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)}h ago`
        else timeAgo = `${Math.floor(minutesAgo / 1440)}d ago`
      }

      recentActivity.push({
        id: `contact-${contact.id}`,
        action: `New contact added: ${contact.fullName || 'Unknown'}`,
        timeAgo,
        status: 'success' as const,
        timestamp: new Date(createdTime)
      })
    })

    // Sort by timestamp and take latest 4
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const dashboardData = {
      stats: {
        totalContacts,
        syncedToday,
        activeConnections,
        lastSyncMinutesAgo,
        addedThisWeek,
        successRate,
        isUpToDate,
      },
      recentActivity: recentActivity.slice(0, 4)
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 