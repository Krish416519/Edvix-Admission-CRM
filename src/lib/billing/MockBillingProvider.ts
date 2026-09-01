// src/lib/billing/MockBillingProvider.ts
import { IBillingProvider } from './BillingProvider';
import { supabase } from '../supabase';
import { toast } from 'sonner';

/**
 * A mock implementation of the billing provider to simulate checkouts
 * and webhook processing without needing external API keys.
 */
export class MockBillingProvider implements IBillingProvider {
  
  async createCheckoutSession(
    organizationId: string, 
    planId: string, 
    successUrl: string, 
    cancelUrl: string
  ): Promise<string> {
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (import.meta.env.PROD) {
      toast.error('Billing is currently disabled in production. Please configure a real payment provider.');
      return cancelUrl;
    }

    // We will bypass the external checkout and simulate a successful payment instantly.
    // In reality, this would return a Stripe Checkout URL.
    try {
      // 1. Get the plan details
      const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
      if (!plan) throw new Error("Plan not found");

      // 2. We mock the webhook behavior right here by updating the DB directly
      const { error } = await supabase
        .from('organization_subscriptions')
        .upsert({
            organization_id: organizationId,
            plan_id: planId,
            status: 'active',
            billing_provider: 'mock',
            external_customer_id: 'cus_mock_' + organizationId.substring(0, 8),
            external_subscription_id: 'sub_mock_' + Date.now(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      if (error) throw error;

      // 3. Create a fake invoice
      await supabase.from('billing_invoices').insert({
        organization_id: organizationId,
        amount_due: plan.monthly_price,
        amount_paid: plan.monthly_price,
        status: 'paid',
        billing_reason: 'subscription_create'
      });

      toast.success(`Successfully subscribed to ${plan.name} (Mock Payment)`);
      
      return successUrl;
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create mock checkout session.');
      return cancelUrl;
    }
  }

  async createCustomerPortalSession(_organizationId: string, returnUrl: string): Promise<string> {
    toast.info("Customer portal is simulated in mock mode.");
    return returnUrl;
  }

  async cancelSubscription(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_subscriptions')
      .update({
        status: 'cancelled',
        cancel_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    if (error) throw error;
    toast.success("Subscription cancelled successfully.");
  }

  async revokeSubscription(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_subscriptions')
      .update({
        status: 'suspended'
      })
      .eq('organization_id', organizationId);

    if (error) throw error;
  }
}

export const billingProvider = new MockBillingProvider();
