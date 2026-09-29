import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord } from '../../.test-build/validation.js';
describe('Validação administrativa', () => {
 it('aceita contato com e-mail e telefone válidos', () => assert.equal(validateRecord('contacts', { email: 'sintetico@example.test', phone: '(71) 99735-7789' }), null));
 it('recusa e-mail inválido', () => assert.notEqual(validateRecord('contacts', { email: 'invalido' }), null));
 it('recusa telefone sem DDD', () => assert.notEqual(validateRecord('contacts', { phone: '1234' }), null));
 it('permite contato sem e-mail ou telefone', () => assert.equal(validateRecord('contacts', { email: null, phone: null }), null));
 it('recusa prazo anterior à abertura', () => assert.notEqual(validateRecord('cases', { opened_on: '2026-09-29', due_on: '2026-09-28' }), null));
 it('permite prazo no mesmo dia', () => assert.equal(validateRecord('cases', { opened_on: '2026-09-29', due_on: '2026-09-29' }), null));
 it('exige caso ou contato para tarefa', () => assert.notEqual(validateRecord('tasks', { case_id: null, contact_id: null }), null));
 it('permite tarefa vinculada apenas ao caso', () => assert.equal(validateRecord('tasks', { case_id: 'caso-demo', contact_id: null }), null));
});
