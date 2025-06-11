// Universal Contact Schema - matches Integration.app universal field mapping

import type { SyncStatus } from './sync';

export interface ContactEmail {
  value: string;
  type?: string;
}

export interface ContactPhone {
  value: string;
  type?: string;
}

export interface ContactAddress {
  type?: string;
  full?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export interface UniversalContact {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  emails: ContactEmail[];
  primaryPhone?: string;
  phones: ContactPhone[];
  primaryAddress: ContactAddress;
  addresses: ContactAddress[];
  stage?: string;
  companyName?: string;
  companyId?: string;
  ownerId?: string;
  jobTitle?: string;
  source?: string;
  createdTime?: string; // ISO date-time string
  createdBy?: string;
  updatedTime?: string; // ISO date-time string
  updatedBy?: string;
  lastActivityTime?: string; // ISO date-time string
  customerId: string; // Internal field for multi-tenancy
  syncStatus?: SyncStatus;
}

export interface ContactsResponse {
  contacts: UniversalContact[];
} 