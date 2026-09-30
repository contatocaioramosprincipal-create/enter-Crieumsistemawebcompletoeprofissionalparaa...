import { lazy, Suspense, type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import Overview from '@/pages/Overview';
import QueryState from '@/components/data-table/QueryState';
const RegistryPage = lazy(() => import('@/features/registry/RegistryPage'));
const CaseDetail = lazy(() => import('@/features/cases/CaseDetail'));
const SettingsPage = lazy(() => import('@/features/team/SettingsPage'));
const PendingModule = lazy(() => import('@/pages/PendingModule'));
const Agenda = lazy(() => import('@/pages/Agenda'));
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'));
const FinancePage = lazy(() => import('@/features/finance/FinancePage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const pending = (title: string, dependencies: string[]) => page(<PendingModule title={title} dependencies={dependencies} />);
const page = (children: ReactNode) => <Suspense fallback={<div className="data-panel"><QueryState loading /></div>}>{children}</Suspense>;
export const routers = [{ path: '/', name: 'workspace', element: <AppShell />, children: [
  { index: true, element: <Overview /> },
  { path: 'relacionamento', element: page(<RegistryPage key="contacts" resource="contacts" />) },
  { path: 'oportunidades', element: page(<RegistryPage key="opportunities" resource="opportunities" />) },
  { path: 'casos', element: page(<RegistryPage key="cases" resource="cases" />) },
  { path: 'casos/:id', element: page(<CaseDetail />) },
  { path: 'tarefas', element: page(<RegistryPage key="tasks" resource="tasks" />) },
  { path: 'configuracoes', element: page(<SettingsPage />) },
  { path: 'agenda', element: page(<Agenda />) },
  { path: 'documentos', element: page(<DocumentsPage />) },
  { path: 'propostas', element: page(<RegistryPage key="proposals" resource="proposals" />) },
  { path: 'financeiro', element: page(<FinancePage />) },
  { path: 'relatorios', element: page(<ReportsPage />) },
  { path: '*', element: pending('Página não encontrada', ['Confira o endereço ou utilize a navegação principal.']) },
] }];
declare global { interface Window { __routers__: typeof routers } }
window.__routers__ = routers;
