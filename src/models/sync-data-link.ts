import mongoose from 'mongoose';
import { IntegrationDataLink, CRMProvider, SyncStatus } from '@/types/sync';

const syncDataLinkSchema = new mongoose.Schema<IntegrationDataLink>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    localContactId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    externalContactId: {
      type: String,
      required: true,
      trim: true,
    },
    crmProvider: {
      type: String,
      required: true,
      enum: ['hubspot', 'pipedrive'] as CRMProvider[],
      index: true,
    },
    connectionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lastSyncAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    syncStatus: {
      type: String,
      required: true,
      enum: ['idle', 'syncing', 'success', 'error', 'conflict'] as SyncStatus[],
      default: 'idle',
      index: true,
    },
    syncHash: {
      type: String,
      trim: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indices for efficient queries
syncDataLinkSchema.index({ customerId: 1, localContactId: 1 });
syncDataLinkSchema.index({ customerId: 1, crmProvider: 1 });
syncDataLinkSchema.index({ customerId: 1, syncStatus: 1 });
syncDataLinkSchema.index({ connectionId: 1, externalContactId: 1 });

// Ensure uniqueness of local-external contact mapping per CRM
syncDataLinkSchema.index(
  { localContactId: 1, crmProvider: 1, customerId: 1 },
  { unique: true }
);

export const SyncDataLink = mongoose.models.SyncDataLink || 
  mongoose.model<IntegrationDataLink>('SyncDataLink', syncDataLinkSchema); 