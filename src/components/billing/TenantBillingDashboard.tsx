import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { billingProvider } from '../../lib/billing/MockBillingProvider';
import { CreditCard, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TenantBillingDashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.activeOrganizationId) {
      loadBillingData();
    }
  }, [user?.activeOrganizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      // Load all available plans
      const { data: plansData } = await supabase.from('plans').select('*').eq('is_active', true).order('monthly_price');
      if (plansData) setPlans(plansData);

      // Load organization's subscription
      const { data: subData } = await supabase
        .from('organization_subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', user!.activeOrganizationId!)
        .single();
      if (subData) setSubscription(subData);

      // Load invoices
      const { data: invData } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('organization_id', user!.activeOrganizationId!)
        .order('created_at', { ascending: false });
      if (invData) setInvoices(invData);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingId(planId);
    try {
      const url = await billingProvider.createCheckoutSession(
        user!.activeOrganizationId!,
        planId,
        window.location.href,
        window.location.href
      );
      if (url === window.location.href) {
        // Mock provider instantly updates
        await loadBillingData();
      } else {
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Failed to process subscription');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing cycle.')) return;
    
    setProcessingId('cancel');
    try {
      await billingProvider.cancelSubscription(user!.activeOrganizationId!);
      await loadBillingData();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-muted-foreground">Manage your organization's plan, usage, and invoices.</p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Current Plan: {subscription?.plans?.name || 'No Plan'}
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
            subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
            subscription?.status === 'trialing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
            subscription?.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {subscription?.status || 'Unknown'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Billing Period End</p>
            <p className="font-semibold">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Max Users</p>
            <p className="font-semibold">{subscription?.plans?.max_users || 0}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Max Leads</p>
            <p className="font-semibold">{subscription?.plans?.max_leads?.toLocaleString() || 0}</p>
          </div>
        </div>

        {subscription?.status === 'active' && (
          <div className="flex justify-end">
            <button
              onClick={handleCancel}
              disabled={processingId === 'cancel'}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              {processingId === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          </div>
        )}
        
        {subscription?.status === 'cancelled' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Subscription Cancelled</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">Your access will be revoked on {new Date(subscription.current_period_end).toLocaleDateString()}. Reactivate by selecting a plan below.</p>
            </div>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-card border rounded-xl p-6 flex flex-col ${subscription?.plan_id === plan.id ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border'}`}>
            <div className="mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground h-10">{plan.description}</p>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-extrabold">${plan.monthly_price}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Up to {plan.max_users} users
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {plan.max_leads.toLocaleString()} leads
              </li>
              {plan.features?.crm && (
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Full CRM Access
                </li>
              )}
              {plan.features?.whatsapp && (
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  WhatsApp Integration
                </li>
              )}
            </ul>
            
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={subscription?.plan_id === plan.id || processingId !== null}
              className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                subscription?.plan_id === plan.id 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              }`}
            >
              {processingId === plan.id ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing
                </span>
              ) : subscription?.plan_id === plan.id ? (
                'Current Plan'
              ) : (
                'Upgrade'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Invoice History */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Invoice History</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {invoices.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium">${inv.amount_due}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No invoices found.
          </div>
        )}
      </div>
    </div>
  );
}
