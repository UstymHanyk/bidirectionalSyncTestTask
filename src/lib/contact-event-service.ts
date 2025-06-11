import type { AuthCustomer } from './auth';
import type { UniversalContact } from '@/types/contact';

export type ContactEventType = 'created' | 'updated' | 'deleted';

export interface ContactEvent {
  type: ContactEventType;
  data: UniversalContact;
  customerId: string;
  timestamp: string;
}

/**
 * Service for sending contact events to Integration.app
 * This triggers the "Send Contact Events" flow with App Event Trigger
 */
export class ContactEventService {
  private auth: AuthCustomer;

  constructor(auth: AuthCustomer) {
    this.auth = auth;
  }

  /**
   * Send a contact event to Integration.app
   * This will trigger the "Send Contact Events" flow via webhook
   */
  async sendContactEvent(
    type: ContactEventType,
    contact: UniversalContact,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const eventPayload: ContactEvent = {
        type,
        data:contact,
        customerId: this.auth.customerId,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      // For now, we'll use a simple approach until we configure Integration.app webhook endpoints
      // In the actual implementation, you would send this to Integration.app's webhook endpoint
      const webhookUrl = process.env.INTEGRATION_APP_WEBHOOK_URL;
      
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Event-Type': 'Contact Event',
          },
          body: JSON.stringify(eventPayload)
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status: ${response.status}`);
        }

        console.log(`Sent ${type} event for contact ${contact.id} to Integration.app via webhook`);
      } else {
        console.log(`Would send ${type} event for contact ${contact.id} (webhook URL not configured)`);
      }

    } catch (error) {
      console.error(`Failed to send ${type} event for contact ${contact.id}:`, error);
      // Don't throw error to avoid disrupting main contact operations
    }
  }

  /**
   * Send contact created event
   */
  async sendContactCreatedEvent(contact: UniversalContact): Promise<void> {
    await this.sendContactEvent('created', contact);
  }

  /**
   * Send contact updated event
   */
  async sendContactUpdatedEvent(contact: UniversalContact, changes?: Record<string, any>): Promise<void> {
    await this.sendContactEvent('updated', contact, { changes });
  }

  /**
   * Send contact deleted event
   */
  async sendContactDeletedEvent(contact: UniversalContact): Promise<void> {
    await this.sendContactEvent('deleted', contact);
  }

  /**
   * Send bulk contact deleted events for clearing all contacts
   */
  async sendBulkContactDeletedEvents(contacts: UniversalContact[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ contactId: string; error: string }>;
  }> {
    console.log(`Sending bulk deletion events for ${contacts.length} contacts...`);
    
    const results = {
      total: contacts.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ contactId: string; error: string }>
    };

    // Send deletion events in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (contact) => {
        try {
          await this.sendContactDeletedEvent(contact);
          results.successful++;
          console.log(`✅ Sent deletion event for contact: ${contact.fullName || contact.id}`);
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ contactId: contact.id, error: errorMessage });
          console.error(`❌ Failed to send deletion event for contact ${contact.id}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add small delay between batches to prevent rate limiting
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Bulk deletion events completed: ${results.successful}/${results.total} successful`);
    return results;
  }
}

/**
 * Helper function to create ContactEventService instance
 */
export function createContactEventService(auth: AuthCustomer): ContactEventService {
  return new ContactEventService(auth);
} 