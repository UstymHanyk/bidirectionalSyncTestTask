import { NextRequest, NextResponse } from 'next/server';
import { SyncDataLink } from '@/models/sync-data-link';
import connectDB from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Webhook endpoint for Integration.app flows to save external contact IDs
 * This is called by the "Save External Contact Id" step in Integration.app flows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔗 Save External ID webhook called:', JSON.stringify(body, null, 2));

    await connectDB();

    // Extract data from Integration.app webhook payload
    // Integration.app can send data in various formats
    let localContactId: string;
    let externalContactId: string;
    let crmProvider: string;
    let connectionId: string;
    let customerId: string;

    // Handle different payload formats that Integration.app might send
    if (body.data) {
      // Format 1: Nested data structure
      localContactId = body.data.localContactId || body.data.contactId || body.data.id;
      externalContactId = body.data.externalContactId || body.data.external_id || body.data.crmContactId;
      crmProvider = body.data.crmProvider || body.data.provider;
      connectionId = body.data.connectionId || body.connectionId;
      customerId = body.data.customerId || body.customerId;
    } else {
      // Format 2: Flat structure
      localContactId = body.localContactId || body.contactId || body.id;
      externalContactId = body.externalContactId || body.external_id || body.crmContactId;
      crmProvider = body.crmProvider || body.provider;
      connectionId = body.connectionId;
      customerId = body.customerId;
    }

    // Normalize CRM provider name
    if (crmProvider) {
      crmProvider = crmProvider.toLowerCase().replace(/\s+/g, '');
    }

    console.log('📊 Extracted data:', {
      localContactId,
      externalContactId,
      crmProvider,
      connectionId: connectionId?.substring(0, 8) + '...',
      customerId: customerId?.substring(0, 8) + '...'
    });

    // Validate required fields
    if (!localContactId || !externalContactId || !crmProvider || !customerId) {
      const missing = [];
      if (!localContactId) missing.push('localContactId');
      if (!externalContactId) missing.push('externalContactId');
      if (!crmProvider) missing.push('crmProvider');
      if (!customerId) missing.push('customerId');
      
      console.error('❌ Missing required fields:', missing);
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missing,
          received: body
        },
        { status: 400 }
      );
    }

    try {
      // Check if sync data link already exists
      const existingLink = await SyncDataLink.findOne({
        localContactId,
        crmProvider,
        customerId
      });

      if (existingLink) {
        // Update existing link
        await SyncDataLink.findByIdAndUpdate(existingLink._id, {
          externalContactId,
          connectionId: connectionId || existingLink.connectionId,
          syncStatus: 'success',
          lastSyncAt: new Date()
        });

        console.log('✅ Updated existing sync data link:', existingLink._id);
      } else {
        // Create new sync data link
        const newLink = await SyncDataLink.create({
          id: uuidv4(),
          localContactId,
          externalContactId,
          crmProvider,
          connectionId: connectionId || 'unknown',
          customerId,
          syncStatus: 'success',
          lastSyncAt: new Date()
        });

        console.log('✅ Created new sync data link:', newLink._id);
      }

      // Return structured response that Integration.app can use in flow
      const response = {
        success: true,
        message: 'External contact ID saved successfully',
        data: {
          localContactId,
          externalContactId,
          crmProvider,
          connectionId,
          customerId,
          timestamp: new Date().toISOString(),
          linkId: existingLink?._id || 'new'
        },
        // Additional data that Integration.app flows might need
        flowContext: {
          canProceedToNextStep: true,
          syncStatus: 'success',
          mappingComplete: true
        }
      };

      console.log('📤 Returning response:', response);
      return NextResponse.json(response);

    } catch (dbError) {
      console.error('❌ Database error saving sync data link:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
          data: { localContactId, externalContactId, crmProvider }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Save external ID webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Save External Contact ID',
    description: 'Webhook for Integration.app flows to save external contact ID mappings',
    expectedPayload: {
      localContactId: 'string (required)',
      externalContactId: 'string (required)', 
      crmProvider: 'string (required)',
      connectionId: 'string (optional)',
      customerId: 'string (required)'
    },
    usage: 'Called by Integration.app "Save External Contact Id" flow step'
  });
} 