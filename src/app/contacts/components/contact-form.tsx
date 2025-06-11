"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UniversalContact } from "@/types/contact"

interface ContactFormProps {
  contact?: UniversalContact | null
  onSave: (contactData: Partial<UniversalContact>) => Promise<void>
  onCancel: () => void
}

export function ContactForm({ contact, onSave, onCancel }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<UniversalContact>>({})

  useEffect(() => {
    setFormData({
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      primaryEmail: contact?.primaryEmail || "",
      primaryPhone: contact?.primaryPhone || "",
      jobTitle: contact?.jobTitle || "",
      companyName: contact?.companyName || "",
    })
  }, [contact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const saveData: Partial<UniversalContact> = {
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim()
    }
    
    try {
      await onSave(saveData)
    } catch (error) {
      console.error("Error submitting form:", error)
      // Optionally, show an error message to the user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact ? "Edit Contact" : "Add New Contact"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g., Jane"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g., Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryEmail">Primary Email</Label>
            <Input
              id="primaryEmail"
              type="email"
              value={formData.primaryEmail || ""}
              onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              placeholder="e.g., jane.doe@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primaryPhone">Primary Phone</Label>
            <Input
              id="primaryPhone"
              value={formData.primaryPhone || ""}
              onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
              placeholder="e.g., (123) 456-7890"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle || ""}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g., Head of Marketing"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName || ""}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g., Acme Inc."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
