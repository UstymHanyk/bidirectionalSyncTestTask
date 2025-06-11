"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { UniversalContact } from "@/types/contact"
import { Shuffle, Loader2 } from "lucide-react"

interface ContactModalProps {
  isOpen: boolean
  contact?: UniversalContact | null
  onSave: (contactData: Partial<UniversalContact>) => Promise<void>
  onClose: () => void
}

// Random data generators
const randomFirstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica',
  'William', 'Ashley', 'James', 'Emma', 'Christopher', 'Olivia', 'Daniel', 'Amanda',
  'Matthew', 'Megan', 'Anthony', 'Hannah', 'Mark', 'Samantha', 'Steven', 'Rachel'
];

const randomLastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
];

const randomCompanies = [
  'Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', 'Digital Dynamics',
  'Future Systems', 'Creative Agency', 'Smart Technologies', 'Data Insights', 'Cloud Nine',
  'NextGen Solutions', 'Prime Innovations', 'Elite Enterprises', 'Quantum Systems',
  'Alpha Technologies', 'Beta Solutions', 'Gamma Corp', 'Delta Innovations'
];

const randomJobTitles = [
  'Software Engineer', 'Product Manager', 'Sales Director', 'Marketing Manager',
  'Business Analyst', 'UX Designer', 'Data Scientist', 'Operations Manager',
  'Customer Success Manager', 'VP of Engineering', 'Head of Marketing', 'CEO',
  'CTO', 'COO', 'Account Executive', 'Project Manager', 'DevOps Engineer',
  'Quality Assurance Manager', 'HR Director', 'Finance Manager'
];

const generateRandomContact = () => {
  const firstName = randomFirstNames[Math.floor(Math.random() * randomFirstNames.length)];
  const lastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
  const company = randomCompanies[Math.floor(Math.random() * randomCompanies.length)];
  const jobTitle = randomJobTitles[Math.floor(Math.random() * randomJobTitles.length)];
  
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;
  const phone = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;

  return {
    firstName,
    lastName,
    primaryEmail: email,
    primaryPhone: phone,
    companyName: company,
    jobTitle
  };
};

export function ContactModal({ isOpen, contact, onSave, onClose }: ContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<UniversalContact>>({})

  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        primaryEmail: contact.primaryEmail || "",
        primaryPhone: contact.primaryPhone || "",
        jobTitle: contact.jobTitle || "",
        companyName: contact.companyName || "",
      })
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        primaryEmail: "",
        primaryPhone: "",
        jobTitle: "",
        companyName: "",
      })
    }
  }, [contact, isOpen])

  const handleGenerateRandom = () => {
    const randomData = generateRandomContact();
    setFormData(randomData);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const saveData: Partial<UniversalContact> = {
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim()
    }
    
    try {
      await onSave(saveData)
      onClose()
    } catch (error) {
      console.error("Error submitting form:", error)
      // Form will stay open on error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {contact ? "Update the contact information below." : "Fill in the contact details below or generate random data to get started quickly."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!contact && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateRandom}
                className="flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Generate Random Data
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g., Jane"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g., Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryEmail">Primary Email *</Label>
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
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 