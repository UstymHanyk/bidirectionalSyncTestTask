import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { SyncEngine } from '@/lib/sync-engine';
import connectDB from '@/lib/mongodb';
import type { CRMProvider, SyncDirection } from '@/types/sync';

/**
 * Trigger Integration.app Flows for contact synchronization
 * 
 * This endpoint replaces direct action calls with Flow triggers.
 * Integration.app Flows handle the sync orchestration and data transformation.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      crmProvider, 
      connectionId, 
      direction = 'bidirectional',
      contactIds 
    } = body;

    // Validate required fields
    if (!crmProvider || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: crmProvider, connectionId' },
        { status: 400 }
      );
    }

    // Validate CRM provider
    if (!['hubspot', 'pipedrive'].includes(crmProvider)) {
      return NextResponse.json(
        { error: 'Invalid CRM provider. Supported: hubspot, pipedrive' },
        { status: 400 }
      );
    }

    // Validate sync direction
    if (direction && !['import', 'export', 'bidirectional'].includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid sync direction. Supported: import, export, bidirectional' },
        { status: 400 }
      );
    }

    await connectDB();

    const syncEngine = new SyncEngine(auth);
    
    let operationId: string;
    const syncDirection = direction as SyncDirection;
    
    console.log(`Triggering ${syncDirection} Flow for ${crmProvider}`, {
      customerId: auth.customerId,
      connectionId,
      contactIds: contactIds?.length || 'all'
    });
    
    // Trigger the appropriate Integration.app Flow
    switch (syncDirection) {
      case 'import':
        operationId = await syncEngine.triggerContactImportFlow(
          crmProvider as CRMProvider, 
          connectionId
        );
        break;
        
      case 'export':
        operationId = await syncEngine.triggerContactExportFlow(
          crmProvider as CRMProvider, 
          connectionId,
          contactIds
        );
        break;
        
      case 'bidirectional':
        operationId = await syncEngine.triggerBidirectionalSync(
          crmProvider as CRMProvider, 
          connectionId
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid sync direction' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { 
        operationId,
        message: `${syncDirection} Flow triggered successfully`,
        crmProvider,
        direction: syncDirection,
        customerId: auth.customerId,
        flowBased: true,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error triggering Flow:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to trigger Flow',
        flowBased: true
      },
      { status: 500 }
    );
  }
}

/**
 * Get Flow execution status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flowRunId = searchParams.get('flowRunId');
    const operationId = searchParams.get('operationId');

    await connectDB();

    const syncEngine = new SyncEngine(auth);
    const status = await syncEngine.getSyncStatus();

    return NextResponse.json({
      flowBased: true,
      status,
      flowRunId,
      operationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting Flow status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get Flow status',
        flowBased: true
      },
      { status: 500 }
    );
  }
} 