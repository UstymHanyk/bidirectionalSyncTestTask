import { NextRequest, NextResponse } from 'next/server';
import { SyncEngine } from '@/lib/sync-engine';
import connectDB from '@/lib/mongodb';
import type { CRMProvider } from '@/types/sync';
import type { UniversalContact } from '@/types/contact';

interface FlowWebhookPayload {
  event: string;
  contact?: UniversalContact;
  customerId: string;
  crmProvider?: CRMProvider;
  operation: 'create' | 'update' | 'delete';
  source: 'local' | 'external';
  flowRunId: string;
  connectionId: string;
  timestamp: string;
}

/**
 * Webhook handler for Integration.app Flow events
 * 
 * This endpoint receives contact synchronization events from Integration.app Flows.
 * Integration.app acts as the central orchestrator and sends us normalized contact data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload: FlowWebhookPayload = JSON.parse(body);
    
    // Validate Integration.app webhook signature
    const signature = request.headers.get('x-integration-signature') || '';
    const flowRunId = request.headers.get('x-flow-run-id') || '';
    
    console.log('Received flow webhook:', {
      event: payload.event,
      source: payload.source,
      operation: payload.operation,
      flowRunId: payload.flowRunId
    });

    // Verify webhook signature (implement based on Integration.app documentation)
    const webhookSecret = process.env.INTEGRATION_APP_WEBHOOK_SECRET || '';
    if (webhookSecret && !verifyIntegrationAppSignature(body, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Validate required payload fields
    if (!payload.customerId || !payload.operation || !payload.source) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, operation, source' },
        { status: 400 }
      );
    }

    await connectDB();

    // Process the event through our Flow-based sync engine
    const auth = { 
      customerId: payload.customerId, 
      customerName: null 
    };
    
    const syncEngine = new SyncEngine(auth);
    
    try {
      // Handle the contact event from Integration.app Flow
      await syncEngine.handleContactEvent(payload);

      return NextResponse.json({
        message: 'Flow webhook processed successfully',
        event: payload.event,
        operation: payload.operation,
        source: payload.source,
        flowRunId: payload.flowRunId,
        timestamp: new Date().toISOString(),
      });

    } catch (syncError) {
      console.error('Sync engine error:', syncError);
      
      // Return success to Integration.app but log the error
      // This prevents Integration.app from retrying the webhook
      return NextResponse.json({
        message: 'Webhook acknowledged but sync failed',
        error: syncError instanceof Error ? syncError.message : 'Sync processing error',
        flowRunId: payload.flowRunId,
        timestamp: new Date().toISOString(),
      }, { status: 200 }); // Return 200 to prevent retries
    }

  } catch (error) {
    console.error('Error processing flow webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Verify Integration.app webhook signature
 * Implementation depends on Integration.app's signature method
 */
function verifyIntegrationAppSignature(
  body: string, 
  signature: string, 
  secret: string
): boolean {
  try {
    // This is a placeholder - implement according to Integration.app docs
    // Usually involves HMAC SHA256 verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Handle GET requests for webhook endpoint testing
 */
export async function GET() {
  return NextResponse.json({
    message: 'Integration.app Flow Webhook Endpoint',
    status: 'ready',
    timestamp: new Date().toISOString(),
    supportedEvents: [
      'contact.created',
      'contact.updated', 
      'contact.deleted',
      'sync.import.triggered',
      'sync.export.triggered'
    ]
  });
} 