import { NextRequest, NextResponse } from 'next/server';
import { Contact } from '@/models/contact';
import { IntegrationDataLinkService } from '@/lib/integration-data-link-service';
import { getIntegrationClient } from '@/lib/integration-app-client';
import { DataLinkDirection } from '@integration-app/sdk';
import connectDB from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import type { UniversalContact } from '@/types/contact';
import type { CRMProvider } from '@/types/sync';
import { AuthCustomer } from '@/lib/auth';

// Function to normalize CRM provider name to match our enum
const normalizeCRMProvider = (provider: string): CRMProvider => {
  const normalized = provider.toLowerCase();
  if (normalized === 'hubspot') return 'hubspot';
  if (normalized === 'pipedrive') return 'pipedrive';
  return 'hubspot'; // Default fallback
};

// Helper function to safely convert values to strings, handling null/undefined
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

interface WebhookCreateContactPayload {
  contact?: UniversalContact;
  data?: {
    id: string;
    name?: string;
    uri?: string;
    createdTime?: string;
    updatedTime?: string;
    fields?: any;
    unifiedFields?: any;
    rawFields?: any;
  };
  externalContactId: string;
  customerId: string;
  crmProvider: string;
  connectionId: string;
}

/**
 * Webhook endpoint for Integration.app "Create Contact in my App" node
 * This is called from the receive-contact-events flow when a new contact is found in external CRM
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    let payload: WebhookCreateContactPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    console.log('Create contact webhook received (full payload):', JSON.stringify(payload, null, 2));
    console.log('Create contact webhook received:', {
      externalContactId: payload.externalContactId,
      connectionId: payload.connectionId,
      customerId: payload.customerId,
      hasContact: !!payload.contact,
      hasData: !!payload.data,
      payloadKeys: Object.keys(payload)
    });

    // Handle both old format (contact) and new format (data)
    let contactData: UniversalContact;
    
    if (payload.contact) {
      contactData = payload.contact;
    } else if (payload.data) {
      // Convert Integration.app data structure to UniversalContact
      const unifiedFields = payload.data.unifiedFields || {};
      const fields = payload.data.fields || {};
      const rawFields = payload.data.rawFields || {};
      
      // Merge all field sources for comprehensive mapping
      const allFields = { ...rawFields, ...fields, ...unifiedFields };
      
      console.log('Processing Integration.app data fields:', {
        hasUnifiedFields: !!payload.data.unifiedFields,
        hasFields: !!payload.data.fields,
        hasRawFields: !!payload.data.rawFields,
        allFieldsKeys: Object.keys(allFields)
      });
      
      contactData = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate local ID
        fullName: allFields.fullName || allFields.name || `${allFields.firstName || allFields.first_name || ''} ${allFields.lastName || allFields.last_name || ''}`.trim() || 'Unknown Contact',
        firstName: safeString(allFields.firstName || allFields.first_name),
        lastName: safeString(allFields.lastName || allFields.last_name),
        primaryEmail: safeString(allFields.primaryEmail || allFields.primary_email || allFields.email),
        emails: (() => {
          const emails = allFields.emails || [];
          const filteredEmails = emails.filter((email: any) => email && email.value && email.value.trim() !== '');
          // If no valid emails from array but we have a primary email, add it
          if (filteredEmails.length === 0 && (allFields.primaryEmail || allFields.email) && (allFields.primaryEmail || allFields.email).trim() !== '') {
            filteredEmails.push({value: (allFields.primaryEmail || allFields.email).trim(), type: 'primary'});
          }
          return filteredEmails;
        })(),
        primaryPhone: allFields.primaryPhone || allFields.phone || '',
        phones: (() => {
          const phones = allFields.phones || [];
          const filteredPhones = phones.filter((phone: any) => phone && phone.value && phone.value.trim() !== '');
          // If no valid phones from array but we have a primary phone, add it
          if (filteredPhones.length === 0 && (allFields.primaryPhone || allFields.phone) && (allFields.primaryPhone || allFields.phone).trim() !== '') {
            filteredPhones.push({value: (allFields.primaryPhone || allFields.phone).trim(), type: 'primary'});
          }
          return filteredPhones;
        })(),
        primaryAddress: {
          full: allFields.address || allFields.postal_address_formatted_address || '',
          city: allFields.city || allFields.postal_address_locality || '',
          state: allFields.state || allFields.postal_address_admin_area_level_1 || '',
          zip: allFields.zip || allFields.postal_address_postal_code || '',
          country: allFields.country || allFields.postal_address_country || ''
        },
        addresses: [],
        stage: allFields.stage || allFields.lifecyclestage || 'lead',
        companyName: allFields.companyName || allFields.company || allFields.org_name || '',
        companyId: allFields.companyId || allFields.company_id || allFields.org_id?.toString() || '',
        ownerId: allFields.ownerId?.toString() || allFields.owner_id?.toString() || '',
        jobTitle: allFields.jobTitle || allFields.jobtitle || allFields.job_title || '',
        source: 'Integration.app',
        createdTime: allFields.createdTime || allFields.created_date || allFields.add_time || payload.data.createdTime || new Date().toISOString(),
        createdBy: allFields.createdBy || allFields.owner_name || '',
        updatedTime: allFields.updatedTime || allFields.last_modified_date || allFields.update_time || payload.data.updatedTime || new Date().toISOString(),
        updatedBy: allFields.updatedBy || '',
        lastActivityTime: allFields.lastActivityTime || allFields.last_activity_date || null,
        customerId: payload.customerId,
        syncStatus: 'success'
      } as UniversalContact;
      
      console.log('Created contact data:', {
        id: contactData.id,
        fullName: contactData.fullName,
        primaryEmail: contactData.primaryEmail,
        primaryPhone: contactData.primaryPhone
      });
    } else {
      return NextResponse.json(
        { error: 'Missing required fields: contact or data field with contact information' },
        { status: 400 }
      );
    }

    // Validate required fields
    const missingFields = [];
    if (!payload.externalContactId) missingFields.push('externalContactId');
    if (!payload.connectionId) missingFields.push('connectionId');
    if (!payload.customerId) missingFields.push('customerId');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields validation failed:', {
        missingFields,
        externalContactId: payload.externalContactId,
        connectionId: payload.connectionId,
        customerId: payload.customerId,
        hasContact: !!payload.contact,
        hasData: !!payload.data,
        payloadKeys: Object.keys(payload)
      });
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          received: {
            externalContactId: !!payload.externalContactId,
            connectionId: !!payload.connectionId,
            customerId: !!payload.customerId,
            hasContact: !!payload.contact,
            hasData: !!payload.data
          }
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Initialize Integration.app client and data link service
    const auth: AuthCustomer = { 
      customerId: payload.customerId,
      customerName: payload.customerId // Use customerId as customerName fallback
    };
    const integrationClient = await getIntegrationClient(auth);
    const dataLinkService = new IntegrationDataLinkService(integrationClient, auth);

    // Check if contact already exists using Integration.app SDK
    const existingLocalContactId = await dataLinkService.findLocalContactId(
      payload.externalContactId,
      payload.connectionId,
      DataLinkDirection.IMPORT
    );

    if (existingLocalContactId) {
      console.log(`🔄 Contact already exists with local ID: ${existingLocalContactId}, updating...`);
      
      // Update existing contact
      const updatedContact = await Contact.findOneAndUpdate(
        { id: existingLocalContactId },
        {
          ...contactData,
          customerId: payload.customerId,
          updatedTime: new Date().toISOString()
        },
        { new: true }
      );

      if (!updatedContact) {
        throw new Error(`Failed to update contact with ID: ${existingLocalContactId}`);
      }

      console.log(`✅ Updated existing contact: ${updatedContact.id}`);
      
      return NextResponse.json({
        success: true,
        operation: 'update',
        contactId: updatedContact.id,
        externalContactId: payload.externalContactId,
        message: 'Contact updated successfully'
      });
    }

    // Create new contact
    const newContact = await Contact.create({
      ...contactData,
      customerId: payload.customerId,
      createdTime: new Date().toISOString(),
      updatedTime: new Date().toISOString()
    });

    console.log(`📝 Created new contact: ${newContact.id}`);

    // Create data link using Integration.app SDK
    const linkCreated = await dataLinkService.createContactLink(
      newContact.id,
      payload.externalContactId,
      payload.connectionId,
      DataLinkDirection.IMPORT
    );

    if (!linkCreated) {
      console.warn(`⚠️ Failed to create data link for contact ${newContact.id}`);
    }

    console.log(`✅ Created contact: ${newContact.id} for external ID: ${payload.externalContactId} from ${payload.crmProvider}`);

    return NextResponse.json({
      success: true,
      operation: 'created',
      contactId: newContact.id,
      externalContactId: payload.externalContactId,
      message: 'Contact created successfully'
    });

  } catch (error) {
    console.error('❌ Create contact webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create contact',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Create Contact Webhook',
    description: 'Webhook for Integration.app receive-contact-events flow to create new contacts',
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