import { ContactsResponse, UniversalContact } from '@/types/contact';
import useSWR from 'swr';
import { authenticatedFetcher, getAuthHeaders } from '@/lib/fetch-utils';
import { useState, useEffect } from 'react';

export function useContacts() {
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  
  const { data, error, isLoading, mutate } = useSWR<ContactsResponse>(
    '/api/contacts',
    (url) => authenticatedFetcher<ContactsResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: isOperationInProgress ? 2000 : 10000, // Faster refresh during operations
    }
  );

  // Listen for sync operation completion events
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log('Sync operation completed, refreshing contacts...');
      mutate();
    };

    const handleOperationStart = () => {
      setIsOperationInProgress(true);
    };

    const handleOperationEnd = () => {
      setIsOperationInProgress(false);
      mutate(); // Refresh immediately when operation ends
    };

    // Listen for custom events
    window.addEventListener('syncOperationComplete', handleSyncComplete);
    window.addEventListener('syncOperationStart', handleOperationStart);
    window.addEventListener('syncOperationEnd', handleOperationEnd);
    window.addEventListener('contactsChanged', handleSyncComplete);

    return () => {
      window.removeEventListener('syncOperationComplete', handleSyncComplete);
      window.removeEventListener('syncOperationStart', handleOperationStart);
      window.removeEventListener('syncOperationEnd', handleOperationEnd);
      window.removeEventListener('contactsChanged', handleSyncComplete);
    };
  }, [mutate]);

  const createContact = async (contactData: Partial<UniversalContact>) => {
    try {
      setIsOperationInProgress(true);
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contact');
      }

      const newContact = await response.json();
      
      // Trigger refresh
      await mutate();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contactsChanged'));
      
      return newContact;
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const updateContact = async (id: string, contactData: Partial<UniversalContact>) => {
    try {
      setIsOperationInProgress(true);
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contact');
      }

      const updatedContact = await response.json();
      
      // Trigger refresh
      await mutate();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contactsChanged'));
      
      return updatedContact;
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setIsOperationInProgress(true);
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete contact');
      }

      // Trigger refresh
      await mutate();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contactsChanged'));
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const clearAllContacts = async () => {
    try {
      setIsOperationInProgress(true);
      window.dispatchEvent(new CustomEvent('syncOperationStart'));
      
      const response = await fetch('/api/contacts/clear-all', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear contacts');
      }

      const result = await response.json();
      
      // Trigger refresh
      await mutate();
      
      // Dispatch completion events
      window.dispatchEvent(new CustomEvent('contactsChanged'));
      window.dispatchEvent(new CustomEvent('syncOperationComplete'));
      
      return result;
    } finally {
      setIsOperationInProgress(false);
      window.dispatchEvent(new CustomEvent('syncOperationEnd'));
    }
  };

  return {
    contacts: data?.contacts || [],
    isLoading: isLoading || isOperationInProgress,
    isError: error,
    createContact,
    updateContact,
    deleteContact,
    clearAllContacts,
    refresh: mutate,
  };
} 