import { useState, useEffect } from "react"
import { Contact } from "@/types/contact"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Wand2 } from "lucide-react"
import { faker } from "@faker-js/faker"

interface ContactFormProps {
  contact?: Contact
  onSubmit: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> | Contact) => Promise<void>
  isSubmitting?: boolean
}

export function ContactForm({ contact, onSubmit, isSubmitting = false }: ContactFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    jobTitle: contact?.jobTitle ?? '',
    pronouns: contact?.pronouns ?? '',
  })

  // Update form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        pronouns: contact.pronouns,
      })
    }
  }, [contact])

  const generateRandomData = () => {
    const pronouns = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they']
    setFormData({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      jobTitle: faker.person.jobTitle(),
      pronouns: faker.helpers.arrayElement(pronouns),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (contact) {
        // If we have a contact, include the ID for updates
        await onSubmit({
          ...formData,
          id: contact.id,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        })
      } else {
        // For new contacts, don't include ID
        await onSubmit(formData)
      }
      setOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        jobTitle: '',
        pronouns: '',
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={contact ? "ghost" : "default"} size={contact ? "icon" : "default"}>
          {contact ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pronouns">Pronouns</Label>
            <Input
              id="pronouns"
              value={formData.pronouns}
              onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
            </Button>
            {!contact && (
              <Button
                type="button"
                variant="outline"
                onClick={generateRandomData}
                disabled={isSubmitting}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Random
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 