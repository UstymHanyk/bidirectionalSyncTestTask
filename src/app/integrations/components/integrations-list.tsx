"use client"

import { useIntegrationApp, useIntegrations } from "@integration-app/react"
import type { Integration as IntegrationAppIntegration } from "@integration-app/sdk"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Settings, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"

export function IntegrationList() {
  const [error, setError] = useState<string | null>(null)
  const [isCheckingConfig, setIsCheckingConfig] = useState(true)
  const integrationApp = useIntegrationApp()
  const { integrations, refresh } = useIntegrations()

  // Check if Integration.app is properly configured
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await fetch("/api/integration-token", {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || "Failed to connect to Integration.app")
        } else {
          setError(null)
        }
      } catch (err) {
        setError("Unable to connect to Integration.app service")
      } finally {
        setIsCheckingConfig(false)
      }
    }

    checkConfiguration()
  }, [])

  const handleConnect = async (integration: IntegrationAppIntegration) => {
    try {
      await integrationApp.integration(integration.key).openNewConnection()
      refresh()
    } catch (error) {
      console.error("Failed to connect:", error)
    }
  }

  const handleDisconnect = async (integration: IntegrationAppIntegration) => {
    if (!integration.connection?.id) return
    try {
      await integrationApp.connection(integration.connection.id).archive()
      refresh()
    } catch (error) {
      console.error("Failed to disconnect:", error)
    }
  }

  const handleRetry = () => {
    setIsCheckingConfig(true)
    setError(null)
    window.location.reload()
  }

  // Show loading state while checking configuration
  if (isCheckingConfig) {
    return (
      <div className="mt-8 flex items-center justify-center p-8">
        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Checking Integration.app configuration...</span>
        </div>
      </div>
    )
  }

  // Show error state if Integration.app is not configured
  if (error) {
    return (
      <div className="mt-8 space-y-6">
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Integration.app Configuration Error</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>{error}</p>
            <div className="text-sm text-red-700 dark:text-red-300">
              <p><strong>Common causes:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Missing INTEGRATION_APP_WORKSPACE_KEY environment variable</li>
                <li>Missing INTEGRATION_APP_WORKSPACE_SECRET environment variable</li>
                <li>Invalid or expired Integration.app credentials</li>
                <li>Network connectivity issues</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How to configure Integration.app
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <p>1. Create a <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">.env.local</code> file in your project root</p>
                <p>2. Add your Integration.app credentials:</p>
                <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-md font-mono text-xs mt-2">
                  <div>INTEGRATION_APP_WORKSPACE_KEY=your_workspace_key</div>
                  <div>INTEGRATION_APP_WORKSPACE_SECRET=your_workspace_secret</div>
                </div>
                <p>3. Restart your development server</p>
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://console.integration.app', '_blank')}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Integration.app Console
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state if no integrations are available
  if (!integrations || integrations.length === 0) {
    return (
      <div className="mt-8 text-center py-12">
        <div className="max-w-md mx-auto">
          <Settings className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No integrations available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your Integration.app workspace doesn't have any integrations configured yet.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.open('https://console.integration.app', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Configure Integrations
          </Button>
        </div>
      </div>
    )
  }

  // Show the normal integrations list
  return (
    <ul className="space-y-4 mt-8">
      {integrations.map((integration) => (
        <li
          key={integration.key}
          className="group flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="flex-shrink-0">
            {integration.logoUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={integration.logoUri}
                alt={`${integration.name} logo`}
                className="w-10 h-10 rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
                {integration.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {integration.name}
            </h3>
            {integration.connection && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Connected
              </p>
            )}
          </div>
          <Button
            onClick={() =>
              integration.connection
                ? handleDisconnect(integration)
                : handleConnect(integration)
            }
            variant={integration.connection ? "destructive" : "default"}
            size="sm"
          >
            {integration.connection ? "Disconnect" : "Connect"}
          </Button>
        </li>
      ))}
    </ul>
  )
}
