import { NextRequest, NextResponse } from 'next/server';
import { Contact } from '@/models/contact';
import { IntegrationDataLinkService } from '@/lib/integration-data-link-service';
import { getIntegrationClient } from '@/lib/integration-app-client';
import { DataLinkDirection } from '@integration-app/sdk';
import connectDB from '@/lib/mongodb';
import type { UniversalContact } from '@/types/contact';
import type { CRMProvider } from '@/types/sync';
import { v4 as uuidv4 } from 'uuid';
import { AuthCustomer } from '@/lib/auth';

// Function to normalize CRM provider name to match our enum
const normalizeCRMProvider = (provider: string): CRMProvider => {
  const normalized = provider.toLowerCase();
  if (normalized === 'hubspot') return 'hubspot';
  if (normalized === 'pipedrive') return 'pipedrive';
  return 'hubspot'; // Default fallback
};

interface IntegrationAppWebhookPayload {
  externalContactId: string;
  data: {
    id: string;
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    companyName?: string;
    createdTime?: string;
    updatedTime?: string;
    fields?: any;
    unifiedFields?: any;
    rawFields?: any;
  };
  connectionId: string;
  // These might not be present in the payload
  customerId?: string;
  crmProvider?: string; // Change to string since Integration.app sends "HubSpot"
}

/**
 * Webhook endpoint for Integration.app "Update Contact in my App" node
 * This is called from the receive-contact-events flow when a contact is updated in external CRM
 */
export async function POST(request: NextRequest) {
  try {
    const payload: IntegrationAppWebhookPayload = await request.json();
    console.log('Full webhook payload:', JSON.stringify(payload, null, 2));
    
    // Extract basic info
    const externalContactId = payload.externalContactId || payload.data?.id;
    const connectionId = payload.connectionId;
    
    console.log('Update contact webhook received:', {
      externalContactId,
      connectionId,
      hasData: !!payload.data
    });

    // Validate required fields
    if (!externalContactId || !payload.data || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: externalContactId, data, connectionId' },
        { status: 400 }
      );
    }

    // Try to determine CRM provider from connection context or data structure
    let crmProvider: CRMProvider = 'hubspot'; // Default assumption
    let customerId = 'default-customer'; // Default for now
    
    // Try to extract CRM provider from data patterns
    if (payload.data.rawFields) {
      // HubSpot typically has fields like hubspot_owner_id, hs_object_id, etc.
      if (payload.data.rawFields.hubspot_owner_id || payload.data.rawFields.hs_object_id) {
        crmProvider = 'hubspot';
      }
      // Add Pipedrive detection patterns if needed
    }
    
    // Use provided values if available, normalize to lowercase
    if (payload.crmProvider) crmProvider = normalizeCRMProvider(payload.crmProvider);
    if (payload.customerId) customerId = payload.customerId;

    await connectDB();

    // Initialize Integration.app client and data link service
    const auth: AuthCustomer = { customerId, customerName: null };
    const integrationClient = await getIntegrationClient(auth);
    const dataLinkService = new IntegrationDataLinkService(integrationClient, auth);

    // 🔍 Enhanced Data Link Lookup using Integration.app SDK
    console.log('🔍 Searching for existing data link with criteria:', {
      externalContactId,
      connectionId,
      crmProvider
    });

    // Primary search: find local contact ID using Integration.app SDK
    const localContactId = await dataLinkService.findLocalContactId(
      externalContactId,
      connectionId,
      DataLinkDirection.IMPORT
    );

    let contact: any;

    if (!localContactId) {
      console.log(`No existing data link found for external ID: ${externalContactId}, creating new contact instead`);
      
      // Convert Integration.app data to UniversalContact format
      const universalContact: UniversalContact = {
        id: uuidv4(), // Generate our own ID
        fullName: payload.data.fullName || payload.data.name || 
                  `${payload.data.firstName || ''} ${payload.data.lastName || ''}`.trim() ||
                  'Unknown Contact',
        firstName: payload.data.firstName || payload.data.unifiedFields?.firstName || '',
        lastName: payload.data.lastName || payload.data.unifiedFields?.lastName || '',
        primaryEmail: payload.data.primaryEmail || payload.data.unifiedFields?.primaryEmail || 
                     payload.data.rawFields?.email || '',
        emails: payload.data.unifiedFields?.emails || 
                (payload.data.rawFields?.email ? [{ value: payload.data.rawFields.email }] : []),
        primaryPhone: payload.data.primaryPhone || payload.data.unifiedFields?.primaryPhone || 
                     payload.data.rawFields?.phone || payload.data.rawFields?.mobilephone || '',
        phones: (() => {
          const phoneValue = payload.data.rawFields?.phone || payload.data.rawFields?.mobilephone;
          if (phoneValue && phoneValue.trim()) {
            return [{ value: phoneValue.trim() }];
          }
          return payload.data.unifiedFields?.phones || [];
        })(),
        primaryAddress: payload.data.unifiedFields?.primaryAddress || {
          full: payload.data.rawFields?.address || '',
          city: payload.data.rawFields?.city || '',
          state: payload.data.rawFields?.state || '',
          country: payload.data.rawFields?.country || '',
          zip: payload.data.rawFields?.zip || ''
        },
        addresses: payload.data.unifiedFields?.addresses || [],
        companyName: payload.data.companyName || payload.data.unifiedFields?.companyName || 
                    payload.data.rawFields?.company || '',
        jobTitle: payload.data.unifiedFields?.jobTitle || payload.data.rawFields?.jobtitle || '',
        stage: payload.data.unifiedFields?.stage || payload.data.rawFields?.lifecyclestage || '',
        ownerId: payload.data.unifiedFields?.ownerId || payload.data.rawFields?.hubspot_owner_id || '',
        source: payload.data.unifiedFields?.source || payload.data.rawFields?.hs_analytics_source || '',
        customerId,
        createdTime: payload.data.createdTime || payload.data.unifiedFields?.createdTime || 
                    payload.data.rawFields?.createdate || new Date().toISOString(),
        updatedTime: payload.data.updatedTime || payload.data.unifiedFields?.updatedTime || 
                    payload.data.rawFields?.lastmodifieddate || new Date().toISOString()
      };

      // Create new contact in our database
      contact = await Contact.create(universalContact);

      // Create data link using Integration.app SDK
      const linkCreated = await dataLinkService.createContactLink(
        contact.id,
        externalContactId,
        connectionId,
        DataLinkDirection.IMPORT
      );

      if (!linkCreated) {
        console.warn(`⚠️ Failed to create data link for contact ${contact.id}`);
      }

      console.log(`✅ Created new contact: ${contact.id} for external ID: ${externalContactId} from ${crmProvider}`);

      return NextResponse.json({
        success: true,
        operation: 'create',
        localContactId: contact.id,
        externalContactId,
        message: 'Contact created successfully (was update request but no existing link found)'
      });
    }

    // Contact exists, proceed with update
    console.log(`✅ Found existing contact with local ID: ${localContactId}`);

    // Prepare update data - only include fields that should be updated
    const fieldsToUpdate = [
      'emails', 'phones', 'primaryAddress', 'addresses', 
      'stage', 'source', 'updatedTime'
    ];

    const updateData: Partial<UniversalContact> = {};

    // Safely extract and process contact data
    const contactData = payload.data;
    
    // Update specific fields
    if (contactData.unifiedFields?.emails || contactData.rawFields?.email) {
      updateData.emails = contactData.unifiedFields?.emails || 
                         (contactData.rawFields?.email ? [{ value: contactData.rawFields.email }] : []);
    }

    if (contactData.unifiedFields?.phones || contactData.rawFields?.phone || contactData.rawFields?.mobilephone) {
      const phoneValue = contactData.rawFields?.phone || contactData.rawFields?.mobilephone;
      updateData.phones = contactData.unifiedFields?.phones ||
                         (phoneValue && phoneValue.trim() ? [{ value: phoneValue.trim() }] : []);
    }

    if (contactData.unifiedFields?.primaryAddress || contactData.rawFields?.address) {
      updateData.primaryAddress = contactData.unifiedFields?.primaryAddress || {
        full: contactData.rawFields?.address || '',
        city: contactData.rawFields?.city || '',
        state: contactData.rawFields?.state || '',
        country: contactData.rawFields?.country || '',
        zip: contactData.rawFields?.zip || ''
      };
    }

    if (contactData.unifiedFields?.addresses) {
      updateData.addresses = contactData.unifiedFields.addresses;
    }

    if (contactData.unifiedFields?.stage || contactData.rawFields?.lifecyclestage) {
      updateData.stage = contactData.unifiedFields?.stage || contactData.rawFields?.lifecyclestage || '';
    }

    if (contactData.unifiedFields?.source || contactData.rawFields?.hs_analytics_source) {
      updateData.source = contactData.unifiedFields?.source || contactData.rawFields?.hs_analytics_source || '';
    }

    // Always update the updatedTime
    updateData.updatedTime = contactData.updatedTime || contactData.unifiedFields?.updatedTime || 
                            contactData.rawFields?.lastmodifieddate || new Date().toISOString();

    console.log('📝 About to update contact with filtered data:', {
      localContactId,
      fieldsToUpdate,
      updateDataSample: {
        fullName: updateData.fullName,
        primaryEmail: updateData.primaryEmail,
        updatedTime: updateData.updatedTime
      }
    });

    // Log contact state before update
    const contactBeforeUpdate = await Contact.findOne({ id: localContactId }).select('id fullName primaryEmail updatedTime');
    console.log('📊 Contact state before update:', {
      id: contactBeforeUpdate?.id,
      fullName: contactBeforeUpdate?.fullName,
      primaryEmail: contactBeforeUpdate?.primaryEmail,
      updatedTime: contactBeforeUpdate?.updatedTime
    });

    // Update the contact
    contact = await Contact.findOneAndUpdate(
      { id: localContactId },
      updateData,
      { new: true, upsert: false }
    );

    if (!contact) {
      throw new Error(`Contact not found for local ID: ${localContactId}`);
    }

    // Log contact state after update
    console.log('📊 Contact state after update:', {
      id: contact.id,
      fullName: contact.fullName,
      primaryEmail: contact.primaryEmail,
      updatedTime: contact.updatedTime
    });

    // Check which fields actually changed
    const changedFields = Object.keys(updateData).filter(field => {
      const oldValue = contactBeforeUpdate?.[field as keyof typeof contactBeforeUpdate];
      const newValue = contact[field as keyof typeof contact];
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    });

    console.log('🔄 Actual fields changed:', changedFields.length > 0 ? changedFields : 'None');

    console.log(`✅ Updated contact: ${contact.id} for external ID: ${externalContactId} from ${crmProvider}`);

    return NextResponse.json({
      success: true,
      operation: 'update',
      localContactId: contact.id,
      externalContactId,
      fieldsUpdated: changedFields,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('❌ Update contact webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update contact',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Update Contact Webhook',
    description: 'Webhook for Integration.app receive-contact-events flow to update existing contacts',
    method: 'POST',
    expectedPayload: {
      externalContactId: 'string',
      data: 'Contact data object with fields/unifiedFields/rawFields',
      connectionId: 'string',
      customerId: 'string (optional)',
      crmProvider: 'hubspot | pipedrive (optional, will be auto-detected)'
    }
  });
} 