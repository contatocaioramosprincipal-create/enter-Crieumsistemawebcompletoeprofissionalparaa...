-- AMCF independente: núcleo administrativo, sem dados clínicos. SQLite / Cloudflare D1.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','medico','assistente')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, organization_id TEXT REFERENCES organizations(id), notes TEXT, owner_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS contacts_name_idx ON contacts(name);
CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL REFERENCES contacts(id), title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'novo', amount_cents INTEGER NOT NULL DEFAULT 0, owner_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS opportunities_contact_idx ON opportunities(contact_id);
CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, title TEXT NOT NULL, contact_id TEXT REFERENCES contacts(id), status TEXT NOT NULL DEFAULT 'aberto', owner_id TEXT REFERENCES users(id), opened_at TEXT NOT NULL DEFAULT (datetime('now')), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS case_assignments(case_id TEXT NOT NULL REFERENCES cases(id), user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(case_id,user_id));
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', due_at TEXT, case_id TEXT REFERENCES cases(id), assignee_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_at);
CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY, title TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, case_id TEXT REFERENCES cases(id), contact_id TEXT REFERENCES contacts(id), owner_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), CHECK (ends_at > starts_at));
CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id), opportunity_id TEXT REFERENCES opportunities(id), title TEXT NOT NULL, amount_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'rascunho', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS receivables(id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id), case_id TEXT REFERENCES cases(id), title TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0), due_at TEXT, paid_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, resource_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_log(resource,resource_id,created_at);
-- Documentos exigem storage privado, antivírus e controle de acesso antes de uso real.
