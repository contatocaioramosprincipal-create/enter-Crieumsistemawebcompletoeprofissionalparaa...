import { readFileSync, writeFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const initial = Object.entries(manifest).filter(([, item]) => item.name === 'browser-ponyfill').map(([key]) => key);
const deferred = [
 ['src/features/registry/RegistryPage.tsx', 'Listagens operacionais após autenticação e navegação.'],
 ['src/features/cases/CaseDetail.tsx', 'Detalhe de caso solicitado pelo usuário.'],
 ['src/features/team/SettingsPage.tsx', 'Administração solicitada pelo usuário.'],
 ['src/pages/PendingModule.tsx', 'Avisos de módulos não implementados nas respectivas rotas.'],
];
const routes = [
 ['/', null], ['/relacionamento', deferred[0][0]], ['/oportunidades', deferred[0][0]], ['/casos', deferred[0][0]], ['/tarefas', deferred[0][0]], ['/configuracoes', deferred[2][0]],
 ...['agenda','documentos','propostas','financeiro','relatorios'].map(path => [`/${path}`, deferred[3][0]]),
];
writeFileSync('performance-audit.config.json', JSON.stringify({ base: '/', routes: routes.map(([url, current]) => ({ url, html: 'index.html', entry: 'index.html', kind: 'app', initialDynamicImports: [...initial, ...(current ? [current] : [])], deferredDynamicImports: deferred.filter(([key]) => key !== current).map(([key, reason]) => ({ key, trigger: 'navigation', reason })), initialFonts: [] })) }, null, 2) + '\n');
