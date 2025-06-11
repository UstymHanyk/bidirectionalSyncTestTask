export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  pronouns: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsResponse {
  contacts: Contact[];
} 