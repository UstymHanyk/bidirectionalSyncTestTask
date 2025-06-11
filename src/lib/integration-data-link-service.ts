import { IntegrationAppClient, DataLinkDirection } from '@integration-app/sdk';
import { AuthCustomer } from './auth';

export interface ContactLink {
  localContactId: string;
  externalContactId: string;
  connectionId: string;
  direction: DataLinkDirection;
  createdAt: Date;
  lastSyncAt: Date;
}

/**
 * Integration.app Data Links Service - Native SDK Implementation
 * 
 * This service uses Integration.app's native Data Links instead of our custom database.
 * Benefits:
 * - Reduces infrastructure complexity
 * - Leverages Integration.app's reliability
 * - Native bi-directional linking support
 * - Automatic conflict resolution
 * - Built-in data integrity
 */
export class IntegrationDataLinkService {
  private client: IntegrationAppClient;
  private auth: AuthCustomer;
  private dataLinkTableKey = 'contacts';

  constructor(client: IntegrationAppClient, auth: AuthCustomer) {
    this.client = client;
    this.auth = auth;
  }

  /**
   * Create a bidirectional data link between local and external contact
   */
  async createContactLink(
    localContactId: string,
    externalContactId: string,
    connectionId: string,
    direction: DataLinkDirection = DataLinkDirection.BOTH
  ): Promise<boolean> {
    try {
      console.log(`🔗 Creating data link: local=${localContactId} ↔ external=${externalContactId} (${direction})`);
      
      const dataLinkTableInstance = this.client.dataLinkTableInstance({
        dataLinkTableKey: this.dataLinkTableKey,
        connectionId,
        userId: this.auth.customerId,
        autoCreate: true
      });

      await dataLinkTableInstance.createLink({
        appRecordId: localContactId,
        externalRecordId: externalContactId,
        direction
      });

      console.log(`✅ Data link created successfully`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create data link:', error);
      return false;
    }
  }

  /**
   * Find external contact ID by local contact ID
   */
  async findExternalContactId(
    localContactId: string,
    connectionId: string,
    direction: DataLinkDirection = DataLinkDirection.EXPORT
  ): Promise<string | null> {
    try {
      const dataLinkTableInstance = this.client.dataLinkTableInstance({
        dataLinkTableKey: this.dataLinkTableKey,
        connectionId,
        userId: this.auth.customerId,
        autoCreate: true
      });

      const links = await dataLinkTableInstance.findLinks({
        appRecordId: localContactId,
        direction
      });

      if (links.items && links.items.length > 0) {
        console.log(`🔍 Found external ID: ${links.items[0].externalRecordId} for local contact ${localContactId}`);
        return links.items[0].externalRecordId;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to find external contact ID:', error);
      return null;
    }
  }

  /**
   * Find local contact ID by external contact ID
   */
  async findLocalContactId(
    externalContactId: string,
    connectionId: string,
    direction: DataLinkDirection = DataLinkDirection.IMPORT
  ): Promise<string | null> {
    try {
      const dataLinkTableInstance = this.client.dataLinkTableInstance({
        dataLinkTableKey: this.dataLinkTableKey,
        connectionId,
        userId: this.auth.customerId,
        autoCreate: true
      });

      const links = await dataLinkTableInstance.findLinks({
        externalRecordId: externalContactId,
        direction
      });

      if (links.items && links.items.length > 0) {
        console.log(`🔍 Found local ID: ${links.items[0].appRecordId} for external contact ${externalContactId}`);
        return links.items[0].appRecordId;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to find local contact ID:', error);
      return null;
    }
  }

  /**
   * Check if a contact is already linked
   */
  async isContactLinked(
    localContactId: string,
    connectionId: string,
    direction: DataLinkDirection = DataLinkDirection.BOTH
  ): Promise<boolean> {
    const externalId = await this.findExternalContactId(localContactId, connectionId, direction);
    return externalId !== null;
  }

  /**
   * Delete contact link
   */
  async deleteContactLink(
    localContactId: string,
    externalContactId: string,
    connectionId: string
  ): Promise<boolean> {
    try {
      const dataLinkTableInstance = this.client.dataLinkTableInstance({
        dataLinkTableKey: this.dataLinkTableKey,
        connectionId,
        userId: this.auth.customerId,
        autoCreate: true
      });

      await dataLinkTableInstance.deleteLink({
        appRecordId: localContactId,
        externalRecordId: externalContactId
      });

      console.log(`🗑️ Data link deleted: ${localContactId} ↔ ${externalContactId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete data link:', error);
      return false;
    }
  }

  /**
   * Get all links for a connection
   */
  async getConnectionLinks(connectionId: string): Promise<ContactLink[]> {
    try {
      const dataLinkTableInstance = this.client.dataLinkTableInstance({
        dataLinkTableKey: this.dataLinkTableKey,
        connectionId,
        userId: this.auth.customerId,
        autoCreate: true
      });

      const links = await dataLinkTableInstance.findLinks({});

      return links.items.map(link => ({
        localContactId: link.appRecordId,
        externalContactId: link.externalRecordId,
        connectionId: connectionId,
        direction: link.direction,
        createdAt: new Date(), // DataLink interface doesn't have createdAt/updatedAt
        lastSyncAt: new Date()
      }));
    } catch (error) {
      console.error('❌ Failed to get connection links:', error);
      return [];
    }
  }

  /**
   * Get linking statistics
   */
  async getLinkingStats(): Promise<{
    totalLinks: number;
    linksByConnection: Record<string, number>;
  }> {
    try {
      // Note: Since data link instances are connection-specific, 
      // we can't easily get all links across connections without knowing connection IDs
      // This is a limitation of the current SDK API
      return {
        totalLinks: 0,
        linksByConnection: {}
      };
    } catch (error) {
      console.error('❌ Failed to get linking stats:', error);
      return {
        totalLinks: 0,
        linksByConnection: {}
      };
    }
  }

  /**
   * Update an existing contact link with new external ID
   */
  async updateContactLink(
    localContactId: string,
    oldExternalContactId: string,
    newExternalContactId: string,
    connectionId: string
  ): Promise<boolean> {
    try {
      // Delete old link
      await this.deleteContactLink(localContactId, oldExternalContactId, connectionId);
      
      // Create new link
      return await this.createContactLink(
        localContactId, 
        newExternalContactId, 
        connectionId, 
        DataLinkDirection.BOTH
      );
    } catch (error) {
      console.error('❌ Failed to update contact link:', error);
      return false;
    }
  }

  /**
   * Ensure data link table is properly initialized
   */
  async ensureDataLinkTable(): Promise<boolean> {
    try {
      // Check if data link table exists
      const existingTables = await this.client.dataLinkTables.find();
      const existingTable = existingTables.items.find((table: any) => table.key === this.dataLinkTableKey);

      if (existingTable) {
        console.log(`✅ Data link table '${this.dataLinkTableKey}' already exists`);
        return true;
      }

      // Create new data link table
      const dataLinkTable = await this.client.dataLinkTables.create({
        key: this.dataLinkTableKey,
        name: 'Contact Sync Data Links'
      });

      console.log(`✅ Created data link table '${this.dataLinkTableKey}':`, dataLinkTable.id);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to ensure data link table (instances will auto-create):', error);
      // Don't throw - instances can still work without table creation
      return true;
    }
  }
} 