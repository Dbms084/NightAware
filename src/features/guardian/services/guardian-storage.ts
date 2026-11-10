import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrustedContact } from '../types';

const STORAGE_KEY = '@nightaware/trusted_contacts_v1';

type ContactListener = (contacts: TrustedContact[]) => void;
const listeners = new Set<ContactListener>();

export function subscribeToContacts(listener: ContactListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(contacts: TrustedContact[]) {
  listeners.forEach((listener) => {
    try {
      listener(contacts);
    } catch (err) {
      console.warn('[GuardianStorage] Listener callback error:', err);
    }
  });
}

export async function getTrustedContacts(): Promise<TrustedContact[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrustedContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[GuardianStorage] Failed to read contacts:', error);
    return [];
  }
}

export async function saveTrustedContact(
  contact: Omit<TrustedContact, 'id'> & { id?: string },
): Promise<TrustedContact[]> {
  try {
    const existing = await getTrustedContacts();
    let updated: TrustedContact[];

    if (contact.id) {
      // Edit existing
      updated = existing.map((c) => (c.id === contact.id ? { ...(contact as TrustedContact) } : c));
    } else {
      // Add new
      const newContact: TrustedContact = {
        ...contact,
        id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isPrimarySos: existing.length === 0 ? true : Boolean(contact.isPrimarySos),
      };
      // If new contact is marked primary, unmark others
      if (newContact.isPrimarySos) {
        updated = existing.map((c) => ({ ...c, isPrimarySos: false })).concat(newContact);
      } else {
        updated = [...existing, newContact];
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);
    return updated;
  } catch (error) {
    console.error('[GuardianStorage] Failed to save contact:', error);
    throw error;
  }
}

export async function deleteTrustedContact(id: string): Promise<TrustedContact[]> {
  try {
    const existing = await getTrustedContacts();
    const filtered = existing.filter((c) => c.id !== id);
    // If we deleted the primary contact and have remaining contacts, make the first one primary
    if (filtered.length > 0 && !filtered.some((c) => c.isPrimarySos)) {
      filtered[0].isPrimarySos = true;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    notifyListeners(filtered);
    return filtered;
  } catch (error) {
    console.error('[GuardianStorage] Failed to delete contact:', error);
    throw error;
  }
}

export async function setPrimaryContact(id: string): Promise<TrustedContact[]> {
  try {
    const existing = await getTrustedContacts();
    const updated = existing.map((c) => ({
      ...c,
      isPrimarySos: c.id === id,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);
    return updated;
  } catch (error) {
    console.error('[GuardianStorage] Failed to set primary contact:', error);
    throw error;
  }
}
