export const integrationScopes: Record<string, string> = {
  'contacts:write': 'Criar e atualizar contatos',
  'opportunities:write': 'Criar e atualizar oportunidades e alterar etapa',
  'cases:write': 'Criar casos',
  'tasks:write': 'Criar e atualizar tarefas',
  'activities:write': 'Registrar atividades e notas',
  'agenda:read': 'Consultar agenda',
  'events:read': 'Ler eventos para automações',
};
export const integrationEvents = ['contact.created', 'opportunity.created', 'opportunity.stage_changed', 'opportunity.won', 'case.created', 'task.created', 'task.completed'];
export const integrationEndpoints = ['amcf_api_ping', 'amcf_api_contact_upsert', 'amcf_api_opportunity_upsert', 'amcf_api_opportunity_stage', 'amcf_api_case_create', 'amcf_api_task_upsert', 'amcf_api_activity_create', 'amcf_api_agenda', 'amcf_api_events'];
export const randomToken = () => { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 44); };
export const hashToken = async (token: string) => { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join(''); };
