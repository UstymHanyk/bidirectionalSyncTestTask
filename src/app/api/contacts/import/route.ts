import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/server-auth'
import { SyncEngine } from '@/lib/sync-engine'
import { getIntegrationClient } from '@/lib/integration-app-client'

interface IntegrationResponse {
  items?: Array<{
    name: string;
    key: string;
    connection?: { id: string };
  }>;
  records?: Array<{
    name: string;
    key: string;
    connection?: { id: string };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request)
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`Starting contact import for customer ${auth.customerId}`)

    // Initialize sync engine
    const syncEngine = new SyncEngine(auth)

    // Get connected integrations
    const integrationClient = await getIntegrationClient(auth)
    const integrations = await integrationClient.integrations.find()
    
    // Handle pagination response
    const integrationsList = Array.isArray(integrations) ? integrations : 
      (integrations as IntegrationResponse).items || (integrations as IntegrationResponse).records || []

    let totalImported = 0
    const results = []

    // Import from each connected CRM
    for (const integration of integrationsList) {
      if (integration.connection && ['hubspot', 'pipedrive'].includes(integration.key)) {
        try {
          const operationId = await syncEngine.importContactsFromCRM(
            integration.key as 'hubspot' | 'pipedrive',
            integration.connection.id
          )

          results.push({
            crm: integration.name,
            operationId,
            status: 'success'
          })

          totalImported++
        } catch (error) {
          console.error(`Failed to import from ${integration.name}:`, error)
          results.push({
            crm: integration.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    if (results.length === 0) {
      // No integrations connected, provide helpful message
      return NextResponse.json({
        success: false,
        message: 'No CRM integrations connected. Please connect HubSpot or Pipedrive integrations first.',
        totalImported: 0,
        results: []
      })
    }

    return NextResponse.json({
      success: true,
      totalImported,
      message: `Initiated import from ${results.length} CRM system(s). Check sync status for progress.`,
      results
    })

  } catch (error) {
    console.error('Error during contact import:', error)
    return NextResponse.json(
      { error: 'Failed to import contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

 