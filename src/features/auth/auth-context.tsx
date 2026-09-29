import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AccessContext {
  member: { id: string; name: string; email: string; role: string; status: string } | null;
  mfa: boolean;
  capabilities: { manage: boolean; team: boolean; finance: boolean; operate: boolean };
}
export const AuthContext = createContext<{
  session: Session | null; access: AccessContext | null; loading: boolean; error: string | null;
  recovery: boolean; finishRecovery: () => void; refresh: () => Promise<void>; signOut: () => Promise<void>;
} | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Contexto de autenticação indisponível.');
  return value;
}
