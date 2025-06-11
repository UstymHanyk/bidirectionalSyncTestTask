"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSync } from '@/hooks/use-sync';
import { getAuthHeaders } from '@/lib/fetch-utils';
import { Loader2, Upload, Zap, Activity, Download, Building2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { CRMProvider, SyncStatus } from '@/types/sync';

interface SyncDashboardProps {
  customerId: string;
}

interface Connection {
  id: string;
  name: string;
  integrationName: string;
  status: string;
  isActive: boolean;
  crmProvider: CRMProvider;
}

export function SyncDashboard({ customerId }: SyncDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const { 
    syncStatus, 
    isLoading, 
    error,
    isTriggering,
    triggerFlow,
  } = useSync(customerId);

  const [triggeringProvider, setTriggeringProvider] = useState<CRMProvider | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

  // Prevent hydration issues by ensuring client-side rendering for dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch available connections on component mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch('/api/sync/connections', {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnections(data.connections || []);
        } else {
          console.error('Failed to fetch connections');
        }
      } catch (error) {
        console.error('Error fetching connections:', error);
      } finally {
        setLoadingConnections(false);
      }
    };

    if (mounted) {
      fetchConnections();
    }
  }, [mounted]);

  // Get connection ID for a specific CRM provider
  const getConnectionId = (provider: CRMProvider): string | null => {
    const connection = connections.find(conn => conn.crmProvider === provider && conn.isActive);
    return connection?.id || null;
  };

  const handleSyncToCRM = async (
    provider: CRMProvider, 
    connectionId?: string
  ) => {
    setTriggeringProvider(provider);
    
    try {
      console.log(`Syncing local changes to ${provider}`);
      window.dispatchEvent(new CustomEvent('syncOperationStart'));
      
      const realConnectionId = connectionId || getConnectionId(provider);
      
      if (!realConnectionId) {
        throw new Error(`No active connection found for ${provider}`);
      }

      if(triggerFlow) {
        // Only trigger export since imports are handled by webhooks automatically
        await triggerFlow(provider, realConnectionId, 'export');
        window.dispatchEvent(new CustomEvent('syncOperationComplete'));
      }
    } catch (error) {
      console.error(`Failed to sync to ${provider}:`, error);
    } finally {
      setTriggeringProvider(null);
      window.dispatchEvent(new CustomEvent('syncOperationEnd'));
    }
  };

  const handleImportFromCRM = async (
    provider: CRMProvider, 
    connectionId?: string
  ) => {
    setTriggeringProvider(provider);
    
    try {
      console.log(`Importing all contacts from ${provider}`);
      window.dispatchEvent(new CustomEvent('syncOperationStart'));
      
      const realConnectionId = connectionId || getConnectionId(provider);
      
      if (!realConnectionId) {
        throw new Error(`No active connection found for ${provider}`);
      }
      
      // Call the import-contacts action endpoint with real connection ID
      const response = await fetch('/api/sync/actions/import-contacts', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crmProvider: provider,
          connectionId: realConnectionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import contacts');
      }

      const result = await response.json();
      console.log(`Import result:`, result);
      window.dispatchEvent(new CustomEvent('syncOperationComplete'));
      
    } catch (error) {
      console.error(`Failed to import from ${provider}:`, error);
    } finally {
      setTriggeringProvider(null);
      window.dispatchEvent(new CustomEvent('syncOperationEnd'));
    }
  };

  const getStatusColor = (status: SyncStatus | undefined) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'syncing': 
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': 
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: SyncStatus | undefined) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'syncing': 
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed': 
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: SyncStatus | undefined) => {
    switch (status) {
      case 'success': return 'Synced';
      case 'syncing': return 'Syncing';
      case 'pending': return 'Pending';
      case 'failed': 
      case 'error': return 'Failed';
      case 'cancelled': return 'Cancelled';
      case 'idle': return 'Ready';
      default: return 'Unknown';
    }
  };

  const formatTimestamp = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    try {
      const d = new Date(date);
      // Use a consistent format that works the same on server and client
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC' // Ensure consistent timezone
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (!mounted || isLoading || loadingConnections) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Sync Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Contact Synchronization
          </CardTitle>
          <CardDescription>
            Push local changes to your CRMs. External CRM changes sync automatically via webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus?.totalContacts || 0}</div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus?.pendingOperations || 0}</div>
              <div className="text-sm text-muted-foreground">Pending Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{connections.filter(c => c.isActive).length}</div>
              <div className="text-sm text-muted-foreground">Active Connections</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className={`px-3 py-1 ${getStatusColor(syncStatus?.status)}`}>
                <span className="mr-2">{getStatusIcon(syncStatus?.status)}</span>
                {getStatusText(syncStatus?.status)}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-sm text-muted-foreground">
            <strong>Last Sync:</strong> {formatTimestamp(syncStatus?.lastSync)}
          </div>
        </CardContent>
      </Card>

      {/* CRM Connections */}
      {connections.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Connected CRM Systems</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((connection) => (
              <Card key={connection.id} className={connection.isActive ? "border-green-200" : "border-gray-200"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        connection.isActive ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Building2 className={`h-5 w-5 ${
                          connection.isActive ? 'text-green-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold">{connection.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {connection.integrationName} • {connection.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <Badge variant={connection.isActive ? "default" : "secondary"}>
                      {connection.isActive ? "Connected" : "Disconnected"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportFromCRM(connection.crmProvider as CRMProvider, connection.id)}
                      disabled={!connection.isActive || triggeringProvider === connection.crmProvider}
                      className="flex-1"
                    >
                      {triggeringProvider === connection.crmProvider ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Import All
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSyncToCRM(connection.crmProvider as CRMProvider, connection.id)}
                      disabled={!connection.isActive || triggeringProvider === connection.crmProvider}
                      className="flex-1"
                    >
                      {triggeringProvider === connection.crmProvider ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Export Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">No CRM Connections</p>
                <p className="text-sm text-yellow-700">Connect to HubSpot or Pipedrive to enable automatic sync.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {syncStatus?.recentActivity && syncStatus.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Sync Activity
            </CardTitle>
            <CardDescription>
              Latest synchronization operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncStatus.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getStatusColor(activity.status as SyncStatus)}`}>
                      {getStatusIcon(activity.status as SyncStatus)}
                    </div>
                    <div>
                      <span className="text-sm font-medium capitalize">{activity.type}</span>
                      {activity.flowRunId && (
                        <div className="text-xs text-muted-foreground">Flow: {activity.flowRunId.substring(0, 8)}...</div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Sync Error:</span>
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}