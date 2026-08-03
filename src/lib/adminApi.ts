/**
 * adminApi.ts
 * Client-side helper that calls the `admin-user-actions` Supabase Edge Function.
 * All privileged operations run server-side so the Service Role key is never exposed in the browser.
 */

import { supabase } from './supabase';

const FUNCTION_NAME = 'admin-user-actions';

async function callAdminFunction(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
  });

  if (error) {
    console.error('Edge function invocation error:', error);
    if (error.context) {
        console.error('Error Context:', await error.context.text().catch(() => 'no text'));
    }
    throw new Error(error.message || 'Edge function error');
  }
  if (data && !data.success) {
    console.error('Edge function returned error payload:', data);
    throw new Error(data.error || 'Operation failed');
  }

  return data;
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

/** Permanently delete a single user from auth.users */
export async function adminDeleteUser(userId: string) {
  return callAdminFunction({ action: 'delete_user', user_id: userId });
}

/** Permanently delete multiple users from auth.users in one request */
export async function adminBulkDeleteUsers(userIds: string[]) {
  return callAdminFunction({ action: 'bulk_delete_users', user_ids: userIds });
}

/**
 * Update a user's auth record and/or public profile.
 * Supported fields: email, password, name, role_id, is_active, email_confirm
 */
export async function adminUpdateUser(userId: string, updates: {
  email?: string;
  password?: string;
  name?: string;
  role_id?: string | null;
  is_active?: boolean;
  email_confirm?: boolean;
}) {
  return callAdminFunction({ action: 'update_user', user_id: userId, data: updates });
}

/** Confirm a single user's email address */
export async function adminConfirmEmail(userId: string) {
  return callAdminFunction({ action: 'confirm_email', user_id: userId });
}

/** Confirm email for all users who don't have it confirmed yet */
export async function adminConfirmAllEmails() {
  return callAdminFunction({ action: 'bulk_confirm_emails' });
}
