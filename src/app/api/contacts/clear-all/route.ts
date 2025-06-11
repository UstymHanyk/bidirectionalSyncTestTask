import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { SyncEngine } from '@/lib/sync-engine';

export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🗑️ Clear all contacts requested by customer: ${auth.customerId}`);

    // Initialize sync engine and perform clear all operation
    const syncEngine = new SyncEngine(auth);
    const result = await syncEngine.clearAllContacts();

    console.log(`✅ Clear all operation completed:`, result);

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} contacts`,
      deletedCount: result.deletedCount,
      operationId: result.operationId,
      eventResults: result.eventResults
    });

  } catch (error) {
    console.error('❌ Error clearing all contacts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear contacts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 