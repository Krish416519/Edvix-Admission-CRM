export type EntityType = 'Lead' | 'Admission' | 'User' | 'Task' | 'Settings' | 'Note' | 'Document';
export type ActivityAction = 'Created' | 'Updated' | 'Deleted' | 'Assigned' | 'Status Changed' | 'Completed' | 'Cancelled' | 'Uploaded' | 'Login' | 'Logout';

export interface AuditLog {
  id: string;
  action: ActivityAction | string;
  entityType: EntityType;
  entityId?: string;
  
  title: string;
  description: string;
  
  previousValue?: string;
  newValue?: string;
  
  userId?: string;
  userName: string;
  userRole?: string;
  
  timestamp: string;
  
  // Future ready fields
  ipAddress?: string;
  deviceInfo?: string;

  // Context relations for easy filtering
  leadId?: string;
  admissionId?: string;
}
