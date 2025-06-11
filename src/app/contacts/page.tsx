"use client"

import { ContactsTable } from "./components/contacts-table"
import { useContacts } from "@/hooks/use-contacts"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { ContactForm } from "./components/contact-form"
import { Contact } from "@/types/contact"
import { toast } from "sonner"

export default function ContactsPage() {
  const { contacts, isLoading, isError, importContacts, createContact, updateContact, deleteContact } = useContacts()
  const [isImporting, setIsImporting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImport = async () => {
    try {
      setIsImporting(true)
      await importContacts()
      toast.success("Contacts imported successfully")
    } catch (error) {
      console.error("Failed to import contacts:", error)
      toast.error("Failed to import contacts")
    } finally {
      setIsImporting(false)
    }
  }

  const handleCreate = async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsSubmitting(true)
      await createContact(contact)
      toast.success("Contact created successfully")
    } catch (error) {
      console.error("Failed to create contact:", error)
      toast.error("Failed to create contact")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (contact: Contact) => {
    try {
      setIsSubmitting(true)
      await updateContact(contact)
      toast.success("Contact updated successfully")
    } catch (error) {
      console.error("Failed to update contact:", error)
      toast.error("Failed to update contact")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true)
      await deleteContact(id)
      toast.success("Contact deleted successfully")
    } catch (error) {
      console.error("Failed to delete contact:", error)
      toast.error("Failed to delete contact")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground">Manage your contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <ContactForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
            <Button onClick={handleImport} disabled={isImporting}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isImporting ? "animate-spin" : ""}`}
              />
              {isImporting ? "Importing..." : "Import Contacts"}
            </Button>
          </div>
        </div>
        <ContactsTable
          contacts={contacts}
          isLoading={isLoading}
          isError={isError}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
} 