import mongoose from 'mongoose';
import type { UniversalContact, ContactEmail, ContactPhone, ContactAddress } from '@/types/contact';
import type { SyncStatus } from '@/types/sync';

const contactEmailSchema = new mongoose.Schema<ContactEmail>({
  value: { type: String, required: true },
  type: { type: String }
}, { _id: false });

const contactPhoneSchema = new mongoose.Schema<ContactPhone>({
  value: { type: String },
  type: { type: String }
}, { _id: false });

const contactAddressSchema = new mongoose.Schema<ContactAddress>({
  type: { type: String },
  full: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  zip: { type: String }
}, { _id: false });

export interface IContact extends UniversalContact {
  _id?: string; // MongoDB document ID
  // Legacy sync fields for compatibility
  integrationLinks?: string[];
  lastSyncAt?: Date;
  syncStatus?: SyncStatus;
  syncErrors?: string[];
  conflictData?: string[];
  syncHash?: string;
}

const contactSchema = new mongoose.Schema<IContact>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    primaryEmail: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    emails: [contactEmailSchema],
    primaryPhone: {
      type: String,
      trim: true,
    },
    phones: [contactPhoneSchema],
    primaryAddress: contactAddressSchema,
    addresses: [contactAddressSchema],
    stage: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    companyId: {
      type: String,
      trim: true,
    },
    ownerId: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    createdTime: {
      type: String, // ISO date-time string
    },
    createdBy: {
      type: String,
      trim: true,
    },
    updatedTime: {
      type: String, // ISO date-time string
    },
    updatedBy: {
      type: String,
      trim: true,
    },
    lastActivityTime: {
      type: String, // ISO date-time string
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Legacy sync fields for backward compatibility
    integrationLinks: [{
      type: String,
    }],
    lastSyncAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'success', 'error', 'conflict'] as SyncStatus[],
      default: 'idle',
      index: true,
    },
    syncErrors: [{
      type: String,
    }],
    conflictData: [{
      type: String,
    }],
    syncHash: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indices for common queries
contactSchema.index({ customerId: 1, createdAt: -1 });
contactSchema.index({ customerId: 1, syncStatus: 1 });
contactSchema.index({ customerId: 1, lastSyncAt: -1 });
contactSchema.index({ customerId: 1, primaryEmail: 1 });
contactSchema.index({ syncHash: 1 });

// Force mongoose to use the updated schema
try {
  mongoose.deleteModel('Contact');
} catch (error) {
  // Model doesn't exist, that's fine
}

export const Contact = mongoose.model<IContact>('Contact', contactSchema); 