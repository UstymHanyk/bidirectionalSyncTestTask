import useSWR from 'swr';
import { useState } from 'react';
import { authenticatedFetcher, getAuthHeaders } from '@/lib/fetch-utils';
import type { CRMProvider, SyncDirection, SyncStatus } from '@/types/sync';

// The expected shape of the data from our new flow-based status API
interface FlowSyncStatus {
  lastSync: Date | null;
  status: SyncStatus;
  totalContacts: number;
  pendingOperations: number;
  recentActivity: Array<{
    id: string;
    type: string;
    status: string;
    timestamp: Date;
    flowRunId?: string;
  }>;
}

interface FlowSyncStatusResponse {
  flowBased: boolean;
  status: FlowSyncStatus;
  flowRunId?: string;
  operationId?: string;
  timestamp: string;
}

export function useSync(customerId: string) {
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch sync status from the new flow-based endpoint
  const { data, error, isLoading, mutate } = useSWR<FlowSyncStatusResponse>(
    `/api/sync/flows/trigger`,
    (url) => authenticatedFetcher<FlowSyncStatusResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5000, // Refresh every 5 seconds
    }
  );

  const triggerFlow = async (
    crmProvider: CRMProvider,
    connectionId: string,
    direction: SyncDirection
  ) => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/sync/flows/trigger', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crmProvider,
          connectionId,
          direction,
          customerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger flow');
      }

      const result = await response.json();
      
      // Refresh sync status after triggering
      await mutate();
      
      return result;
    } catch (err) {
      console.error('Error triggering flow:', err);
      throw err;
    } finally {
      setIsTriggering(false);
    }
  };

  return {
    syncStatus: data?.status,
    isLoading,
    error,
    isTriggering,
    triggerFlow,
    mutate,
  };
} 