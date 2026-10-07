import { supabase } from '@/integrations/supabase/client';

export interface CaseStep { id: string; case_id: string; label: string; detail: string; position: number; status: string; next_action: string; next_action_on: string | null; completed_at: string | null; created_at: string }
export interface Movement { id: string; case_id: string; occurred_on: string; title: string; detail: string; source: string; external_ref: string | null; classification: string; classified_by: string; classification_note: string; needs_human_review: boolean; review_state: string; reviewed_at: string | null; created_at: string }
export interface MovementSync { id: string; case_id: string; source_kind: string; status: string; items_found: number; items_new: number; items_duplicated: number; coverage: string[]; error: string | null; started_at: string; finished_at: string | null }
export interface CourtSource { id: string; label: string; kind: string; endpoint: string; credential_name: string | null; enabled: boolean; coverage: string[]; uncovered_note: string; last_status: string; last_check_at: string | null }
export interface DocRow { id: string; case_id: string; title: string; category: string; file_name: string; mime_type: string; size_bytes: number; document_date: string | null; storage_path: string; content_hash: string | null; text_status: string; text_error: string | null; text_pages: number; text_chars: number; extraction_engine: string | null; suggested_category: string | null; category_confirmed: boolean; uploaded_by: string; created_at: string }
export interface DocPage { id: string; document_id: string; page_number: number; content: string; char_count: number; extraction_status: string }
export interface Analysis { id: string; case_id: string; version: number; title: string; status: string; summary: string; method: string; engine: string; input_fingerprint: string | null; input_summary: Record<string, number>; warnings: string[]; approved_by: string | null; approved_at: string | null; approval_note: string; created_at: string; updated_at: string }
export interface AnalysisItem { id: string; case_id: string; analysis_id: string; section: string; kind: string; position: number; title: string; content: string }
export interface SourceRow { id: string; case_id: string; owner_kind: string; owner_id: string; source_kind: string; document_id: string | null; page_number: number | null; movement_id: string | null; finding_id: string | null; question_id: string | null; reference_id: string | null; quote: string; document?: { title: string } | null; movement?: { title: string; occurred_on: string } | null; finding?: { title: string } | null; question?: { number: number } | null; reference?: { citation: string } | null }
export interface Question { id: string; case_id: string; number: number; author_kind: string; author_detail: string; topic: string; text: string; status: string; position: number }
export interface Answer { id: string; case_id: string; question_id: string; answer: string; status: string; reviewed_at: string | null }
export interface Exam { id: string; case_id: string; exam_on: string; modality: string; status: string; place: string; examined_party: string; method_notes: string }
export interface Finding { id: string; case_id: string; exam_id: string; kind: string; title: string; detail: string; source_document_id: string | null; source_page: number | null; created_at: string }
export interface Report { id: string; case_id: string; kind: string; title: string; version: number; status: string; body: string; template_id: string | null; analysis_id: string | null; readiness: { blocking?: string[]; warnings?: string[] }; approved_by: string | null; approved_at: string | null; approval_note: string; created_at: string; updated_at: string }
export interface Template { id: string; name: string; scope: string; body: string; is_default: boolean }
export interface Reference { id: string; case_id: string | null; kind: string; citation: string; identifier: string; verified: boolean; verified_at: string | null; notes: string }
export interface FinancialEvent { id: string; case_id: string; kind: string; description: string; amount_cents: number; expected_on: string | null; settled_on: string | null; status: string; reference: string }
export interface Chat { id: string; case_id: string; title: string; created_at: string }
export interface ChatMessage { id: string; chat_id: string; role: string; content: string; sources: SearchResult[]; engine: string; engine_note: string; created_at: string }
export interface Notification { id: string; kind: string; title: string; body: string; case_id: string | null; resource: string | null; resource_id: string | null; read_at: string | null; created_at: string }
export interface Readiness { questions_total: number; questions_pending: number; answers_not_reviewed: number; unsourced_items: number; documents_without_text: number; movements_unreviewed: number; references_unverified: number; blocking: string[]; warnings: string[]; can_approve_now: boolean }
export interface SearchResult { kind: 'page' | 'movement' | 'finding' | 'question'; label: string; excerpt: string; document_id?: string; page_number?: number; movement_id?: string; finding_id?: string; question_id?: string; at?: number }
export interface CaseSearch { term: string; pages: { document_id: string; document_title: string; page_number: number; excerpt: string; at: number }[]; movements: { id: string; occurred_on: string; title: string; classification: string; review_state: string; excerpt: string }[]; findings: { id: string; title: string; kind: string; excerpt: string; source_document_id: string | null; source_page: number | null }[]; questions: { id: string; number: number; status: string; text: string; answer: string }[] }
export interface MyDay { generated_at: string; finance_visible: boolean; tasks: { id: string; title: string; due_on: string | null; priority: string; status: string; reference: string | null; case_id: string | null }[]; movements: { id: string; title: string; occurred_on: string; classification: string; needs_human_review: boolean; reference: string | null; case_id: string }[]; steps: { id: string; label: string; next_action: string; next_action_on: string | null; status: string; reference: string | null; case_id: string }[]; questions: { id: string; number: number; text: string; status: string; reference: string | null; case_id: string }[]; documents: { id: string; title: string; text_status: string; reference: string | null; case_id: string }[]; reports: { id: string; title: string; kind: string; status: string; version: number; reference: string | null; case_id: string }[]; approvals: { id: string; title: string; kind: string; version: number; reference: string | null; case_id: string }[]; syncs: { id: string; status: string; source_kind: string; error: string | null; started_at: string; reference: string | null; case_id: string }[]; deposits: { id: string; kind: string; description: string; amount_cents: number; expected_on: string | null; status: string; reference: string | null; case_id: string }[]; receivables: { id: string; description: string; amount_cents: number; due_on: string; status: string; reference: string | null }[]; notifications: Notification[] }

export async function fail<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const result = await promise;
  if (result.error) throw result.error;
  return result.data as T;
}
export const SOURCE_SELECT = 'id,case_id,owner_kind,owner_id,source_kind,document_id,page_number,movement_id,finding_id,question_id,reference_id,quote,document:amcf_documents(title),movement:amcf_movements(title,occurred_on),finding:amcf_exam_findings(title),question:amcf_case_questions(number),reference:amcf_references(citation)';

export async function loadSources(ownerKind: string, ownerIds: string[]): Promise<SourceRow[]> {
  if (!ownerIds.length) return [];
  return fail<SourceRow[]>(supabase.from('amcf_source_refs').select(SOURCE_SELECT).eq('owner_kind', ownerKind).in('owner_id', ownerIds));
}
export async function caseReadiness(caseId: string): Promise<Readiness> {
  return fail<Readiness>(supabase.rpc('amcf_case_readiness', { target: caseId }));
}
export async function caseSearch(caseId: string, term: string): Promise<CaseSearch> {
  return fail<CaseSearch>(supabase.rpc('amcf_case_search', { p_case: caseId, p_term: term }));
}
export async function caseFingerprint(caseId: string): Promise<string> {
  return fail<string>(supabase.rpc('amcf_case_input_fingerprint', { target: caseId }));
}
export async function caseInputSummary(caseId: string): Promise<Record<string, number>> {
  return fail<Record<string, number>>(supabase.rpc('amcf_case_input_summary', { target: caseId }));
}
export async function caseNextAction(caseId: string) {
  return fail<{ step_id: string; label: string; next_action: string; next_action_on: string | null; status: string } | null>(supabase.rpc('amcf_case_next_action', { target: caseId }));
}
export async function myDay(): Promise<MyDay> {
  return fail<MyDay>(supabase.rpc('amcf_my_day'));
}
export async function composeAnalysis(analysisId: string) {
  return fail<{ ok: boolean; cronologia: number; evidencias: number; lacunas: number }>(supabase.rpc('amcf_analysis_compose', { p_analysis: analysisId }));
}
export async function approveAnalysis(analysisId: string, note: string) {
  return fail<{ ok: boolean; version: number; readiness: Readiness }>(supabase.rpc('amcf_analysis_approve', { p_analysis: analysisId, p_note: note }));
}
export async function approveReport(reportId: string, note: string) {
  return fail<{ ok: boolean; version: number; readiness: Readiness }>(supabase.rpc('amcf_report_approve', { p_report: reportId, p_note: note }));
}
export async function createAnalysis(caseId: string, title: string, from?: string) {
  return fail<string>(supabase.rpc('amcf_analysis_create', { p_case: caseId, p_title: title, p_from: from || null }));
}
export function toSearchResults(search: CaseSearch): SearchResult[] {
  return [
    ...search.pages.map(page => ({ kind: 'page' as const, label: `${page.document_title} · página ${page.page_number}`, excerpt: page.excerpt, document_id: page.document_id, page_number: page.page_number, at: page.at })),
    ...search.movements.map(movement => ({ kind: 'movement' as const, label: `Movimentação ${movement.occurred_on} · ${movement.title}`, excerpt: movement.excerpt, movement_id: movement.id })),
    ...search.findings.map(finding => ({ kind: 'finding' as const, label: `Achado · ${finding.title}`, excerpt: finding.excerpt, finding_id: finding.id, document_id: finding.source_document_id || undefined, page_number: finding.source_page || undefined })),
    ...search.questions.map(question => ({ kind: 'question' as const, label: `Quesito ${question.number}`, excerpt: question.answer || question.text, question_id: question.id })),
  ];
}
export function textAnswer(term: string, results: SearchResult[]): string {
  if (!results.length) return `Nenhum registro do processo contém “${term}”. Nada foi inferido: a ausência de registro não significa ausência do fato.`;
  const byKind = (kind: SearchResult['kind']) => results.filter(item => item.kind === kind).length;
  return `Foram localizados ${results.length} registro(s) do processo com “${term}”: ${byKind('page')} trecho(s) de documento, ${byKind('movement')} movimentação(ões), ${byKind('finding')} achado(s) do exame e ${byKind('question')} quesito(s). As citações abaixo são o conteúdo literal dos registros — a interpretação técnica é do médico responsável.`;
}
