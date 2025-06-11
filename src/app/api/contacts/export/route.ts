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

    const { contactId, contactIds } = await request.json()

    console.log(`Starting contact export for customer ${auth.customerId}`)

    // Initialize sync engine
    const syncEngine = new SyncEngine(auth)

    // Get connected integrations
    const integrationClient = await getIntegrationClient(auth)
    const integrations = await integrationClient.integrations.find()
    
    // Handle pagination response
    const integrationsList = Array.isArray(integrations) ? integrations : 
      (integrations as IntegrationResponse).items || (integrations as IntegrationResponse).records || []

    // Determine which contacts to export
    let contactsToExport: string[] | undefined
    if (contactId) {
      contactsToExport = [contactId]
    } else if (contactIds && Array.isArray(contactIds)) {
      contactsToExport = contactIds
    }
    // If neither is provided, export all contacts (contactsToExport remains undefined)

    let totalExported = 0
    const results = []

    // Export to each connected CRM
    for (const integration of integrationsList) {
      if (integration.connection && ['hubspot', 'pipedrive'].includes(integration.key)) {
        try {
          const operationId = await syncEngine.exportContactsToCRM(
            integration.key as 'hubspot' | 'pipedrive',
            integration.connection.id,
          )

          results.push({
            crm: integration.name,
            operationId,
            status: 'success'
          })

          totalExported++
        } catch (error) {
          console.error(`Failed to export to ${integration.name}:`, error)
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
        exportedCount: 0,
        results: []
      })
    }

    const contactDescription = contactId ? '1 contact' : 
                               contactIds ? `${contactIds.length} contacts` : 
                               'all contacts'

    return NextResponse.json({
      success: true,
      exportedCount: totalExported,
      message: `Initiated export of ${contactDescription} to ${results.length} CRM system(s). Check sync status for progress.`,
      results
    })

  } catch (error) {
    console.error('Error during contact export:', error)
    return NextResponse.json(
      { error: 'Failed to export contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 