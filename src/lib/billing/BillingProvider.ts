// src/lib/billing/BillingProvider.ts

export interface SubscriptionInfo {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired' | 'suspended';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
}

export interface IBillingProvider {
  /**
   * Initializes a checkout session and returns a URL to redirect the user to.
   */
  createCheckoutSession(
    organizationId: string, 
    planId: string, 
    successUrl: string, 
    cancelUrl: string
  ): Promise<string>;

  /**
   * Creates a portal session for users to manage their billing, payment methods, and invoices.
   */
  createCustomerPortalSession(
    organizationId: string, 
    returnUrl: string
  ): Promise<string>;

  /**
   * Cancels a subscription at the end of the current billing cycle.
   */
  cancelSubscription(organizationId: string): Promise<void>;

  /**
   * Immediately suspends or revokes access.
   */
  revokeSubscription(organizationId: string): Promise<void>;
}
