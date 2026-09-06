import { useState } from 'react';
import { Shield, Layers, Users } from 'lucide-react';
import { DomainManager } from './DomainManager';
import { RoleManager } from './RoleManager';
import { UserPermissionManager } from './UserPermissionManager';

type Tab = 'domains' | 'roles' | 'overrides';

export function RBACDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('domains');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Roles & Domains
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Enterprise Role-Based Access Control configuration.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
        {/* Tabs Header */}
        <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'domains'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Domains
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'roles'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overrides'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Users className="w-4 h-4" />
            User Overrides
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6 bg-muted/10 h-full overflow-y-auto">
          {activeTab === 'domains' && <DomainManager />}
          {activeTab === 'roles' && <RoleManager />}
          {activeTab === 'overrides' && <UserPermissionManager />}
        </div>
      </div>
    </div>
  );
}
