# AMCF original — implantação independente do Enter

**Situação:** frontend React original preservado e preparado para Supabase próprio, ainda NÃO homologado/implantado. Não confundir com o protótipo D1/Workers. Não trocar DNS ou excluir ambiente Enter antes da migração e testes.

## Meta contratada

- Primeiros aproximadamente 2 meses no **Supabase Free** (consulta na organização conectada retornou custo mensal de criação **0**).
- Hospedagem frontend: **Cloudflare Pages** com GitHub, domínio final `sistema.dradilsoncouto.com.br`.
- Banco/Auth/Storage: projeto **Supabase independente**, região Brasil se o plano permitir, senão confirmar residência dos dados com o cliente.
- Manter exatamente as telas e identidade azul-marinho/dourado do sistema React original.
- Usuário de operação inicial: administrador autorizado cria conta, confirma email, habilita MFA e recebe promoção exclusivamente via procedimento privilegiado. Dr. Adilson deve poder cadastrar sua senha com perfil **Médico**, nunca admin por padrão.

## Preparação realizada

1. Removidas dependências da **analytics e do plugin Vite Enter** de `package.json`; inicialização analytics retirada de `src/main.tsx`.
2. Supabase JS lê somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; se faltar variável, o build não deve ser levado à produção.
3. Migrações históricas copiadas para arquivos `*.sql` ordenados no padrão de nomes do CLI. Scripts transacionais de teste/rollback e promoção ligada a UUID do ambiente antigo removidos da lista de execução.
4. Criado trigger seguro de Auth: cadastro sempre `assistant/pending`; não existe promoção automática. `AccessPage` não tenta inserir membro quando falta sessão pela confirmação de email.
5. `.github/workflows/amcf-independente-validate.yml` com checagem estática, testes e build.

## Próximas ações obrigatórias para efetivar o serviço

1. Criar um projeto `AMCF Dr. Adilson` no Supabase Free, na organização que o usuário indicar e aprovar (o projeto ainda não foi criado).
2. Aplicar as migrações `*.sql` no ambiente novo, **conferir erros uma a uma**; rever funções Security Definer, RLS, grants e políticas Storage.
3. Configurar Storage privado e publicar Edge Function `amcf-files`; testar 401/403 anon e atribuições com contas teste.
4. Configurar Supabase Auth: SMTP permitido (plano gratuito tem limites), emails e redirects para domínio final; exigir MFA TOTP; conta admin (conforme abaixo).
5. Definir variáveis `VITE_SUPABASE_*` no Cloudflare Pages para a branch de migração. Instalar com `pnpm install --no-frozen-lockfile`, build `pnpm run build:prod`, pasta `dist`.
6. Testar signup, confirmação, MFA, autorização, contas `doctor`/assistant, casos atribuídos, documentos privados, relatórios, financeiro, exportações, UX desktop/mobile, APIs e backups, com dados sintéticos.
7. Fazer **exportação legítima** do Enter: dados, contas e objetos privados, via export administrativo seguro. **Não** copiar hashes/senhas, service_role para código, nem fingir dados migrados.
8. Verificar recursos não entregues ou dependentes de integração: DataJud/CNJ, PJe, e-SAJ, OCR, resumos com IA, pesquisa científica, emissão PDF/DOCX, alertas e mensageria. Esses precisam de integrações, credenciais, custos externos e homologação individuais. Não prometer que funcionam só por haver tela.
9. Depois da homologação, migrar `sistema.dradilsoncouto.com.br` mantendo o site institucional no domínio principal intacto. Testar HTTPS, rotas SPA e login em mobile.
10. Antes de começar a usar dados médico-periciais reais, revisar LGPD, contrato de tratamento, região dos dados, retenção, antivírus de arquivos, backups/restore, permissão por caso e 2FA. Sem backup confiável e restauração testada, limitar a registros administrativos sem documentos médicos sensíveis.

## Inicialização segura do administrador

- Usuário inicial se cadastra normalmente no frontend, verifica e-mail, registra MFA; trigger gera uma linha `amcf_members` com `assistant/pending`.
- Administrador da conta Supabase confirma identidade e realiza **apenas uma vez** pelo SQL Editor seguro do projeto:
```sql
-- Substituir pelo e-mail profissional exato do administrador que confirmou a conta.
UPDATE public.amcf_members m
SET role='admin', status='active'
FROM auth.users u
WHERE m.id=u.id
  AND lower(u.email)=lower('EMAIL_AUTORIZADO_AQUI')
  AND u.email_confirmed_at IS NOT NULL
  AND m.status='pending';
```
- Dr. Adilson cadastra a própria senha. Após confirmação, o administrador AMCF atribui **doctor/active** na aba Equipe. Não criar senha compartilhada.

## Restrição do plano gratuito

O Supabase Free tem cotas e pode pausar projeto inativo. Avaliar quotas reais ao criar e revisar mensalmente, incluindo banco, Storage, egress e e-mail. **Não existe backup diário automático de produção incluído como garantia no Free**. Planejar exportação criptografada e restauração; nenhuma exportação foi configurada ainda. Reavaliar plano pago após ~2 meses, mas não considerar o Free adequado por si só para dados de pacientes.

## GitHub/segurança

Repositório original está visível publicamente. Nunca commitar senhas, tokens, dados de pacientes, service role, uploads ou dumps. Revisar histórico antes de habilitar integração e testar com dados sintéticos.

## Infraestrutura provisionada em 14/10/2026
- Projeto Supabase Free na região sa-east-1: `phjhedoavxicpsvuxmls`, ACTIVE_HEALTHY na criação.
- Migrações de produção aplicadas na ordem, todas com success=true.
- Storage bucket privado `amcf-documentos` confirmado.
- Edge Functions `amcf-files` e `amcf-invite` publicadas (JWT exigido).
- Cloudflare Pages `amcf-dr-adilson-original` criado e ligado à branch `amcf-react-supabase-independente`, com URL e chave *pública* do Supabase em variáveis de build. Ainda sem deployment verificado.
- Autenticação/usuários, QA, migração de dados legados, repositório público, documentos clínicos e backups continuam pendentes. Não declarar produção liberada.
