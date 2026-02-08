import { supabase } from '@/lib/supabase-proxy-client';

export type AuthEventType =
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'mfa_verified'
  | 'password_reset'
  | 'email_change'
  | 'ban_check';

interface LogAuthEventParams {
  eventType: AuthEventType;
  userId?: string;
  email?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export async function logAuthEvent({
  eventType,
  userId,
  email,
  success,
  errorMessage,
  metadata
}: LogAuthEventParams) {
  try {
    const ipAddress = await getClientIp();

    // Use type assertion since auth_logs table exists in external DB but not in auto-generated types
    const { error } = await (supabase as any)
      .from('auth_logs')
      .insert({
        event_type: eventType,
        user_id: userId || null,
        email: email || null,
        ip_address: ipAddress,
        success,
        error_message: errorMessage || null,
        metadata: metadata || null
      });

    if (error) {
      console.error('Failed to log auth event:', error);
    } else {
      console.log(`✓ Auth event logged: ${eventType}`, {
        userId,
        email,
        success,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error in logAuthEvent:', err);
  }
}

async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}
