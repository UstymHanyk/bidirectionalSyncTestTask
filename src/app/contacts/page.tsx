"use client"

import { ContactsTable } from "./components/contacts-table"
import { ContactModal } from "./components/contact-modal"
import { Button } from "@/components/ui/button"
import { useContacts } from "@/hooks/use-contacts"
import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  UserPlus, 
  Upload, 
  AlertCircle, 
  Activity,
  TrendingUp,
  Database,
  Filter,
  Search
} from "lucide-react"
import { toast } from "sonner"
import { SyncDashboard } from "./components/sync-dashboard"
import { Input } from "@/components/ui/input"
import { UniversalContact } from "@/types/contact"
import { getStoredAuth, AuthCustomer } from "@/lib/auth"

export default function ContactsPage() {
  const { contacts, isLoading, isError, createContact, updateContact, deleteContact } = useContacts()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingContact, setEditingContact] = useState<UniversalContact | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState<"contacts" | "sync">("contacts")
  const [auth, setAuth] = useState<AuthCustomer | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const authData = getStoredAuth()
    setAuth(authData)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts

    const term = searchTerm.toLowerCase()
    return contacts.filter(contact => 
      contact.fullName?.toLowerCase().includes(term) ||
      contact.primaryEmail?.toLowerCase().includes(term) ||
      contact.primaryPhone?.toLowerCase().includes(term) ||
      contact.jobTitle?.toLowerCase().includes(term)
    )
  }, [contacts, searchTerm])

  const handleCreateContact = async (contactData: Partial<UniversalContact>) => {
    try {
      await createContact(contactData)
      toast.success("Contact created successfully")
    } catch (error) {
      toast.error("Failed to create contact", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
      throw error; // Re-throw to keep modal open on error
    }
  }

  const handleUpdateContact = async (contactData: Partial<UniversalContact>) => {
    if (!editingContact?.id) return
    
    try {
      await updateContact(editingContact.id, contactData)
      toast.success("Contact updated successfully")
    } catch (error) {
      toast.error("Failed to update contact", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
      throw error; // Re-throw to keep modal open on error
    }
  }

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContact(id)
      toast.success("Contact deleted successfully")
    } catch (error) {
      toast.error("Failed to delete contact", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
    }
  }

  const handleEditContact = (contact: UniversalContact) => {
    setEditingContact(contact)
  }
  
  const handleSaveContact = async (formData: Partial<UniversalContact>) => {
    if (editingContact) {
      await handleUpdateContact(formData)
    } else {
      await handleCreateContact(formData)
    }
  }

  const handleCloseModal = () => {
    setEditingContact(null)
    setShowCreateModal(false)
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load contacts. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header - Improved mobile layout */}
          <div className="space-y-3 sm:space-y-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Contact Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-2xl mx-auto sm:mx-0">
                Manage your contacts with automatic CRM sync. Changes from CRMs import automatically, push your changes manually.
              </p>
            </div>
          </div>

          {/* Tabs - Made scrollable for mobile */}
          <div className="flex overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 bg-muted/60 backdrop-blur-sm p-1 rounded-xl w-fit min-w-full sm:min-w-0 border border-border/50">
              <button
                onClick={() => setSelectedTab("contacts")}
                className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedTab === "contacts" 
                    ? "bg-background text-foreground shadow-lg shadow-primary/10 border border-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Contacts</span>
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-xs">
                  {contacts.length}
                </Badge>
              </button>
              <button
                onClick={() => setSelectedTab("sync")}
                className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedTab === "sync" 
                    ? "bg-background text-foreground shadow-lg shadow-primary/10 border border-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Sync Dashboard</span>
              </button>
            </div>
          </div>

          {selectedTab === "contacts" && (
            <>
              {/* Stats Cards - Improved mobile layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <Card className="group hover:shadow-lg transition-all duration-200 border-0 ring-1 ring-border/50 hover:ring-primary/20">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10 group-hover:scale-102 transition-transform duration-200">
                        <Database className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Contacts</p>
                        <p className="text-xl sm:text-2xl font-bold">{contacts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-border/50 hover:ring-green-500/20">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 ring-1 ring-green-200/50 dark:ring-green-800/30 group-hover:scale-102 transition-transform duration-300">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Filtered Results</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{filteredContacts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all duration-200 border-0 ring-1 ring-border/50 hover:ring-blue-500/20 sm:col-span-2 lg:col-span-1">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 ring-1 ring-blue-200/50 dark:ring-blue-800/30 group-hover:scale-102 transition-transform duration-200">
                        <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Active</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{contacts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Controls - Better mobile layout */}
              <Card className="border-0 ring-1 ring-border/50 shadow-lg">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                        <Filter className="h-4 w-4 text-primary" />
                      </div>
                      <span>Contact Management</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Search, filter, and manage your contacts
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Search - Full width on mobile */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors"
                      />
                    </div>

                    {/* Action Buttons - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full sm:w-auto h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/25"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add New Contact
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Create a new contact manually</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto h-11 border-border/50 hover:bg-muted/60 hover:border-primary/20"
                            onClick={() => setSelectedTab("sync")}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Push to CRMs
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Push local changes to CRM systems. Imports happen automatically via webhooks.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results Info - Improved mobile design */}
              {searchTerm && (
                <Alert className="border-0 ring-1 ring-blue-200/50 dark:ring-blue-800/30 bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-950/20 dark:to-sky-950/20">
                  <Search className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900 dark:text-blue-100">Search Results</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    Showing <strong>{filteredContacts.length}</strong> of <strong>{contacts.length}</strong> contacts matching "<strong>{searchTerm}</strong>"
                    {filteredContacts.length === 0 && (
                      <span className="block mt-1 text-xs">Try adjusting your search terms</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Mobile Cards View */}
              <div className="block lg:hidden space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Contacts</h3>
                </div>
                <Card className="group hover:shadow-lg transition-all duration-200 border-0 ring-1 ring-border/50 hover:ring-primary/20">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10 group-hover:scale-102 transition-transform duration-200">
                        <Database className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Contacts</p>
                        <p className="text-xl sm:text-2xl font-bold">{contacts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contacts Table */}
              <ContactsTable 
                contacts={filteredContacts}
                isLoading={isLoading || !mounted}
                onEdit={handleEditContact}
                onDelete={handleDeleteContact}
              />

              {/* Contact Modal */}
              <ContactModal
                isOpen={showCreateModal || !!editingContact}
                contact={editingContact}
                onSave={handleSaveContact}
                onClose={handleCloseModal}
              />
            </>
          )}

          {selectedTab === "sync" && auth?.customerId && <SyncDashboard customerId={auth.customerId} />}
        </div>
      </div>
    </TooltipProvider>
  )
} 