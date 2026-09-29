import { lazy, Suspense, type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import Overview from '@/pages/Overview';
import QueryState from '@/components/data-table/QueryState';
const RegistryPage = lazy(() => import('@/features/registry/RegistryPage'));
const CaseDetail = lazy(() => import('@/features/cases/CaseDetail'));
const SettingsPage = lazy(() => import('@/features/team/SettingsPage'));
const PendingModule = lazy(() => import('@/pages/PendingModule'));
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
  { path: 'agenda', element: pending('Agenda', ['Calendário mensal, semanal e diário com persistência.', 'Recorrência e registro de eventos por caso.', 'Conexão real ao Google Calendar mediante autorização.']) },
  { path: 'documentos', element: pending('Documentos', ['Upload privado e autorização por caso e classificação.', 'Validação de arquivos, versões e registro de acesso.', 'Varredura de malware, criptografia e retenção verificadas.']) },
  { path: 'propostas', element: pending('Propostas', ['Escopo, entregáveis e valores protegidos por perfil.', 'Versões de proposta e PDF após revisão.', 'Contratos vinculados ao caso.']) },
  { path: 'financeiro', element: pending('Financeiro', ['Cobranças administrativas e recebimentos parciais.', 'Comprovantes privados e proteção contra acesso de assistentes.', 'Indicadores financeiros calculados no banco.']) },
  { path: 'relatorios', element: pending('Relatórios', ['Filtros por período, origem, serviço e responsável.', 'Agregações e exportações limitadas ao escopo de acesso.', 'Testes de consistência e proteção contra inferência de dados.']) },
  { path: '*', element: pending('Página não encontrada', ['Confira o endereço ou utilize a navegação principal.']) },
] }];
declare global { interface Window { __routers__: typeof routers } }
window.__routers__ = routers;
