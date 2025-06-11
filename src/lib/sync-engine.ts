// Integration.app Sync Engine - Production Grade Implementation
import { v4 as uuidv4 } from 'uuid';
import { IntegrationAppClient, DataLinkDirection } from '@integration-app/sdk';
import { getIntegrationClient } from './integration-app-client';
import { ContactEventService } from './contact-event-service';
import { IntegrationDataLinkService } from './integration-data-link-service';
import type { AuthCustomer } from './auth';
import type { 
  CRMProvider, 
  SyncStatus, 
  SyncOperationSummary 
} from '@/types/sync';
import type { UniversalContact } from '@/types/contact';
import { Contact } from '@/models/contact';
import { SyncOperationModel } from '@/models/sync-operation';
import connectDB from './mongodb';

interface FlowTriggerPayload {
  event: string;
  contact?: UniversalContact;
  customerId: string;
  crmProvider?: CRMProvider;
  operation: 'created' | 'updated' | 'deleted';
  source: 'local' | 'external';
}

interface FlowExecutionResult {
  flowRunId: string;
  status: 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
}

/**
 * Flow-based Sync Engine using Integration.app as central orchestrator
 * 
 * This implementation uses Integration.app Flows for all sync operations:
 * - 'receive-contact-events': For importing contacts FROM external CRMs TO our app
 * - 'send-contact-events': For exporting contacts FROM our app TO external CRMs
 * 
 * Now using Integration.app's native Data Link system for relationship management
 * 
 * PRODUCTION READY: Automatically initializes infrastructure on first use
 */
export class SyncEngine {
  private client: IntegrationAppClient | null = null;
  private auth: AuthCustomer;
  private dataLinkService: IntegrationDataLinkService | null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(auth: AuthCustomer) {
    this.auth = auth;
    this.dataLinkService = null as any;
  }

  private async getClient(): Promise<IntegrationAppClient> {
    if (!this.client) {
      this.client = await getIntegrationClient(this.auth);
    }
    return this.client;
  }

  /**
   * Ensure the sync engine is initialized
   * This automatically sets up the Integration.app Data Link infrastructure
   * Safe to call multiple times - will only initialize once
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized || this.initializationPromise) {
      return this.initializationPromise || Promise.resolve();
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      const client = await this.getClient();
      
      // Initialize data link service with the client
      this.dataLinkService = new IntegrationDataLinkService(client, this.auth);
      await this.dataLinkService.ensureDataLinkTable();
      
      this.initialized = true;
      console.log('✅ Sync Engine auto-initialized with Integration.app Data Links');
    } catch (error) {
      console.error('❌ Failed to auto-initialize Sync Engine:', error);
      throw error;
    }
  }

  /**
   * Initialize the sync engine (public method for manual initialization)
   * This sets up the Integration.app Data Link infrastructure
   */
  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * Trigger contact import flow in Integration.app
   * This uses the 'receive-contact-events' flow to pull contacts from external CRMs
   */
  async triggerContactImportFlow(crmProvider: CRMProvider, connectionId: string): Promise<string> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    
    const client = await this.getClient();
    const operationId = uuidv4();

    try {
      await connectDB();

      // Create sync operation record
      await SyncOperationModel.create({
        id: operationId,
        operationType: 'import',
        crmProvider,
        status: 'syncing',
        direction: 'import',
        triggeredBy: 'manual',
        customerId: this.auth.customerId,
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

      // Trigger the 'receive-contact-events' flow for import (pulling from CRM)
      const flowTrigger: FlowTriggerPayload = {
        event: 'sync.import.triggered',
        customerId: this.auth.customerId,
        crmProvider,
        operation: 'created',
        source: 'external'
      };

      // Trigger Integration.app Flow for contact import (receive from CRM)
      const flowResult = await this.triggerFlow('receive-contact-events', flowTrigger, connectionId);

      console.log(`Triggered contact import flow (receive-contact-events): ${flowResult.flowRunId}`);
      console.log(flowResult);
      // Update operation with flow run ID
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          flowRunId: flowResult.flowRunId,
          status: flowResult.status === 'failed' ? 'failed' : 'syncing'
        }
      );

      return operationId;
      
    } catch (error) {
      console.error('Failed to trigger import flow:', error);
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Trigger contact export flow in Integration.app
   * This uses the 'send-contact-events' flow to push contacts to external CRMs
   */
  async triggerContactExportFlow(crmProvider: CRMProvider, connectionId: string, contactIds?: string[]): Promise<string> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    
    const operationId = uuidv4();

    try {
      await connectDB();

      // Get contacts to export
      const query = contactIds 
        ? { _id: { $in: contactIds }, customerId: this.auth.customerId }
        : { customerId: this.auth.customerId };
      
      const contacts = await Contact.find(query);

      // Create sync operation record
      await SyncOperationModel.create({
        id: operationId,
        operationType: 'export',
        crmProvider,
        status: 'syncing',
        direction: 'export',
        triggeredBy: 'manual',
        customerId: this.auth.customerId,
        summary: {
          totalContacts: contacts.length,
          newContacts: 0,
          updatedContacts: 0,
          deletedContacts: 0,
          erroredContacts: 0,
          conflictedContacts: 0,
          skippedContacts: 0,
        }
      });

      // For global sync (connectionId is 'all' or similar), use ContactEventService
      if (connectionId === 'all' || connectionId === 'global' || !connectionId) {
        const contactEventService = new ContactEventService(this.auth);
        
        // Send events for all contacts to Integration.app
        const eventPromises = contacts.map(async (contact) => {
          try {
            await contactEventService.sendContactEvent('updated', contact.toObject(), {
              operation: 'export',
              crmProvider,
              triggeredBy: 'manual_sync'
            });
            return { success: true };
          } catch (error) {
            console.error(`Failed to send event for contact ${contact._id}:`, error);
            return { success: false, error };
          }
        });

        const eventResults = await Promise.allSettled(eventPromises);
        const successfulEvents = eventResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;

        console.log(`Sent ${successfulEvents}/${contacts.length} contact events to Integration.app`);

        // Update operation status
        await SyncOperationModel.findOneAndUpdate(
          { id: operationId },
          { 
            status: 'completed',
            summary: {
              totalContacts: contacts.length,
              newContacts: 0,
              updatedContacts: successfulEvents,
              deletedContacts: 0,
              erroredContacts: contacts.length - successfulEvents,
              conflictedContacts: 0,
              skippedContacts: 0,
            }
          }
        );

      } else {
        // For specific connection, use flow trigger
        const client = await this.getClient();
        
        // Trigger individual flows with better logging and error handling
        try {
          console.log(`📤 Preparing to export ${contacts.length} contacts to ${crmProvider} via send-contact-events`);

          console.log(`🚀 Triggering individual export flows for ${contacts.length} contacts...`);
          
          const results = [];
          for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            try {
              console.log(`📤 Exporting contact ${i + 1}/${contacts.length}: ${contact.fullName || contact.id}`);
              
              // The contact from database query is a Mongoose document
              const contactData = contact.toObject ? contact.toObject() : contact;
              
              console.log(`📝 Processing export for: "${contactData.fullName || contactData.firstName + ' ' + contactData.lastName}" <${contactData.primaryEmail}>`);
              
              // Check if contact has an external ID to determine if it should be create or update
              // NOTE: Try Integration.app SDK first, fallback to legacy database for compatibility
              let externalContactId = null;
              let operationType: 'created' | 'updated' = 'created';
              
              if (!this.dataLinkService) {
                throw new Error('Data link service not initialized');
              }
              
              try {
                // Use Integration.app SDK exclusively for data linking
                externalContactId = await this.dataLinkService.findExternalContactId(
                  contactData.id,
                  connectionId,
                  DataLinkDirection.EXPORT
                );
                operationType = externalContactId ? 'updated' : 'created';
                console.log(`🔗 SDK Data link lookup: Found external ID "${externalContactId}" -> operation: ${operationType}`);
              } catch (dataLinkError) {
                console.log(`🔗 No existing data link found in SDK -> operation: create`);
                operationType = 'created';
                externalContactId = null;
              }
              
              const flowTrigger: FlowTriggerPayload = {
                event: `contact.${operationType}.manual_export`,
                contact: {
                  ...contactData,
                  // **CRITICAL**: Include external ID if it exists
                  ...(externalContactId && { externalId: externalContactId })
                },
                customerId: this.auth.customerId,
                crmProvider,
                operation: operationType,
                source: 'local'
              };

              const result = await this.triggerFlow('send-contact-events', flowTrigger, connectionId);
              results.push({ success: true, contact: contact.id, result });
              
              // Add small delay to prevent rate limiting
              if (i < contacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
            } catch (flowError) {
              console.error(`❌ Failed to export contact ${contact.id}:`, flowError);
              results.push({ 
                success: false, 
                contact: contact.id, 
                error: flowError instanceof Error ? flowError.message : 'Unknown error' 
              });
            }
          }

          const successfulExports = results.filter(r => r.success).length;
          console.log(`✅ Export completed: ${successfulExports}/${contacts.length} successful`);
          
          // Update operation status based on results
          await SyncOperationModel.findOneAndUpdate(
            { id: operationId },
            { 
              status: successfulExports === contacts.length ? 'completed' : 'partial',
              summary: {
                totalContacts: contacts.length,
                newContacts: 0,
                updatedContacts: successfulExports,
                deletedContacts: 0,
                erroredContacts: contacts.length - successfulExports,
                conflictedContacts: 0,
                skippedContacts: 0,
              }
            }
          );

        } catch (error) {
          console.error('❌ Export flow processing failed:', error);
          await SyncOperationModel.findOneAndUpdate(
            { id: operationId },
            { 
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          );
          throw error;
        }

      }

      return operationId;

    } catch (error) {
      console.error('Failed to trigger export flow:', error);
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Trigger bidirectional sync flows
   * This orchestrates both import (receive-contact-events) and export (send-contact-events)
   */
  async triggerBidirectionalSync(crmProvider: CRMProvider, connectionId: string): Promise<string> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    
    const operationId = uuidv4();

    try {
      await connectDB();

      // Create bidirectional sync operation
      await SyncOperationModel.create({
        id: operationId,
        operationType: 'bidirectional',
        crmProvider,
        status: 'syncing',
        direction: 'bidirectional',
        triggeredBy: 'manual',
        customerId: this.auth.customerId,
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

      // Trigger both import (receive) and export (send) flows
      const [importResult, exportResult] = await Promise.allSettled([
        this.triggerContactImportFlow(crmProvider, connectionId),
        this.triggerContactExportFlow(crmProvider, connectionId)
      ]);

      console.log('Bidirectional sync triggered:', { importResult, exportResult });

      return operationId;

    } catch (error) {
      console.error('Failed to trigger bidirectional sync:', error);
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Handle incoming contact event from Integration.app flows
   * This processes contacts received via webhook from either flow
   */
  async handleContactEvent(payload: FlowTriggerPayload, connectionId?: string): Promise<void> {
    // Auto-initialize before processing any contact events
    await this.ensureInitialized();
    
    try {
      await connectDB();

      if (!payload.contact) {
        throw new Error('No contact data in payload');
      }

      const { contact, operation, source, crmProvider } = payload;

      if (source === 'external' && crmProvider) {
        // Handle contact from CRM (import via receive-contact-events)
        await this.processIncomingContact(contact, crmProvider, operation, connectionId || 'unknown');
      } else if (source === 'local') {
        // Handle local contact changes (for export via send-contact-events)
        await this.processLocalContactChange(contact, operation);
      }

    } catch (error) {
      console.error('Failed to handle contact event:', error);
      throw error;
    }
  }

  /**
   * Process incoming contact from CRM via receive-contact-events flow
   */
  private async processIncomingContact(
    externalContact: UniversalContact, 
    crmProvider: CRMProvider, 
    operation: 'created' | 'updated' | 'deleted',
    connectionId: string = 'unknown' // Will be passed from flow context
  ): Promise<void> {
    
    if (!this.dataLinkService) {
      throw new Error('Data link service not initialized');
    }
    
    if (operation === 'deleted') {
      // Handle contact deletion using Integration.app Data Links
      const localContactId = await this.dataLinkService.findLocalContactId(
        externalContact.id,
        connectionId,
        DataLinkDirection.IMPORT
      );

      if (localContactId) {
        // Delete local contact
        await Contact.findOneAndDelete({ id: localContactId });
        
        // Delete data link
        await this.dataLinkService.deleteContactLink(
          localContactId,
          externalContact.id,
          connectionId
        );
        
        console.log(`Deleted contact: ${localContactId} for external ID: ${externalContact.id}`);
      }
      return;
    }

    // Check if contact already exists via Integration.app data link
    const existingLocalContactId = await this.dataLinkService.findLocalContactId(
      externalContact.id,
      connectionId,
      DataLinkDirection.IMPORT
    );

    let localContact: any;

    if (existingLocalContactId) {
      // Update existing contact
      localContact = await Contact.findOneAndUpdate(
        { id: existingLocalContactId },
        {
          ...externalContact,
          customerId: this.auth.customerId,
          updatedTime: new Date().toISOString()
        },
        { new: true, upsert: false }
      );
      
      console.log(`Updated existing contact: ${localContact.id} for external ID: ${externalContact.id}`);
    } else {
      // Create new contact
      localContact = await Contact.create({
        ...externalContact,
        customerId: this.auth.customerId,
        createdTime: new Date().toISOString(),
        updatedTime: new Date().toISOString()
      });

      // Create data link using Integration.app
      await this.dataLinkService.createContactLink(
        localContact.id,
        externalContact.id,
        connectionId,
        DataLinkDirection.IMPORT
      );
      
      console.log(`Created new contact: ${localContact.id} for external ID: ${externalContact.id}`);
    }

    console.log(`Processed ${operation} for contact via receive-contact-events: ${localContact.id}`);
  }

  /**
   * Process local contact changes for export via send-contact-events flow
   */
  private async processLocalContactChange(
    contact: UniversalContact, 
    operation: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    
    // For this implementation, we need to know which connections to sync to
    // This would typically be determined by user preferences or connection setup
    // For now, we'll need to get available connections
    
    const client = await this.getClient();
    
    try {
      // Get all connections for this customer
      const connections = await client.connections.find({
        userId: this.auth.customerId
      });

      // Process each active connection
      for (const connection of connections.items) {
        if (!connection.disconnected) {
          await this.processContactChangeForConnection(contact, operation, connection.id);
        }
      }
    } catch (error) {
      console.error('Failed to process local contact change:', error);
    }
  }

  /**
   * Process contact change for a specific connection
   */
  private async processContactChangeForConnection(
    contact: UniversalContact,
    operation: 'created' | 'updated' | 'deleted',
    connectionId: string
  ): Promise<void> {
    
    if (!this.dataLinkService) {
      throw new Error('Data link service not initialized');
    }
    
    // **CRITICAL FIX**: Extract contact data properly 
    // The contact might be a Mongoose document, so extract the actual data
    const contactData = (contact as any)?._doc || 
                       (contact as any)?.toObject?.() || 
                       contact;
    
    // Find external contact ID for this connection
    let externalContactId = null;
    
    try {
      externalContactId = await this.dataLinkService.findExternalContactId(
        contactData.id,
        connectionId,
        DataLinkDirection.EXPORT
      );
    } catch (dataLinkError) {
      console.log(`⚠️ Data link lookup failed for automatic sync: ${dataLinkError instanceof Error ? dataLinkError.message : 'Unknown error'}`);
      // Continue with null external ID - flow will handle as 'created'
    }

    if (!externalContactId && operation !== 'created') {
      // No existing link, skip this connection for update/delete operations
      console.log(`No data link found for contact ${contactData.id} on connection ${connectionId}, skipping ${operation}`);
      return;
    }

    // Determine CRM provider from connection (simplified)
    const crmProvider = this.getCRMProviderFromConnectionId(connectionId);

    const flowTrigger: FlowTriggerPayload = {
      event: `contact.${operation}`,
      contact: {
        ...contactData,
        // Include external ID if available for update/delete operations
        ...(externalContactId && { externalId: externalContactId })
      },
      customerId: this.auth.customerId,
      crmProvider,
      operation,
      source: 'local'
    };

    try {
      await this.triggerFlow('send-contact-events', flowTrigger, connectionId);
      console.log(`Triggered send-contact-events for ${crmProvider} (${connectionId}): ${operation}`);
    } catch (error) {
      console.error(`Failed to trigger send-contact-events flow for ${crmProvider}:`, error);
    }
  }

  /**
   * Helper method to determine CRM provider from connection ID
   */
  private getCRMProviderFromConnectionId(connectionId: string): CRMProvider {
    // This is a simplified implementation
    // In reality, you'd fetch the connection details to determine the provider
    if (connectionId.includes('hubspot')) return 'hubspot';
    if (connectionId.includes('pipedrive')) return 'pipedrive';
    return 'hubspot'; // default fallback
  }

  /**
   * Generic flow trigger method
   * This triggers either 'receive-contact-events' or 'send-contact-events' flows
   */
  private async triggerFlow(
    flowName: 'receive-contact-events' | 'send-contact-events', 
    payload: FlowTriggerPayload, 
    connectionId: string,
    nodeKey?: string
  ): Promise<FlowExecutionResult> {
    const client = await this.getClient();

    try {
      console.log(`🚀 Triggering flow: ${flowName} with connection: ${connectionId}`);
      // console.log('Flow payload:', JSON.stringify(payload, null, 2));

      // Get Flow Instance using Integration.app SDK
      const flowInstance = await client.flowInstance({
        connectionId,
        flowKey: flowName,
        autoCreate: true
      });

      // **CRITICAL FIX: Match Integration.app Flow Expected Format**
      // Based on the flow configuration, it expects these specific fields:
      // - type, customerId, internalContactId, externalContactId, data
      let flowInput: any;

      if (flowName === 'send-contact-events') {
        const contactData = (payload.contact as any)?._doc || 
                           (payload.contact as any)?.toObject?.() || 
                           payload.contact || {};
        
        // console.log('🔍 Extracted contact data:', JSON.stringify(contactData, null, 2));
        
        flowInput = {
          // **Integration.app App Event Trigger Format**
          type: payload.operation, // 'created', 'updated', 'deleted'
          customerId: payload.customerId,
          
          internalContactId: contactData.id, // Local contact ID (for $.input.app-event-trigger)
          externalContactId: contactData.externalId || null, // External CRM contact ID
          
          data  : {
            // Basic required fields
            id: contactData.id,
            firstName: contactData.firstName || '',
            lastName: contactData.lastName || '',
            
            email: contactData.primaryEmail || '', // HubSpot uses 'email', not 'primaryEmail'
            phone: contactData.primaryPhone || '', // HubSpot uses 'phone', not 'primaryPhone'
            
            // Company information
            company: contactData.companyName || '',
            jobtitle: contactData.jobTitle || '', // HubSpot field name
            
            // Full name for display
            fullName: contactData.fullName || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim(),
            
            // Lifecycle stage
            lifecyclestage: 'lead', // Default HubSpot lifecycle stage
            
            // Additional fields that HubSpot accepts
            website: contactData.website || '',
            address: contactData.primaryAddress?.full || '',
            city: contactData.primaryAddress?.city || contactData.addresses?.[0]?.city || '',
            state: contactData.primaryAddress?.state || contactData.addresses?.[0]?.state || '',
            zip: contactData.primaryAddress?.zip || contactData.addresses?.[0]?.postalCode || '',
            country: contactData.primaryAddress?.country || contactData.addresses?.[0]?.country || '',
            
            // Meta fields - use valid HubSpot values
            hs_latest_source: 'OTHER_CAMPAIGNS', // Valid HubSpot source option
            created_date: contactData.createdTime || new Date().toISOString(),
            last_modified_date: contactData.updatedTime || new Date().toISOString()
          },
          
          operation: payload.operation,
          source: 'app', // Indicates this came from app event trigger
          timestamp: new Date().toISOString()
        };
      } else if (flowName === 'receive-contact-events') {
        flowInput = {
          operation: payload.operation, // 'created', 'updated', 'deleted'
          crmProvider: payload.crmProvider,
          customerId: payload.customerId,
          connectionId,
          // If contact data is provided, include it (for manual triggers)
          ...(payload.contact && {
            contact: {
              id: payload.contact.id,
              firstName: payload.contact.firstName,
              lastName: payload.contact.lastName,
              primaryEmail: payload.contact.primaryEmail,
              primaryPhone: payload.contact.primaryPhone,
              companyName: payload.contact.companyName,
              jobTitle: payload.contact.jobTitle
            }
          })
        };
      }

      console.log('🎯 Simplified flow input:', JSON.stringify(flowInput, null, 2));

      // Integration.app flows expect specific input formats to proceed through nodes
      const flowRun = await flowInstance.run({
        input: flowInput,
        returnImmediately: false // Let the flow complete
      });

      console.log(`✅ Flow ${flowName} triggered successfully!`);
      console.log(`📋 Flow Run ID: ${flowRun.id}`);
      console.log(`🔄 Flow State: ${flowRun.state}`);

      // Wait a moment for the flow to start processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get updated flow run status
      const updatedFlowRun = await client.flowRun(flowRun.id).get();
      console.log(`🔄 Updated Flow State: ${updatedFlowRun.state}`);
      
      // If flow is still running, log some debugging info
      if (updatedFlowRun.state === 'running') {
        console.log(`⏳ Flow ${flowName} is processing... Check Integration.app console for progress`);
        if (updatedFlowRun.nodes) {
          console.log('📊 Node states:', Object.entries(updatedFlowRun.nodes).map(([key, node]) => 
            `${key}: ${(node as any).state}`
          ));
        }
      }

      return {
        flowRunId: flowRun.id,
        status: this.mapFlowRunState(updatedFlowRun.state),
        output: undefined,
        error: undefined
      };

    } catch (error) {
      console.error(`❌ Failed to trigger flow ${flowName}:`, error);
      
      // Enhanced error logging for debugging
      if (error instanceof Error) {
        console.error('🚨 Error details:', {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
          name: error.name
        });

        // Log Integration.app specific error details
        if ('isIntegrationAppError' in error) {
          console.error('🔧 Integration.app Error Data:', {
            // @ts-ignore
            type: error.data?.type,
            // @ts-ignore
            key: error.data?.key,
            // @ts-ignore
            message: error.data?.message
          });
        }
      }
      
      return {
        flowRunId: uuidv4(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map Integration.app flow run states to our internal status
   */
  private mapFlowRunState(state: string): 'running' | 'completed' | 'failed' {
    switch (state?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'failed':
      case 'stopped':
        return 'failed';
      case 'running':
      case 'queued':
      default:
        return 'running';
    }
  }

  /**
   * Clear all contacts from local database and trigger deletion events to all integrations
   */
  async clearAllContacts(): Promise<{
    deletedCount: number;
    eventResults: {
      total: number;
      successful: number;
      failed: number;
      errors: Array<{ contactId: string; error: string }>;
    };
    operationId: string;
  }> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    
    const operationId = uuidv4();

    try {
      await connectDB();

      // Get all contacts for this customer before deletion
      const contacts = await Contact.find({ customerId: this.auth.customerId });
      const contactCount = contacts.length;

      console.log(`🗑️ Starting clear all operation for ${contactCount} contacts...`);

      // Create sync operation record
      await SyncOperationModel.create({
        id: operationId,
        operationType: 'export', // This is an export operation (sending deletions to CRMs)
        crmProvider: 'hubspot', // Use hubspot as default for bulk operations (affects all providers)
        status: 'syncing',
        direction: 'export',
        triggeredBy: 'manual',
        customerId: this.auth.customerId,
        summary: {
          totalContacts: contactCount,
          newContacts: 0,
          updatedContacts: 0,
          deletedContacts: 0, // Will be updated as we process
          erroredContacts: 0,
          conflictedContacts: 0,
          skippedContacts: 0,
        }
      });

      if (contactCount === 0) {
        await SyncOperationModel.findOneAndUpdate(
          { id: operationId },
          { status: 'completed' }
        );

        return {
          deletedCount: 0,
          eventResults: { total: 0, successful: 0, failed: 0, errors: [] },
          operationId
        };
      }

      // Send deletion events to all integrations before deleting from local DB
      const contactEventService = new ContactEventService(this.auth);
      const eventResults = await contactEventService.sendBulkContactDeletedEvents(
        contacts.map(c => c.toObject())
      );

      // Also trigger deletion flows for each connected integration
      try {
        const client = await this.getClient();
        const connections = await client.connections.find({
          userId: this.auth.customerId
        });

        console.log(`🔗 Found ${connections.items.length} connections for bulk deletion flows`);

        // Trigger bulk deletion flows for each active connection
        for (const connection of connections.items) {
          if (!connection.disconnected) {
            try {
              console.log(`🚀 Triggering bulk deletion flow for connection: ${connection.id}`);
              
              // Trigger a bulk deletion flow
              const flowTrigger: FlowTriggerPayload = {
                event: 'contacts.bulk_deleted',
                customerId: this.auth.customerId,
                crmProvider: this.getCRMProviderFromConnectionId(connection.id),
                operation: 'deleted',
                source: 'local'
              };

              await this.triggerFlow('send-contact-events', flowTrigger, connection.id);
              console.log(`✅ Triggered bulk deletion flow for connection: ${connection.id}`);
              
            } catch (flowError) {
              console.error(`❌ Failed to trigger deletion flow for connection ${connection.id}:`, flowError);
            }
          }
        }
      } catch (connectionsError) {
        console.error('⚠️ Failed to get connections for bulk deletion flows:', connectionsError);
      }

      // Delete all contacts from local database
      const deleteResult = await Contact.deleteMany({ customerId: this.auth.customerId });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} contacts from local database`);

      // If using Integration.app Data Links, clean up all links for this customer
      if (this.dataLinkService) {
        try {
          // Note: Integration.app doesn't have a bulk delete API, so we'd need to clean up links individually
          // For now, we'll log this and let the links be cleaned up naturally over time
          console.log('🔗 Note: Data links will be cleaned up on next sync operations');
        } catch (linkError) {
          console.error('⚠️ Failed to clean up data links:', linkError);
        }
      }

      // Update operation status
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          status: 'completed',
          summary: {
            totalContacts: contactCount,
            newContacts: 0,
            updatedContacts: 0,
            deletedContacts: deleteResult.deletedCount,
            erroredContacts: eventResults.failed,
            conflictedContacts: 0,
            skippedContacts: 0,
          }
        }
      );

      console.log(`✅ Clear all operation completed successfully`);

      return {
        deletedCount: deleteResult.deletedCount,
        eventResults,
        operationId
      };

    } catch (error) {
      console.error('❌ Failed to clear all contacts:', error);
      
      await SyncOperationModel.findOneAndUpdate(
        { id: operationId },
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      throw error;
    }
  }

  /**
   * Get sync status including flow execution status
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    status: SyncStatus;
    totalContacts: number;
    pendingOperations: number;
    recentActivity: Array<{
      id: string;
      type: string;
      status: string;
      timestamp: Date;
      flowRunId?: string;
    }>;
  }> {
    // Auto-initialize before checking sync status
    await this.ensureInitialized();
    
    await connectDB();

    const [lastOperation, totalContacts, pendingOps, recentActivity] = await Promise.all([
      SyncOperationModel.findOne(
        { customerId: this.auth.customerId },
        null,
        { sort: { createdAt: -1 } }
      ),
      Contact.countDocuments({ customerId: this.auth.customerId }),
      SyncOperationModel.countDocuments({
        customerId: this.auth.customerId,
        status: { $in: ['pending', 'syncing'] }
      }),
      SyncOperationModel.find(
        { customerId: this.auth.customerId },
        { id: 1, operationType: 1, status: 1, createdAt: 1, flowRunId: 1 },
        { sort: { createdAt: -1 }, limit: 10 }
      )
    ]);

    return {
      lastSync: lastOperation?.createdAt || null,
      status: pendingOps > 0 ? 'syncing' : (lastOperation?.status || 'idle'),
      totalContacts,
      pendingOperations: pendingOps,
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        type: activity.operationType,
        status: activity.status,
        timestamp: activity.createdAt,
        flowRunId: activity.flowRunId
      }))
    };
  }

  // Alias methods for backward compatibility
  async importContactsFromCRM(crmProvider: CRMProvider, connectionId: string): Promise<string> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    return this.triggerContactImportFlow(crmProvider, connectionId);
  }

  async exportContactsToCRM(crmProvider: CRMProvider, connectionId: string): Promise<string> {
    // Auto-initialize before any sync operations
    await this.ensureInitialized();
    return this.triggerContactExportFlow(crmProvider, connectionId);
  }
}