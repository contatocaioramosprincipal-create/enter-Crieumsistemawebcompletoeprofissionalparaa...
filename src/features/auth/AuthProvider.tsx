import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, type AccessContext } from './auth-context';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<AccessContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(new URLSearchParams(location.search).has('definir'));
  const generation = useRef(0);
  const previousUser = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const { data, error: failure } = await supabase.rpc('amcf_access_context');
    if (current !== generation.current) return;
    setError(failure ? 'Não foi possível verificar suas permissões. Tente novamente.' : null);
    setAccess(failure ? null : data as unknown as AccessContext);
    setLoading(false);
  }, []);
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    const apply = (next: Session | null) => {
      if (!mounted) return;
      if (previousUser.current !== (next?.user.id ?? null)) {
        cache.clear();
        previousUser.current = next?.user.id ?? null;
      }
      setSession(next);
      if (next?.user.user_metadata?.amcf_needs_password) setRecovery(true);
      if (!next) { generation.current++; setAccess(null); setLoading(false); return; }
      clearTimeout(timer);
      timer = setTimeout(() => { if (mounted) void refresh(); }, 0);
    };
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      apply(next);
    });
    void supabase.auth.getSession().then(({ data, error: failure }) => {
      if (failure && mounted) { setError('Sua sessão não pôde ser recuperada.'); setLoading(false); }
      else apply(data.session);
    });
    const token = generation;
    return () => { mounted = false; token.current++; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, [cache, refresh]);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30_000);
    const check = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [session, refresh]);
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    cache.clear(); setAccess(null); setSession(null); setRecovery(false);
  };
  return <AuthContext.Provider value={{ session, access, loading, error, recovery, finishRecovery: () => { setRecovery(false); history.replaceState(null, '', location.pathname); }, refresh, signOut }}>{children}</AuthContext.Provider>;
}
