import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, UsersRound, GitBranch, BriefcaseBusiness, ListTodo, CalendarDays, Files, FileText, Wallet, ChartNoAxesCombined, Settings2, Menu, X, LogOut, ShieldCheck, ChevronDown, Bot } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import AccessPage from '@/features/auth/AccessPage';
import FloatingPericiaAssistant from '@/components/layout/FloatingPericiaAssistant';
import { Button } from '@/components/ui/button';
import { roleLabel } from '@/lib/format';
import { toast } from 'sonner';

const navigation = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/relacionamento', label: 'Relacionamento', icon: UsersRound },
  { to: '/oportunidades', label: 'Oportunidades', icon: GitBranch },
  { to: '/casos', label: 'Casos', icon: BriefcaseBusiness },
  { to: '/assistente-pericia', label: 'Assistente de Perícia', icon: Bot },
  { to: '/tarefas', label: 'Tarefas e prazos', icon: ListTodo },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/documentos', label: 'Documentos', icon: Files },
  { to: '/propostas', label: 'Propostas', icon: FileText, financial: true },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, financial: true },
  { to: '/relatorios', label: 'Relatórios', icon: ChartNoAxesCombined },
  { to: '/configuracoes', label: 'Equipe e configurações', icon: Settings2 },
];
export default function AppShell() {
  const { session, access, loading, recovery, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div role="status" className="text-center"><div className="brand-monogram mx-auto mb-5 bg-primary text-primary-foreground">AM</div><p className="text-sm text-muted-foreground">Verificando acesso…</p></div></div>;
  if (!session || !access?.capabilities.operate || recovery) return <AccessPage />;
  const member = access.member!;
  const current = navigation.find(n => n.to === location.pathname)?.label || 'Detalhe do caso';
  return <div className="app-shell"><a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    {menu && <button aria-label="Fechar navegação" className="nav-scrim" onClick={() => setMenu(false)} />}
    <aside className={`app-sidebar ${menu ? 'is-open' : ''}`} aria-label="Navegação principal"><div className="flex items-center gap-3 px-5 py-7"><div className="brand-monogram h-10 w-10 text-base">AM</div><div><p className="text-[12px] font-semibold tracking-wider">ADILSON MACHADO</p><p className="mt-1 text-[10px] tracking-[.2em] text-sidebar-foreground/55">GESTÃO MÉDICO-PERICIAL</p></div><button onClick={() => setMenu(false)} aria-label="Fechar menu" className="ml-auto lg:hidden"><X size={18} /></button></div><div className="mx-5 mb-6 border-t border-sidebar-border" /><p className="mb-3 px-6 text-[10px] font-semibold tracking-[.2em] text-sidebar-foreground/40">ESPAÇO DE TRABALHO</p><nav className="flex-1 space-y-1 overflow-y-auto px-3">{navigation.filter(n => !n.financial || access.capabilities.finance).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.6} /><span>{label}</span></NavLink>)}</nav><div className="m-4 rounded-lg border border-sidebar-border p-3"><div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/80"><ShieldCheck size={15} className="text-gold-light" />Acesso monitorado</div><p className="mt-2 text-[11px] leading-5 text-sidebar-foreground/45">Cada criação, alteração e exclusão é registrada na trilha de auditoria.</p></div><div className="flex items-center gap-3 border-t border-sidebar-border p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">{member.name.split(' ').slice(0, 2).map(s => s[0]).join('')}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{member.name}</p><p className="mt-1 text-[10px] text-sidebar-foreground/50">{roleLabel[member.role]}</p></div><button aria-label="Sair da conta" className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={() => void signOut().catch(() => toast.error('Não foi possível sair.'))}><LogOut size={16} /></button></div></aside>
    <div className="app-workspace"><header className="app-topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir navegação"><Menu /></Button><span className="hidden text-xs text-muted-foreground sm:inline">Espaço de trabalho</span><span className="hidden text-border sm:inline">/</span><span className="text-xs font-medium">{current}</span></div><NavLink to="/configuracoes" className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} className="text-success" /><span className="hidden sm:inline">Conta verificada com MFA</span><ChevronDown size={12} /></NavLink></header><main id="main-content" className="workspace-content"><Outlet /></main><footer className="workspace-footer"><span>AMCF · Gestão médico-pericial</span><span>Dados persistidos · Acesso por atribuição</span></footer></div>
    <FloatingPericiaAssistant />
  </div>;
}
