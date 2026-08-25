import React, { useState } from 'react';
import { IndianRupee, PieChart, Receipt, Building, Percent, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashboardTab } from './tabs/DashboardTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { UniversityPayoutsTab, CommissionsTab, LedgerTab, InvoicesTab } from './FinanceTabs';
import { CommissionRulesTab } from './tabs/CommissionRulesTab';
import { PayoutManagerTab } from './tabs/PayoutManagerTab';
import { DisputeManagerTab } from './tabs/DisputeManagerTab';
import { ReconciliationTab } from './tabs/ReconciliationTab';
import { Settings, FileDown, MessageSquare, ShieldAlert } from 'lucide-react';

type FinanceTab = 'dashboard' | 'payments' | 'payouts' | 'commissions' | 'ledger' | 'invoices' | 'rules' | 'payout_batches' | 'disputes' | 'reconciliation';

export function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');

  const tabs: { id: FinanceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="w-4 h-4" /> },
    { id: 'payments', label: 'Student Payments', icon: <IndianRupee className="w-4 h-4" /> },
    { id: 'ledger', label: 'General Ledger', icon: <FileText className="w-4 h-4" /> },
    { id: 'commissions', label: 'Partner Commission', icon: <Percent className="w-4 h-4" /> },
    { id: 'payouts', label: 'University Payouts', icon: <Building className="w-4 h-4" /> },
    { id: 'payout_batches', label: 'Payout Batches', icon: <FileDown className="w-4 h-4" /> },
    { id: 'rules', label: 'Commission Rules', icon: <Settings className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
    { id: 'disputes', label: 'Disputes', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'reconciliation', label: 'Reconciliation', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Finance & Accounting</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage payments, payouts, commissions, and ledger.</p>
        </div>
      </div>

      <div className="bg-card border border-border p-1 rounded-xl shadow-sm mb-6 flex overflow-x-auto hide-scrollbar shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'commissions' && <CommissionsTab />}
        {activeTab === 'payouts' && <UniversityPayoutsTab />}
        {activeTab === 'payout_batches' && <PayoutManagerTab />}
        {activeTab === 'rules' && <CommissionRulesTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'disputes' && <DisputeManagerTab />}
        {activeTab === 'reconciliation' && <ReconciliationTab />}
      </div>
    </div>
  );
}
