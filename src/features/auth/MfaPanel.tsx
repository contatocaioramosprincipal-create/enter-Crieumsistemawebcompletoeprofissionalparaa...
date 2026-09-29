import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from './auth-context';
export default function MfaPanel() {
  const { refresh, signOut } = useAuth();
  const [factor, setFactor] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const start = async () => {
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.find(f => f.status === 'verified');
      if (verified) { setFactor(verified.id); return; }
      for (const pending of data.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified' && f.friendly_name === 'Gestão médico-pericial')) {
        const result = await supabase.auth.mfa.unenroll({ factorId: pending.id });
        if (result.error) throw result.error;
      }
      const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Gestão médico-pericial' });
      if (enrolled.error) throw enrolled.error;
      setFactor(enrolled.data.id); setQr(enrolled.data.totp.qr_code);
    } catch { setError('Não foi possível preparar o segundo fator. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); if (!factor) return;
    setBusy(true); setError('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor, code });
    if (error) setError('Código inválido ou expirado. Use o código atual do autenticador.');
    else await refresh();
    setBusy(false);
  };
  return <section className="auth-form"><ShieldCheck className="mb-5 h-9 w-9 text-primary" /><p className="eyebrow">SEGUNDA ETAPA</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Proteja seu acesso.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A verificação em duas etapas é obrigatória para acessar as informações da equipe.</p>{!factor ? <Button className="mt-7 w-full" onClick={start} disabled={busy}>{busy ? 'Preparando…' : 'Configurar ou verificar autenticador'}</Button> : <form onSubmit={verify} className="mt-6 space-y-4">{qr && <><img src={qr.startsWith('data:') ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} alt="QR code para cadastrar seu autenticador" className="mx-auto h-44 w-44" /><p className="text-sm text-muted-foreground">Escaneie no aplicativo autenticador. Não compartilhe este código.</p></>}<label className="field-label" htmlFor="mfa-code">Código de seis dígitos</label><Input id="mfa-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /><Button className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Verificando…' : 'Verificar e continuar'}</Button></form>}{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<Button variant="ghost" className="mt-4 w-full" onClick={() => void signOut().catch(() => setError('Não foi possível encerrar a sessão.'))}>Sair da conta</Button></section>;
}
