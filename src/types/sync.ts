// Integration.app Enhanced Types for Contact Synchronization

export type CRMProvider = 'hubspot' | 'pipedrive';
export type SyncDirection = 'import' | 'export' | 'bidirectional';
export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'success' | 'failed' | 'cancelled' | 'error' | 'conflict';
export type ConflictResolutionStrategy = 'local_wins' | 'remote_wins' | 'manual_review';

// Integration.app Data Link interface
export interface IntegrationDataLink {
  id: string;
  localContactId: string;
  externalContactId: string;
  crmProvider: CRMProvider;
  connectionId: string;
  createdAt: Date;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
  syncHash?: string; // For change detection
  customerId: string;
}

// Integration.app Flow execution context
export interface FlowExecutionContext {
  flowId: string;
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// Enhanced Contact model with sync metadata
export interface SyncableContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  pronouns: string;
  customerId: string;
  // Integration.app sync fields
  integrationLinks: IntegrationDataLink[];
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  syncErrors: SyncError[];
  conflictData?: ContactConflict[];
  syncHash: string; // For change detection
  createdAt: Date;
  updatedAt: Date;
}

// Integration.app error tracking
export interface SyncError {
  id: string;
  contactId: string;
  crmProvider: CRMProvider;
  errorType: 'connection' | 'mapping' | 'validation' | 'conflict' | 'rate_limit' | 'timeout';
  message: string;
  details: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
  flowExecutionId?: string;
  createdAt: Date;
  resolvedAt?: Date;
  customerId: string;
}

// Contact conflict management
export interface ContactConflict {
  id: string;
  contactId: string;
  crmProvider: CRMProvider;
  conflictType: 'field_mismatch' | 'duplicate_detection' | 'deletion_conflict';
  localData: Partial<SyncableContact>;
  remoteData: Record<string, unknown>;
  conflictingFields: string[];
  resolutionStrategy?: ConflictResolutionStrategy;
  resolutionData?: Record<string, unknown>;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  customerId: string;
}

// Integration.app field mapping configuration
export interface FieldMapping {
  id: string;
  crmProvider: CRMProvider;
  direction: SyncDirection;
  mappings: Record<string, string>; // local_field -> crm_field
  transformations?: Record<string, FieldTransformation>;
  isActive: boolean;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldTransformation {
  type: 'format' | 'concat' | 'split' | 'lookup' | 'custom';
  config: Record<string, unknown>;
}

// Sync operation tracking
export interface SyncOperation {
  id: string;
  operationType: 'import' | 'export' | 'full_sync' | 'incremental_sync';
  crmProvider: CRMProvider;
  status: SyncStatus;
  direction: SyncDirection;
  contactsProcessed: number;
  contactsSuccess: number;
  contactsError: number;
  contactsConflict: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  triggeredBy: 'manual' | 'webhook' | 'scheduled';
  flowExecutions: FlowExecutionContext[];
  errors: SyncError[];
  summary: SyncOperationSummary;
  customerId: string;
}

export interface SyncOperationSummary {
  totalContacts: number;
  newContacts: number;
  updatedContacts: number;
  deletedContacts: number;
  erroredContacts: number;
  conflictedContacts: number;
  skippedContacts: number;
}

// Integration.app connection status
export interface ConnectionStatus {
  connectionId: string;
  crmProvider: CRMProvider;
  isConnected: boolean;
  connectionName: string;
  lastHealthCheck: Date;
  healthStatus: 'healthy' | 'warning' | 'error';
  authStatus: 'valid' | 'expired' | 'invalid';
  rateLimitStatus: {
    remaining: number;
    resetTime: Date;
    dailyLimit: number;
  };
  capabilities: string[];
  customerId: string;
}

// Sync configuration
export interface SyncConfiguration {
  id: string;
  crmProvider: CRMProvider;
  connectionId: string;
  syncDirection: SyncDirection;
  isEnabled: boolean;
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'manual';
  conflictResolution: ConflictResolutionStrategy;
  fieldMappingId: string;
  filters: Record<string, unknown>;
  webhookConfig?: {
    url: string;
    events: string[];
    isActive: boolean;
  };
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface SyncStatusResponse {
  issyncing: boolean;
  lastSync?: Date;
  nextSync?: Date;
  activeOperations: SyncOperation[];
  connectionStatuses: ConnectionStatus[];
  recentErrors: SyncError[];
  summary: {
    totalContacts: number;
    syncedContacts: number;
    pendingSync: number;
    errorCount: number;
    conflictCount: number;
  };
}

export interface SyncOperationResponse {
  operation: SyncOperation;
  logs: FlowExecutionContext[];
}

// Integration.app webhook payloads
export interface CRMWebhookPayload {
  id: string;
  event: string;
  crmProvider: CRMProvider;
  contactId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  connectionId: string;
}

// Field mapping templates for different CRMs
export const DEFAULT_FIELD_MAPPINGS: Record<CRMProvider, Record<string, string>> = {
  hubspot: {
    name: 'firstname,lastname',
    email: 'email',
    phone: 'phone',
    jobTitle: 'jobtitle',
    company: 'company'
  },
  pipedrive: {
    name: 'name',
    email: 'email.0.value',
    phone: 'phone.0.value',
    jobTitle: 'custom_fields.job_title',
    company: 'org_name'
  }
}; 