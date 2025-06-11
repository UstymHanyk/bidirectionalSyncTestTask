import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { SyncEngine } from '@/lib/sync-engine';
import connectDB from '@/lib/mongodb';
import type { CRMProvider, SyncDirection } from '@/types/sync';

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
    const { crmProvider, connectionId, direction, incremental } = body;

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
    const syncDirection = (direction as SyncDirection) || 'bidirectional';
    
    if (syncDirection === 'import') {
      operationId = await syncEngine.importContactsFromCRM(crmProvider as CRMProvider, connectionId);
    } else if (syncDirection === 'export') {
      operationId = await syncEngine.exportContactsToCRM(crmProvider as CRMProvider, connectionId);
    } else {
      // Bidirectional - run both import and export
      const importId = await syncEngine.importContactsFromCRM(crmProvider as CRMProvider, connectionId);
      const exportId = await syncEngine.exportContactsToCRM(crmProvider as CRMProvider, connectionId);
      operationId = `${importId},${exportId}`;
    }

    return NextResponse.json(
      { 
        operationId,
        message: 'Sync operation started successfully',
        crmProvider,
        direction: direction || 'bidirectional',
        incremental: Boolean(incremental)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 