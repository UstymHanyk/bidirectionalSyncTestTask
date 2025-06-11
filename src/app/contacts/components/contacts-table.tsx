"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UniversalContact } from "@/types/contact"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  AlertCircle, 
  Edit2, 
  Mail, 
  Phone, 
  Trash2, 
  User, 
  Building2, 
  Clock,
  CheckCircle,
  RotateCw,
  AlertTriangle
} from "lucide-react"

interface ContactsTableProps {
  contacts: UniversalContact[]
  isLoading: boolean
  onEdit: (contact: UniversalContact) => void
  onDelete: (id: string) => void
}

const getSyncStatusColor = (status?: string) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800 border-green-200'
    case 'syncing': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'error': return 'bg-red-100 text-red-800 border-red-200'
    case 'conflict': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getSyncStatusIcon = (status?: string) => {
  switch (status) {
    case 'success': return <CheckCircle className="h-3 w-3" />
    case 'syncing': return <RotateCw className="h-3 w-3 animate-spin" />
    case 'error': return <AlertTriangle className="h-3 w-3" />
    case 'conflict': return <AlertCircle className="h-3 w-3" />
    default: return <Clock className="h-3 w-3" />
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    // Use ISO string parsing to avoid locale/timezone hydration issues
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return `${months[month]} ${day}, ${year}`
  } catch (error) {
    return 'Invalid date'
  }
}

export function ContactsTable({ contacts, isLoading, onEdit, onDelete }: ContactsTableProps) {
  const [mounted, setMounted] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)

  // Prevent hydration issues by ensuring client-side rendering for dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = (id: string) => {
    onDelete(id)
    setDeleteContactId(null)
  }

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="font-medium">Loading contacts</h3>
          <p className="text-sm text-muted-foreground">Please wait while we fetch your contacts...</p>
        </div>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No contacts found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Get started by adding your first contact or importing contacts from your CRM system.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Contacts</h3>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {contacts.length} total
          </Badge>
        </div>
        
        {contacts.map((contact) => (
          <Card key={contact.id} className="group hover:shadow-lg transition-all duration-300 border-0 ring-1 ring-border/50 hover:ring-primary/20">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Header with avatar and name */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg shadow-lg">
                      {contact.firstName ? contact.firstName[0]?.toUpperCase() : 
                       contact.fullName ? contact.fullName[0]?.toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground text-lg truncate">
                        {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'}
                      </h4>
                      {contact.jobTitle && (
                        <p className="text-sm text-muted-foreground truncate">{contact.jobTitle}</p>
                      )}
                      {contact.companyName && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{contact.companyName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(contact)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Dialog open={deleteContactId === contact.id} onOpenChange={(open) => !open && setDeleteContactId(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteContactId(contact.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm mx-auto">
                        <DialogHeader>
                          <DialogTitle>Delete Contact</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete {contact.fullName || contact.primaryEmail || 'this contact'}? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                          <Button
                            variant="outline"
                            onClick={() => setDeleteContactId(null)}
                            className="w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(contact.id)}
                            className="w-full sm:w-auto"
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  {contact.primaryEmail && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{contact.primaryEmail}</span>
                    </div>
                  )}
                  {contact.primaryPhone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{contact.primaryPhone}</span>
                    </div>
                  )}
                  {!contact.primaryEmail && !contact.primaryPhone && (
                    <span className="text-sm text-muted-foreground">No contact info</span>
                  )}
                </div>

                {/* Status and Date */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`text-xs ${getSyncStatusColor(contact.syncStatus)}`}>
                      <span className="mr-1">
                        {getSyncStatusIcon(contact.syncStatus)}
                      </span>
                      {contact.syncStatus || 'idle'}
                    </Badge>
                    {contact.stage && (
                      <Badge variant="secondary" className="text-xs">
                        {contact.stage}
                      </Badge>
                    )}
                  </div>
                  
                                     <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                     {contact.updatedTime ? formatDate(contact.updatedTime) : 
                      contact.createdTime ? formatDate(contact.createdTime) : 'Unknown'}
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Contacts</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {contacts.length} total
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your contacts and keep them synchronized with your CRM systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {contact.firstName ? contact.firstName[0]?.toUpperCase() : 
                           contact.fullName ? contact.fullName[0]?.toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'}
                          </div>
                          {contact.jobTitle && (
                            <div className="text-sm text-muted-foreground">{contact.jobTitle}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {contact.primaryEmail && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{contact.primaryEmail}</span>
                          </div>
                        )}
                        {contact.primaryPhone && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.primaryPhone}</span>
                          </div>
                        )}
                        {!contact.primaryEmail && !contact.primaryPhone && (
                          <span className="text-sm text-muted-foreground">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {contact.companyName ? (
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No company</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant="outline" className={`text-xs ${getSyncStatusColor(contact.syncStatus)}`}>
                          <span className="mr-1">
                            {getSyncStatusIcon(contact.syncStatus)}
                          </span>
                          {contact.syncStatus || 'idle'}
                        </Badge>
                        {contact.stage && (
                          <Badge variant="secondary" className="text-xs">
                            {contact.stage}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                                             <div className="text-sm" suppressHydrationWarning>
                         {contact.updatedTime ? (
                           <div className="text-muted-foreground">
                             {formatDate(contact.updatedTime)}
                           </div>
                         ) : contact.createdTime ? (
                           <div className="text-muted-foreground">
                             Created {formatDate(contact.createdTime)}
                           </div>
                         ) : (
                           <span className="text-muted-foreground">Unknown</span>
                         )}
                       </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(contact)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <Dialog open={deleteContactId === contact.id} onOpenChange={(open) => !open && setDeleteContactId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteContactId(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Contact</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete {contact.fullName || contact.primaryEmail || 'this contact'}? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeleteContactId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(contact.id)}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
} 