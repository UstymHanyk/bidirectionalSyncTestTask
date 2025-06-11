import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getIntegrationClient } from '@/lib/integration-app-client';
import { Contact } from '@/models/contact';
import { SyncDataLink } from '@/models/sync-data-link';
import { SyncOperationModel } from '@/models/sync-operation';
import connectDB from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import type { CRMProvider } from '@/types/sync';
import type { UniversalContact } from '@/types/contact';

interface ImportContactsRequest {
  crmProvider: CRMProvider;
  connectionId?: string;
  cursor?: string; // For pagination
}

interface GetContactsResponse {
  records: Array<{
    id: string;
    fields: any;
    unifiedFields?: any;
    rawFields?: any;
  }>;
  cursor?: string;
  hasMore: boolean;
}

/**
 * Bulk import contacts from CRM using Integration.app "Get Contacts" action
 * This endpoint handles pagination to import ALL contacts from the specified CRM
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    console.log('Import Contacts Request:', auth);  
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ImportContactsRequest = await request.json();
    const { crmProvider, connectionId, cursor } = body;

    // Validate required fields
    if (!crmProvider) {
      return NextResponse.json(
        { error: 'Missing required field: crmProvider' },
        { status: 400 }
      );
    }

    // Validate connection ID is provided
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing required field: connectionId. Cannot use default connection.' },
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

    await connectDB();

    const operationId = uuidv4();
    let totalImported = 0;
    let totalErrors = 0;
    let nextCursor = cursor;
    const isInitialRequest = !cursor; // First page

    // Create sync operation record on first request
    if (isInitialRequest) {
      await SyncOperationModel.create({
        id: operationId,
        operationType: 'import',
        crmProvider,
        status: 'syncing',
        direction: 'import',
        triggeredBy: 'manual',
        customerId: auth.customerId,
        summary: {
          totalContacts: 0,
          newContacts: 0,
          updatedContacts: 0,
          deletedContacts: 0,
          erroredContacts: 0,
          conflictedContacts: 0,
          skippedContacts: 0,
        }
      });
    }

    try {
      const client = await getIntegrationClient(auth);

      console.log(`Importing contacts from ${crmProvider}`, {
        customerId: auth.customerId,
        connectionId: connectionId,
        cursor: nextCursor || 'first_page'
      });

      // Call Integration.app "Get Contacts" action with the real connection ID
      const actionResult = await client
        .connection(connectionId)
        .action('get-contacts')
        .run({
          input: {
            cursor: nextCursor,
          }
        });

      const contactsData = actionResult.output as GetContactsResponse;
      console.log(`Retrieved ${contactsData.records?.length || 0} contacts from ${crmProvider}`);

      if (contactsData.records && contactsData.records.length > 0) {
        // Process each contact
        for (const record of contactsData.records) {
          try {
            await processImportedContact(record, crmProvider, connectionId, auth.customerId);
            totalImported++;
          } catch (error) {
            console.error(`Failed to process contact ${record.id}:`, error);
            totalErrors++;
          }
        }
      }

      // Update operation summary
      if (isInitialRequest) {
        await SyncOperationModel.findOneAndUpdate(
          { id: operationId },
          {
            status: contactsData.hasMore ? 'syncing' : 'completed',
            summary: {
              totalContacts: totalImported,
              newContacts: totalImported,
              updatedContacts: 0,
              deletedContacts: 0,
              erroredContacts: totalErrors,
              conflictedContacts: 0,
              skippedContacts: 0,
            }
          }
        );
      }

      return NextResponse.json({
        operationId,
        message: `Imported ${totalImported} contacts from ${crmProvider}`,
        imported: totalImported,
        errors: totalErrors,
        hasMore: contactsData.hasMore,
        nextCursor: contactsData.cursor,
        crmProvider,
        connectionId: connectionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to import contacts:', error);
      
      if (isInitialRequest) {
        await SyncOperationModel.findOneAndUpdate(
          { id: operationId },
          {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        );
      }

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to import contacts',
          operationId,
          connectionId: connectionId
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in import contacts endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single imported contact record
 */
async function processImportedContact(
  record: any,
  crmProvider: CRMProvider,
  connectionId: string,
  customerId: string
): Promise<void> {
  const externalContactId = record.id;

  // Check if contact already exists
  const existingDataLink = await SyncDataLink.findOne({
    externalContactId,
    crmProvider,
    customerId
  });

  if (existingDataLink) {
    console.log(`Contact already exists: ${existingDataLink.localContactId}`);
    return;
  }

  // Convert to UniversalContact format
  const universalContact: UniversalContact = {
    id: uuidv4(),
    fullName: record.unifiedFields?.fullName || record.fields?.fullName || 
              `${record.rawFields?.firstname || ''} ${record.rawFields?.lastname || ''}`.trim() ||
              'Unknown Contact',
    firstName: record.unifiedFields?.firstName || record.rawFields?.firstname || '',
    lastName: record.unifiedFields?.lastName || record.rawFields?.lastname || '',
    primaryEmail: record.unifiedFields?.primaryEmail || record.rawFields?.email || '',
    emails: record.unifiedFields?.emails || 
            (record.rawFields?.email ? [{ value: record.rawFields.email }] : []),
    primaryPhone: record.unifiedFields?.primaryPhone || record.rawFields?.phone || 
                 record.rawFields?.mobilephone || '',
    phones: (() => {
      const phoneValue = record.rawFields?.phone || record.rawFields?.mobilephone;
      if (phoneValue && phoneValue.trim()) {
        return [{ value: phoneValue.trim() }];
      }
      return record.unifiedFields?.phones || [];
    })(),
    primaryAddress: record.unifiedFields?.primaryAddress || {
      full: record.rawFields?.address || '',
      city: record.rawFields?.city || '',
      state: record.rawFields?.state || '',
      country: record.rawFields?.country || '',
      zip: record.rawFields?.zip || ''
    },
    addresses: record.unifiedFields?.addresses || [],
    companyName: record.unifiedFields?.companyName || record.rawFields?.company || '',
    jobTitle: record.unifiedFields?.jobTitle || record.rawFields?.jobtitle || '',
    stage: record.unifiedFields?.stage || record.rawFields?.lifecyclestage || '',
    ownerId: record.unifiedFields?.ownerId || record.rawFields?.hubspot_owner_id || '',
    source: record.unifiedFields?.source || record.rawFields?.hs_analytics_source || '',
    customerId,
    createdTime: record.unifiedFields?.createdTime || record.rawFields?.createdate || 
                new Date().toISOString(),
    updatedTime: record.unifiedFields?.updatedTime || record.rawFields?.lastmodifieddate || 
                new Date().toISOString()
  };

  // Create contact in database
  const newContact = new Contact(universalContact);
  await newContact.save({ validateBeforeSave: false });

  // Create data link
  await SyncDataLink.create({
    id: uuidv4(),
    localContactId: newContact.id,
    externalContactId,
    crmProvider,
    connectionId,
    customerId,
    syncStatus: 'success',
    lastSyncAt: new Date()
  });

  console.log(`Created contact: ${newContact.id} for external ID: ${externalContactId}`);
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Import Contacts',
    description: 'Bulk import all contacts from external CRM using Integration.app Get Contacts action',
    method: 'POST',
    expectedPayload: {
      crmProvider: 'hubspot | pipedrive',
      connectionId: 'string (optional)',
      cursor: 'string (optional, for pagination)'
    }
  });
} 