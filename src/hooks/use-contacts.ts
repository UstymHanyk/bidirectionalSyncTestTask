import { ContactsResponse, UniversalContact } from '@/types/contact';
import useSWR from 'swr';
import { authenticatedFetcher, getAuthHeaders } from '@/lib/fetch-utils';

export function useContacts() {
  // Fetch contacts with proper typing
  const { data, error, isLoading, mutate } = useSWR<ContactsResponse>(
    '/api/contacts',
    (url) => authenticatedFetcher<ContactsResponse>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const createContact = async (contactData: Partial<UniversalContact>) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        throw new Error('Failed to create contact');
      }

      const result = await response.json();
      await mutate(); // Refresh the contacts list
      return result;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  };

  const updateContact = async (id: string, contactData: Partial<UniversalContact>) => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      const result = await response.json();
      await mutate(); // Refresh the contacts list
      return result;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      await mutate(); // Refresh the contacts list
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  };

  return {
    contacts: data?.contacts || [],
    isLoading,
    isError: !!error,
    mutate,
    createContact,
    updateContact,
    deleteContact,
  };
} 