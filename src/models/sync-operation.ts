import mongoose from 'mongoose';
import type { CRMProvider, SyncStatus, SyncOperationSummary } from '@/types/sync';

interface SyncOperation extends mongoose.Document {
  id: string;
  operationType: 'import' | 'export' | 'bidirectional';
  crmProvider: CRMProvider;
  status: SyncStatus;
  direction: 'import' | 'export' | 'bidirectional';
  triggeredBy: 'manual' | 'webhook' | 'scheduled';
  customerId: string;
  
  // Integration.app Flow details
  flowRunId?: string;
  flowName?: string;
  connectionId?: string;
  
  // Operation metrics
  contactsProcessed?: number;
  contactsSuccess?: number;
  contactsError?: number;
  contactsConflict?: number;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  
  // Error handling
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  
  // Summary
  summary: SyncOperationSummary;
  
  // Flow execution logs
  flowLogs?: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    stepName?: string;
    data?: any;
  }>;
  
  // Methods
  addFlowLog(level: 'info' | 'warn' | 'error', message: string, stepName?: string, data?: any): Promise<SyncOperation>;
  updateStatus(status: SyncStatus, error?: string): Promise<SyncOperation>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface SyncOperationModel extends mongoose.Model<SyncOperation> {
  findByFlowRunId(flowRunId: string): Promise<SyncOperation | null>;
  getRecentOperations(customerId: string, limit?: number): Promise<SyncOperation[]>;
}

const syncOperationSchema = new mongoose.Schema<SyncOperation>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    operationType: {
      type: String,
      required: true,
      enum: ['import', 'export', 'bidirectional'],
      index: true,
    },
    crmProvider: {
      type: String,
      required: true,
      enum: ['hubspot', 'pipedrive'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'syncing', 'success', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ['import', 'export', 'bidirectional'],
    },
    triggeredBy: {
      type: String,
      required: true,
      enum: ['manual', 'webhook', 'scheduled'],
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    
    // Integration.app Flow details
    flowRunId: {
      type: String,
      trim: true,
      index: true,
    },
    flowName: {
      type: String,
      trim: true,
    },
    connectionId: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Operation metrics
    contactsProcessed: {
      type: Number,
      default: 0,
    },
    contactsSuccess: {
      type: Number,
      default: 0,
    },
    contactsError: {
      type: Number,
      default: 0,
    },
    contactsConflict: {
      type: Number,
      default: 0,
    },
    
    // Timing
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },
    
    // Error handling
    error: {
      type: String,
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    
    // Summary
    summary: {
      totalContacts: { type: Number, default: 0 },
      newContacts: { type: Number, default: 0 },
      updatedContacts: { type: Number, default: 0 },
      deletedContacts: { type: Number, default: 0 },
      erroredContacts: { type: Number, default: 0 },
      conflictedContacts: { type: Number, default: 0 },
      skippedContacts: { type: Number, default: 0 },
    },
    
    // Flow execution logs
    flowLogs: [{
      timestamp: { type: Date, default: Date.now },
      level: { 
        type: String, 
        enum: ['info', 'warn', 'error'],
        required: true 
      },
      message: { type: String, required: true },
      stepName: { type: String },
      data: { type: mongoose.Schema.Types.Mixed }
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indices for efficient queries
syncOperationSchema.index({ customerId: 1, createdAt: -1 });
syncOperationSchema.index({ customerId: 1, status: 1 });
syncOperationSchema.index({ customerId: 1, operationType: 1 });
syncOperationSchema.index({ flowRunId: 1 }, { sparse: true });
syncOperationSchema.index({ connectionId: 1 }, { sparse: true });

// Index for Flow-related queries
syncOperationSchema.index({ customerId: 1, flowRunId: 1 }, { sparse: true });

// Virtual for operation duration calculation
syncOperationSchema.virtual('operationDuration').get(function(this: SyncOperation) {
  if (this.completedAt && this.startedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return null;
});

// Method to add flow log entry
syncOperationSchema.methods.addFlowLog = function(
  this: SyncOperation,
  level: 'info' | 'warn' | 'error',
  message: string,
  stepName?: string,
  data?: any
) {
  this.flowLogs = this.flowLogs || [];
  this.flowLogs.push({
    timestamp: new Date(),
    level,
    message,
    stepName,
    data
  });
  return this.save();
};

// Method to update operation status
syncOperationSchema.methods.updateStatus = function(
  this: SyncOperation,
  status: SyncStatus,
  error?: string
) {
  this.status = status;
  if (error) {
    this.error = error;
  }
  if (status === 'success' || status === 'failed' || status === 'cancelled') {
    this.completedAt = new Date();
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  }
  return this.save();
};

// Static method to find operations by flow run ID
syncOperationSchema.statics.findByFlowRunId = function(flowRunId: string) {
  return this.findOne({ flowRunId });
};

// Static method to get recent operations for a customer
syncOperationSchema.statics.getRecentOperations = function(
  customerId: string, 
  limit: number = 10
) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const SyncOperationModel = (mongoose.models.SyncOperation || 
  mongoose.model<SyncOperation, SyncOperationModel>('SyncOperation', syncOperationSchema)) as SyncOperationModel; 