import { supabase } from '../lib/supabaseClient';
import { AdminUser, AdminRole } from '../types';

export interface AuthSession {
  user: AdminUser;
}

/**
 * Real authentication backed by Supabase Auth. Credentials are verified
 * server-side by Supabase (bcrypt password check, session issuance) - the
 * client never sees or compares password hashes itself. Row Level Security
 * on every table enforces access control based on the signed-in user, so
 * even a tampered client can't grant itself extra privileges.
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!trimmedEmail || !trimmedPassword) {
    return { success: false, error: 'Email and password are required' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPassword,
  });

  if (error || !data.user) {
    // Generic message regardless of whether the email or password was wrong,
    // so failed attempts don't reveal which part was incorrect.
    return { success: false, error: 'Invalid email or password' };
  }

  const profile = await fetchStaffProfile(data.user.id);
  if (!profile) {
    // A Supabase Auth user exists but has no matching staff_profiles row -
    // this account isn't provisioned as studio staff, so deny access and
    // sign them back out rather than leaving a half-authenticated session.
    await supabase.auth.signOut();
    return { success: false, error: 'This account is not authorized for studio access.' };
  }

  return { success: true, session: { user: profile } };
}

export async function fetchStaffProfile(userId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as AdminRole,
  };
}

/**
 * Reads the current Supabase Auth session (if any) and resolves it to a
 * studio staff profile. Returns null whenever there is no valid session or
 * the signed-in account isn't a provisioned staff member.
 */
export async function getStoredSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  const profile = await fetchStaffProfile(data.session.user.id);
  if (!profile) return null;

  return { user: profile };
}

export async function clearStoredSession(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Role-based permission checker
 */
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  OWNER: ['*'], // full access
  FINANCE: ['orders:read', 'orders:write:payment', 'customers:read', 'invoices:read', 'invoices:write'],
  PRODUCTION_HEAD: ['orders:read', 'production:read', 'production:write', 'shipping:read', 'shipping:write'],
};

export function checkRolePermission(role: AdminRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}
