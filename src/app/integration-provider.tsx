"use client"

import { IntegrationAppProvider } from "@integration-app/react"
import { getAuthHeaders } from "./auth-provider"

export function IntegrationProvider({
  children,
}: {
  children: React.ReactNode
}) {

  const fetchToken = async () => {
    try {
      const response = await fetch("/api/integration-token", {
        headers: getAuthHeaders(),
      })
      
      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || "Failed to fetch integration token"
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.token
    } catch (error) {
      console.error("Integration token fetch failed:", error)
      // Re-throw to let Integration.app handle it
      throw error
    }
  }

  return (
    <IntegrationAppProvider fetchToken={fetchToken}>
      {children}
    </IntegrationAppProvider>
  )
}
