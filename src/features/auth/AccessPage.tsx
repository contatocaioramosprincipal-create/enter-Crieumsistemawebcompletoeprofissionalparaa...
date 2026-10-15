import { useState } from 'react';
import { ArrowRight, ShieldCheck, LockKeyhole, Scale, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from './auth-context';
import MfaPanel from './MfaPanel';

export default function AccessPage() {
  const { session, access, recovery, finishRecovery, refresh, signOut, error: accessError } = useAuth();
  const [mode, setMode] = useState<'login' | 'recover' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const setPasswordMode = !!session && recovery;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (setPasswordMode) {
        if (password.length < 12) { setError('Use uma senha com pelo menos 12 caracteres.'); return; }
        const result = await supabase.auth.updateUser({ password, data: { amcf_needs_password: false } });
        if (result.error) throw result.error;
        setPassword(''); finishRecovery(); await refresh();
      } else if (mode === 'signup') {
        if (name.trim().length < 2) { setError('Informe seu nome completo.'); return; }
        if (password.length < 12) { setError('Use uma senha com pelo menos 12 caracteres, escolhida por você.'); return; }
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim(), amcf_needs_password: false }, emailRedirectTo: `${location.origin}/` } });
        if (result.error) throw result.error;
        // O trigger amcf_register_user_on_signup registra a pessoa como assistant/pending.
        // A inserção direta com sessão ausente (quando confirmação de e-mail está ativa)
        // falhava indevidamente e deixava o usuário achando que a conta não tinha sido criada.
        setPassword('');
        setMessage(result.data.session
          ? 'Conta criada. Aguarde a ativação do administrador e configure o segundo fator no primeiro acesso.'
          : 'Solicitação recebida. Verifique seu e-mail para confirmar a conta. O administrador ainda precisará liberar seu acesso.');
        setMode('login');
      } else if (mode === 'recover') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/` });
        if (result.error) throw result.error;
        setMessage('Se houver uma conta elegível, as instruções serão enviadas ao e-mail informado.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setPassword('');
      }
    } catch (failure) { const described = failure instanceof Error ? failure.message : ''; setError(described && described.includes('pré-cadastro') ? described : mode === 'recover' ? 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' : mode === 'signup' ? 'Não foi possível criar a conta. Confira os dados ou fale com a administração.' : 'Não foi possível entrar. Confira os dados ou tente novamente mais tarde.'); }
    finally { setBusy(false); }
  };
  const mfa = session && access?.member && !access.mfa && !recovery && access.member.status !== 'revoked';
  const waiting = session && !recovery && !mfa;
  return <main className="access-page">
    <aside className="access-brand"><div className="flex items-center gap-4"><div className="flex h-[70px] w-[240px] items-center justify-center rounded-xl border border-gold/40 bg-[#fffdf8] px-3"><img src="/brand-adilson-couto.svg" alt="Logo AC — Adilson Couto" width="1100" height="279" className="block h-auto w-full" /></div></div>
      <div className="access-brand-copy"><div className="mb-7 h-px w-12 bg-gold" /><p className="text-xs font-medium uppercase tracking-[.22em] text-gold-light">Gestão médico-pericial</p><h2 className="mt-6 text-4xl font-medium leading-[1.2] tracking-tight lg:text-5xl">Rigor técnico.<br />Organização em<br /><span className="text-sidebar-foreground/60">cada etapa.</span></h2><p className="mt-7 max-w-sm text-sm leading-7 text-sidebar-foreground/65">Um ambiente de trabalho reservado à equipe. Relacionamentos, casos e responsabilidades em um só lugar.</p><div className="mt-12 flex items-center gap-3 text-xs text-sidebar-foreground/70"><Scale className="h-5 w-5 text-gold-light" /><span>Medicina, responsabilidade e precisão.</span></div></div>
      <p className="text-xs text-sidebar-foreground/45">Dr. Adilson Machado Couto Filho</p>
    </aside>
    <section className="access-content"><div className="flex items-center justify-between gap-4"><span className="text-xs font-medium text-muted-foreground">AMCF / ÁREA INTERNA</span><span className="status-pill status-neutral">Acesso restrito à equipe</span></div>
      {mfa ? <MfaPanel /> : waiting ? <div className="auth-form"><LockKeyhole className="mb-5 h-9 w-9 text-primary" /><p className="eyebrow">ACESSO CONTROLADO</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{access?.member?.status === 'revoked' ? 'Acesso revogado.' : 'Aguardando autorização.'}</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{accessError || 'Sua conta ainda não está liberada para acessar este ambiente. A ativação deve ser feita por um administrador autorizado.'}</p><Button className="mt-6 w-full" onClick={() => void refresh()}>Verificar autorização</Button><Button variant="ghost" className="mt-2 w-full" onClick={() => void signOut().catch(() => setError('Não foi possível sair.'))}>Sair</Button></div> : <div className="auth-form"><div className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl border bg-card"><LockKeyhole className="h-5 w-5 text-primary" /></div><p className="eyebrow">ACESSO DA EQUIPE</p><h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight">{setPasswordMode ? 'Defina sua senha.' : mode === 'recover' ? 'Recupere seu acesso.' : mode === 'signup' ? 'Primeiro acesso.\nCrie sua conta.' : 'Bem-vindo ao seu\nespaço de trabalho.'}</h1><p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">{setPasswordMode ? 'Escolha uma senha individual com no mínimo 12 caracteres.' : mode === 'recover' ? 'Informe o e-mail utilizado na sua conta individual.' : mode === 'signup' ? 'Use seu e-mail profissional e escolha uma senha individual de no mínimo 12 caracteres. O acesso aos dados só é liberado após ativação pela administração.' : 'Entre com sua conta individual para continuar.'}</p>
      <form onSubmit={submit} className="space-y-5">{mode === 'signup' && <div><label htmlFor="name" className="field-label">Nome completo</label><Input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120} /></div>}{!setPasswordMode && <div><label htmlFor="email" className="field-label">E-mail profissional</label><Input id="email" type="email" autoComplete="email" placeholder="seu.nome@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></div>}{(mode === 'login' || setPasswordMode || mode === 'signup') && <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="field-label mb-0">{setPasswordMode ? 'Nova senha' : mode === 'signup' ? 'Senha' : 'Senha'}</label>{!setPasswordMode && <button type="button" className="text-xs font-medium text-primary underline-offset-4 hover:underline" onClick={() => { setMode('recover'); setError(''); }}>Esqueceu a senha?</button>}</div><div className="relative"><Input id="password" type={show ? 'text' : 'password'} autoComplete={setPasswordMode ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" required minLength={setPasswordMode || mode === 'signup' ? 12 : 1} className="pr-12" /><button type="button" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(!show)} className="absolute right-1 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="rounded-lg bg-secondary p-3 text-sm">{message}</p>}<Button type="submit" className="h-11 w-full justify-between px-4" disabled={busy}>{busy ? 'Aguarde…' : setPasswordMode ? 'Salvar senha' : mode === 'recover' ? 'Solicitar recuperação' : mode === 'signup' ? 'Criar conta e solicitar ativação' : 'Entrar no sistema'}<ArrowRight className="h-4 w-4" /></Button></form>
      {mode === 'recover' && !setPasswordMode ? <Button variant="ghost" className="mt-3 w-full" onClick={() => { setMode('login'); setError(''); setMessage(''); }}><ArrowLeft />Voltar para o acesso</Button> : mode === 'signup' ? <Button variant="ghost" className="mt-3 w-full" onClick={() => { setMode('login'); setError(''); setMessage(''); }}><ArrowLeft />Já tenho conta</Button> : <div className="mt-7 border-t pt-6"><p className="text-xs leading-6 text-muted-foreground">Ainda não tem acesso? Solicite um convite à administração.</p><button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline">Primeiro acesso (criar conta)</button></div>}</div>}
      <footer className="mt-10 border-t pt-5"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-4 w-4" />Ambiente restrito • Contas individuais</div><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Toda operação é registrada na trilha de auditoria. Documentos e valores têm acesso restrito por perfil e por caso.</p></footer>
    </section>
  </main>;
}
