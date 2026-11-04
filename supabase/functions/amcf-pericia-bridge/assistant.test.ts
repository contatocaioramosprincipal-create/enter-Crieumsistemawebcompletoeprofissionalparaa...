import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_PROMPT, buildMessages, completionBody, extractAnswer, sanitizeHistory } from './assistant.ts';

test('sanitizeHistory ignora lixo e papéis inválidos', () => {
  assert.deepEqual(sanitizeHistory('x'), []);
  assert.deepEqual(sanitizeHistory([null, 1, { role: 'system', text: 'oi' }, { role: 'user' }]), []);
});

test('sanitizeHistory limita turnos, tamanho e começa por usuário', () => {
  const raw = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'a'.repeat(5000) }));
  const out = sanitizeHistory(raw);
  assert.ok(out.length <= 8);
  assert.ok(out.every(t => t.text.length <= 4000));
  assert.ok(out.reduce((n, t) => n + t.text.length, 0) <= 16000);
  assert.equal(out[0]?.role, 'user');
});

test('sanitizeHistory remove caracteres de controle', () => {
  const out = sanitizeHistory([{ role: 'user', text: 'a\u0000b\u0007c' }]);
  assert.equal(out[0].text, 'abc');
});

test('buildMessages: sistema primeiro, dados do processo como usuário e pergunta por último', () => {
  const m = buildMessages([{ role: 'user', text: 'oi' }, { role: 'assistant', text: 'olá' }], '[Quesito 1] texto', 'e agora?');
  assert.equal(m[0].role, 'system');
  assert.equal(m[0].content, SYSTEM_PROMPT);
  assert.ok(m[1].content.startsWith('DADOS DO PROCESSO'));
  assert.equal(m.at(-1)!.content, 'e agora?');
  assert.equal(m.at(-1)!.role, 'user');
  assert.equal(m.filter(x => x.role === 'system').length, 1);
});

test('buildMessages sem contexto não inclui bloco de dados', () => {
  const m = buildMessages([], '  ', 'oi');
  assert.equal(m.length, 2);
});

test('extractAnswer valida o formato e corta o tamanho', () => {
  assert.equal(extractAnswer(null), '');
  assert.equal(extractAnswer({ choices: [] }), '');
  assert.equal(extractAnswer({ choices: [{ message: { content: '  ok  ' } }] }), 'ok');
  assert.equal(extractAnswer({ choices: [{ message: { content: 'x'.repeat(40000) } }] }).length, 30000);
});

test('completionBody só usa reasoning_effort em modelos de raciocínio', () => {
  assert.equal(completionBody('gpt-5-mini', []).reasoning_effort, 'low');
  assert.equal(completionBody('gpt-4o', []).reasoning_effort, undefined);
});
