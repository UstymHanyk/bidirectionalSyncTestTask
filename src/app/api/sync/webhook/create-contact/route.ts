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

interface WebhookCreateContactPayload {
  contact: UniversalContact;
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
    const payload: WebhookCreateContactPayload = await req.json();
    console.log('Create contact webhook received:', {
      externalContactId: payload.externalContactId,
      connectionId: payload.connectionId,
      customerId: payload.customerId,
      hasData: !!payload.contact
    });

    if (!payload.contact || !payload.externalContactId || !payload.connectionId || !payload.customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: contact, externalContactId, connectionId, customerId' },
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
          ...payload.contact,
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
      ...payload.contact,
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