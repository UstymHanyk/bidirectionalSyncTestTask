import mongoose from 'mongoose';
import type { ContactConflict as IContactConflict, CRMProvider, ConflictResolutionStrategy } from '@/types/sync';

const contactConflictSchema = new mongoose.Schema<IContactConflict>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contactId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    crmProvider: {
      type: String,
      required: true,
      enum: ['hubspot', 'pipedrive'] as CRMProvider[],
      index: true,
    },
    conflictType: {
      type: String,
      required: true,
      enum: ['field_mismatch', 'duplicate_detection', 'deletion_conflict'],
      index: true,
    },
    localData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    remoteData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    conflictingFields: [{
      type: String,
      trim: true,
    }],
    resolutionStrategy: {
      type: String,
      enum: ['local_wins', 'remote_wins', 'manual_review'] as ConflictResolutionStrategy[],
    },
    resolutionData: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'resolved', 'ignored'],
      default: 'pending',
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
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
contactConflictSchema.index({ customerId: 1, status: 1, createdAt: -1 });
contactConflictSchema.index({ customerId: 1, conflictType: 1 });
contactConflictSchema.index({ contactId: 1, crmProvider: 1 });

export const ContactConflictModel = mongoose.models.ContactConflict || 
  mongoose.model<IContactConflict>('ContactConflict', contactConflictSchema); 