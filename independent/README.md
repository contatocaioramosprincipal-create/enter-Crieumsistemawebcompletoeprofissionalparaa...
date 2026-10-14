# AMCF — implementação independente (em andamento)

**Não utilizar com dados de pacientes antes da homologação.**

- Fonte: `worker/index.js`. Hospedagem planejada: Cloudflare Workers (não Enter).
- Banco de dados: D1 `amcf-independente-db`, criado na conta Cloudflare existente.
- Migrações `db/0001_init.sql` e `db/0002_auth.sql` já foram aplicadas ao D1 remoto.
- Autenticação: senha com PBKDF2, sessão via cookie HttpOnly e token aleatório. Primeiro administrador criado via `/api/setup`, exigindo `SETUP_TOKEN` como segredo de Worker.
- Não publicar o valor de `SETUP_TOKEN` no GitHub. Configure com `npx wrangler secret put SETUP_TOKEN`, dentro de `independent`.
- Depois execute `npm install`, `npm run check` e `npm run deploy` (com Wrangler autenticado na conta correta).
- O `/health` deve retornar `{"ok":true,"service":"amcf-independent"}`. Testar login, CRUD e sessões antes da entrada em operação.
- **Não apontar `sistema.dradilsoncouto.com.br` para o novo Worker antes da migração dos dados e homologação.**
- **Não confundir com o Cloudflare Pages `amcf-crm-independente`**, ainda ligado ao repositório original e não implantado.
- Pendências críticas: hardening do login (rate limiting, auditoria de tentativas e MFA), papéis e concessões por caso, validação de dados, R2 privado para documentos, exportação/importação dos dados do Enter, restauração/backup, testes E2E, mobile e LGPD.
- A versão nova é um núcleo operacional administrativo e **não** equivale à aplicação médico-pericial completa original.
