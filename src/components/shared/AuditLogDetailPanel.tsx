import React from 'react';
import { AuditLog } from '../../types/audit';
import { X, Calendar, User, Activity, Monitor, Shield, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface AuditLogDetailPanelProps {
  log: AuditLog;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogDetailPanel({ log, isOpen, onClose }: AuditLogDetailPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity Details
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{log.title}</h3>
            <p className="text-sm text-muted-foreground">{log.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-3 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Date & Time</span>
              <span className="text-sm font-semibold text-foreground">
                {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Performed By</span>
              <span className="text-sm font-semibold text-foreground">
                {log.userName}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">({log.userRole || 'System'})</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">Entity Information</h4>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              <div className="flex justify-between p-3">
                <span className="text-sm font-medium text-muted-foreground">Entity Type</span>
                <span className="text-sm font-semibold">{log.entityType}</span>
              </div>
              {log.entityId && (
                <div className="flex justify-between p-3">
                  <span className="text-sm font-medium text-muted-foreground">Entity ID</span>
                  <span className="text-sm font-semibold font-mono bg-muted px-2 py-0.5 rounded">{log.entityId}</span>
                </div>
              )}
              <div className="flex justify-between p-3">
                <span className="text-sm font-medium text-muted-foreground">Action</span>
                <span className="text-sm font-semibold">{log.action}</span>
              </div>
            </div>
          </div>

          {(log.previousValue || log.newValue) && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">Changes</h4>
              <div className="bg-muted/20 border border-border rounded-lg p-4">
                <div className="flex flex-col gap-3">
                  {log.previousValue && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-1 block">Previous Value</span>
                      <div className="text-sm text-foreground bg-background p-2 rounded border border-border/50 line-through decoration-red-500/50">
                        {log.previousValue}
                      </div>
                    </div>
                  )}
                  {log.previousValue && log.newValue && (
                    <div className="flex justify-center -my-1 relative z-10">
                      <div className="bg-background border border-border rounded-full p-1 shadow-sm">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {log.newValue && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-1 block">New Value</span>
                      <div className="text-sm text-foreground bg-background p-2 rounded border border-green-500/30 font-medium">
                        {log.newValue}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">System Info</h4>
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20 font-medium">Device</span>
                <span className="font-mono text-xs">{log.deviceInfo || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20 font-medium">IP Address</span>
                <span className="font-mono text-xs">{log.ipAddress || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20 font-medium">Log ID</span>
                <span className="font-mono text-xs">{log.id}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
