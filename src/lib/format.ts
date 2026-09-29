import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export function dateLabel(value: string | null | undefined) { return value ? format(parseISO(value), 'dd MMM yyyy', { locale: ptBR }) : 'Sem data'; }
export function todayISO() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export const currency = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const roleLabel: Record<string, string> = { admin: 'Administrador', doctor: 'Médico responsável', assistant: 'Assistente' };
export function errorMessage(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e?.code === '42501') return 'Você não tem permissão para esta operação. Verifique sua atribuição e autenticação.';
  if (e?.code === '23505') return 'Já existe um registro com esta referência. Confira antes de continuar.';
  if (e?.code === '23503') return 'O registro está vinculado a outras informações ou o vínculo não está disponível.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
