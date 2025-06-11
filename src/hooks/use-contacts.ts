import useSWR from 'swr';
import { ContactsResponse, Contact } from '@/types/contact';
import { authenticatedFetcher, getAuthHeaders } from '@/lib/fetch-utils';

export function useContacts() {
  const { data, error, isLoading, mutate } = useSWR<ContactsResponse>(
    '/api/contacts',
    (url) => authenticatedFetcher<ContactsResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const importContacts = async () => {
    try {
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to import contacts');
      }

      // Refresh the contacts list
      await mutate();

      return true;
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw error;
    }
  };

  const createContact = async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      });

      if (!response.ok) {
        throw new Error('Failed to create contact');
      }

      // Refresh the contacts list
      await mutate();

      return true;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  };

  const updateContact = async (contact: Contact) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      // Refresh the contacts list
      await mutate();

      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const response = await fetch(`/api/contacts?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      // Refresh the contacts list
      await mutate();

      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  };

  return {
    contacts: data?.contacts ?? [],
    isLoading,
    isError: error,
    mutate,
    importContacts,
    createContact,
    updateContact,
    deleteContact,
  };
} 