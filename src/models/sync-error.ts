import mongoose from 'mongoose';
import type { SyncError as ISyncError, CRMProvider } from '@/types/sync';

const syncErrorSchema = new mongoose.Schema<ISyncError>(
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
    errorType: {
      type: String,
      required: true,
      enum: ['connection', 'mapping', 'validation', 'conflict', 'rate_limit', 'timeout'],
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    retryable: {
      type: Boolean,
      required: true,
      default: true,
    },
    retryCount: {
      type: Number,
      required: true,
      default: 0,
    },
    flowExecutionId: {
      type: String,
      trim: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
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
syncErrorSchema.index({ customerId: 1, createdAt: -1 });
syncErrorSchema.index({ customerId: 1, errorType: 1 });
syncErrorSchema.index({ customerId: 1, retryable: 1, retryCount: 1 });
syncErrorSchema.index({ contactId: 1, crmProvider: 1 });

export const SyncErrorModel = mongoose.models.SyncError || 
  mongoose.model<ISyncError>('SyncError', syncErrorSchema); 