import { useCallback, useEffect, useState } from 'react';
import type { TrustedContact } from '../types';
import {
  deleteTrustedContact,
  getTrustedContacts,
  saveTrustedContact,
  setPrimaryContact,
  subscribeToContacts,
} from '../services/guardian-storage';

export function useGuardianContacts() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await getTrustedContacts();
      setContacts(list);
    } catch (err) {
      console.warn('[useGuardianContacts] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
    const unsubscribe = subscribeToContacts((updated) => {
      setContacts(updated);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [loadContacts]);

  const addContact = useCallback(
    async (contact: Omit<TrustedContact, 'id'>) => {
      const updated = await saveTrustedContact(contact);
      setContacts(updated);
      return updated;
    },
    [],
  );

  const updateContact = useCallback(async (contact: TrustedContact) => {
    const updated = await saveTrustedContact(contact);
    setContacts(updated);
    return updated;
  }, []);

  const removeContact = useCallback(async (id: string) => {
    const updated = await deleteTrustedContact(id);
    setContacts(updated);
    return updated;
  }, []);

  const makePrimary = useCallback(async (id: string) => {
    const updated = await setPrimaryContact(id);
    setContacts(updated);
    return updated;
  }, []);

  const primaryContact = contacts.find((c) => c.isPrimarySos) || contacts[0];

  return {
    contacts,
    isLoading,
    primaryContact,
    addContact,
    updateContact,
    removeContact,
    makePrimary,
    refreshContacts: loadContacts,
  };
}
