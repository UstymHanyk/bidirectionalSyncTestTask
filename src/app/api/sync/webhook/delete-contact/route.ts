import { NextRequest, NextResponse } from 'next/server';
import { Contact } from '@/models/contact';
import { IntegrationDataLinkService } from '@/lib/integration-data-link-service';
import { getIntegrationClient } from '@/lib/integration-app-client';
import { DataLinkDirection } from '@integration-app/sdk';
import connectDB from '@/lib/mongodb';
import type { CRMProvider } from '@/types/sync';
import { AuthCustomer } from '@/lib/auth';

// Function to normalize CRM provider name to match our enum
const normalizeCRMProvider = (provider: string): CRMProvider => {
  const normalized = provider.toLowerCase();
  if (normalized === 'hubspot') return 'hubspot';
  if (normalized === 'pipedrive') return 'pipedrive';
  return 'hubspot'; // Default fallback
};

interface DeleteContactWebhookPayload {
  externalContactId: string;
  connectionId: string;
  customerId?: string;
  crmProvider?: string; // Change to string since Integration.app sends "HubSpot"
}

/**
 * Webhook endpoint for Integration.app "Delete Contact in my App" node
 * This is called from the receive-contact-events flow when a contact is deleted in external CRM
 */
export async function POST(request: NextRequest) {
  try {
    const payload: DeleteContactWebhookPayload = await request.json();
    console.log('Delete contact webhook payload:', JSON.stringify(payload, null, 2));
    
    const { externalContactId, connectionId } = payload;
    
    console.log('Delete contact webhook received:', {
      externalContactId,
      connectionId
    });

    // Validate required fields
    if (!externalContactId || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: externalContactId, connectionId' },
        { status: 400 }
      );
    }

    // Determine CRM provider - normalize to lowercase
    let crmProvider: CRMProvider = 'hubspot'; // Default
    if (payload.crmProvider) crmProvider = normalizeCRMProvider(payload.crmProvider);
    
    const customerId = payload.customerId || 'default-customer';

    await connectDB();

    // Initialize Integration.app client and data link service
    const auth: AuthCustomer = { 
      customerId,
      customerName: customerId // Use customerId as customerName fallback
    };
    const integrationClient = await getIntegrationClient(auth);
    const dataLinkService = new IntegrationDataLinkService(integrationClient, auth);

    // Find the local contact ID using Integration.app SDK
    const localContactId = await dataLinkService.findLocalContactId(
      externalContactId,
      connectionId,
      DataLinkDirection.IMPORT
    );

    if (!localContactId) {
      console.log(`No data link found for external contact ID: ${externalContactId}`);
      return NextResponse.json({
        message: 'Contact not found',
        externalContactId,
        crmProvider
      });
    }

    // Delete the contact from our database
    const deletedContact = await Contact.findOneAndDelete({ id: localContactId });

    // Delete the data link using Integration.app SDK
    await dataLinkService.deleteContactLink(
      localContactId,
      externalContactId,
      connectionId
    );

    if (!deletedContact) {
      console.log(`Contact not found for local ID: ${localContactId}`);
      return NextResponse.json({
        message: 'Contact already deleted or not found',
        localContactId,
        externalContactId,
        crmProvider
      });
    }

    console.log(`Deleted contact: ${deletedContact.id} for external ID: ${externalContactId} from ${crmProvider}`);

    return NextResponse.json({
      message: 'Contact deleted successfully',
      localContactId: deletedContact.id,
      externalContactId,
      crmProvider,
      deletedContact: {
        id: deletedContact.id,
        fullName: deletedContact.fullName,
        primaryEmail: deletedContact.primaryEmail
      }
    });

  } catch (error) {
    console.error('Error deleting contact via webhook:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Delete Contact Webhook Endpoint',
    method: 'POST',
    description: 'Receives contact deletion events from Integration.app flows'
  });
} 