import { z } from 'zod';
import type { ResourceKey } from './resources';
export function validateRecord(resource: ResourceKey, data: Record<string, string | number | null>) {
  if (resource === 'contacts') {
    if (data.email && !z.string().email().safeParse(data.email).success) return 'Informe um e-mail válido.';
    const phone = String(data.phone ?? '').replace(/\D/g, '');
    if (phone && (phone.length < 10 || phone.length > 15)) return 'Informe telefone com DDD (10 a 15 dígitos).';
  }
  if (resource === 'cases' && data.due_on && data.opened_on && data.due_on < data.opened_on) return 'O prazo não pode ser anterior à abertura.';
  if (resource === 'tasks' && !data.case_id && !data.contact_id) return 'Vincule a tarefa a um caso ou a um contato.';
  if (resource === 'proposals' || resource === 'receivables') {
    if (data.amount_cents === null || data.amount_cents === undefined || Number(data.amount_cents) <= 0) return 'Informe um valor maior que zero.';
  }
  if (resource === 'receivables') {
    if (!data.due_on) return 'Informe o vencimento.';
    if (data.status === 'paid' && !data.paid_on) return 'Informe a data de pagamento para o status Pago.';
    if (data.status !== 'paid' && data.paid_on) return 'Remova a data de pagamento ou altere o status para Pago.';
  }
  if (resource === 'proposals' && data.status === 'expired' && !data.valid_until) return 'Informe a validade para marcar como Expirada.';
  return null;
}
