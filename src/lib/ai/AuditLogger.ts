import { supabase } from '../supabase';

export class AuditLogger {
  static async log(
    userId: string,
    prompt: string,
    response: string,
    executionTimeMs: number,
    toolsUsed: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_audit_logs')
        .insert({
          user_id: userId,
          prompt,
          response,
          execution_time_ms: executionTimeMs,
          tools_used: toolsUsed,
        });

      if (error) {
        console.error('Failed to log AI audit event', error);
      }
    } catch (err) {
      console.error('Error logging AI audit event', err);
    }
  }
}
