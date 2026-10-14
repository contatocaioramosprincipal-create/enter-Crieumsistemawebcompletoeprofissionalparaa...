# AMCF — infraestrutura independente do Enter (versão de homologação)

## Estado atual — 14/10/2026

- **Publicada e testada:** https://amcf-teste.dradilsoncouto.com.br/
- **Cloudflare Worker:** `amcf-independente` (conta Cloudflare do titular).
- **Banco Cloudflare D1:** `amcf-independente-db` (migrações `0001`, `0002`, `0003` aplicadas).
- **Código:** `independent/worker/index.js` na branch `amcf-independente` (PR em rascunho).
- **Login:** primeira ativação por chave armazenada em segredo do Worker, senha PBKDF2, cookie HttpOnly Secure SameSite Strict, sessões 8h, limite básico de tentativas, troca de senha com invalidação de sessões.
- **Módulos iniciais:** visão geral, contatos, oportunidades, casos, tarefas, agenda, propostas e financeiro. São cadastros administrativos básicos, sem paridade integral com o CRM original.
- **Smoke tests públicos:** tela carregada e validada no navegador; `/health` 200; `/api/setup-status` informa ausência de administrador; endpoints protegidos retornam 401 quando anônimos.
- **Ainda NÃO homologados:** criação do administrador real, login positivo, operações CRUD sob sessão, MFA, segurança por caso, testes com perfis reais e backup/restauração.
- **Ainda NÃO migrados:** usuários e dados existentes no Enter; documentos/anexos. O Enter original foi preservado e segue sendo a fonte de verdade.
- **Bloqueador documental:** Cloudflare R2 indisponível na conta até habilitação pelo titular; nenhum upload de documentos médicos nesta implantação.
- **Domínio de produção:** `sistema.dradilsoncouto.com.br` **não foi alterado**.

## Gestão e desenvolvimento

O código da aplicação inicial está em `worker/index.js`. O arquivo `wrangler.toml` especifica a ligação D1.

```bash
cd independent
npm install
npm run check
npm run deploy
```

O segredo `SETUP_TOKEN` já está configurado no Worker remoto. Não inclua segredos no GitHub; se mudar de projeto, configure via Wrangler ou Cloudflare Workers Secrets.

## Condições para o corte definitivo

1. Ativar primeiro administrador, testar entrada, troca de senha, todos os CRUDs e medidas contra abuso.
2. Definir modelo de acesso por usuário/caso, MFA e homologação de privacidade e segurança LGPD antes de dados reais.
3. Recuperar banco Auth/Postgres e anexos do Enter, validar contagens, relações e backups/restauração.
4. Implementar e testar funcionalidades específicas da operação médico-pericial não presentes no MVP (documentos privados, checklists, atribuições, auditoria detalhada, alertas, integrações).
5. Somente após homologação e aprovação do proprietário alterar o roteamento de `sistema.dradilsoncouto.com.br` e descontinuar o Enter.

Nunca utilizar essa versão de homologação para armazenar informações clínicas ou documentos reais enquanto as condições acima estiverem pendentes.
