import { z } from 'zod';
import type { ResourceKey } from './resources';
export function validateRecord(resource: ResourceKey, data: Record<string, string | null>) {
  if (resource === 'contacts') {
    if (data.email && !z.string().email().safeParse(data.email).success) return 'Informe um e-mail válido.';
    const phone = data.phone?.replace(/\D/g, '');
    if (phone && (phone.length < 10 || phone.length > 15)) return 'Informe telefone com DDD (10 a 15 dígitos).';
  }
  if (resource === 'cases' && data.due_on && data.opened_on && data.due_on < data.opened_on) return 'O prazo não pode ser anterior à abertura.';
  if (resource === 'tasks' && !data.case_id && !data.contact_id) return 'Vincule a tarefa a um caso ou a um contato.';
  return null;
}
