import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getIntegrationClient } from '@/lib/integration-app-client';

interface Connection {
  id: string;
  name: string;
  integrationName: string;
  status: string;
  isActive: boolean;
  crmProvider: string;
}

/**
 * Get available Integration.app connections for the customer
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to get real connections from Integration.app
    let realConnections: Connection[] = [];
    try {
      const client = await getIntegrationClient(auth);
      
      // Try different approaches to get connections
      console.log('Attempting to discover Integration.app connections...');
      
      // Method 1: Try to get connections through the client
      // Note: This might not work depending on the SDK version
      
      // Method 2: Use environment variables if available
      const envConnections: Connection[] = [];
      
      if (process.env.HUBSPOT_CONNECTION_ID) {
        envConnections.push({
          id: process.env.HUBSPOT_CONNECTION_ID,
          name: 'HubSpot CRM (from env)',
          integrationName: 'HubSpot',
          status: 'configured',
          isActive: true,
          crmProvider: 'hubspot'
        });
      }
      
      if (process.env.PIPEDRIVE_CONNECTION_ID) {
        envConnections.push({
          id: process.env.PIPEDRIVE_CONNECTION_ID,
          name: 'Pipedrive CRM (from env)',
          integrationName: 'Pipedrive',
          status: 'configured',
          isActive: true,
          crmProvider: 'pipedrive'
        });
      }
      
      realConnections = envConnections;
      
    } catch (clientError) {
      console.error('Could not fetch connections from Integration.app:', clientError);
    }

    // If no real connections found, provide instructions
    if (realConnections.length === 0) {
      return NextResponse.json({
        connections: [],
        message: 'No connections configured',
        instructions: {
          step1: 'Set environment variables HUBSPOT_CONNECTION_ID and/or PIPEDRIVE_CONNECTION_ID',
          step2: 'Connection IDs can be found in Integration.app webhook logs or console',
          step3: 'Look for connectionId values in webhook payloads',
          example_webhook_log: {
            connectionId: "68473cb1e03f400de48c70e9",
            note: "This is what you should set as HUBSPOT_CONNECTION_ID"
          }
        },
        debug: {
          env_hubspot: process.env.HUBSPOT_CONNECTION_ID ? 'SET' : 'NOT_SET',
          env_pipedrive: process.env.PIPEDRIVE_CONNECTION_ID ? 'SET' : 'NOT_SET'
        }
      });
    }

    return NextResponse.json({
      connections: realConnections,
      debug: {
        total_found: realConnections.length,
        sources: realConnections.map(c => ({ id: c.id.substring(0, 8) + '...', source: 'environment' }))
      }
    });

  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch connections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 