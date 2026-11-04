# Conectar Claude ao AMCF: roteiro curto

1. **GitHub**: em Claude Desktop/Claude.ai use `+` > **Add from GitHub** e selecione `contatocaioramosprincipal-create/enter-Crieumsistemawebcompletoeprofissionalparaa...`. Para edição de código, prefira Claude Code, com clone local da branch `amcf-react-supabase-independente`.
2. **n8n**: na conta `caioramos.app.n8n.cloud`, vá a **Settings > Instance-level MCP**, habilite o acesso e siga **Connect a client > Claude**. URL do MCP: `https://caioramos.app.n8n.cloud/mcp-server/http`. Claude Desktop: **Settings > Connectors > Add custom connector**. Depois autorize via OAuth. Isso é diferente da API REST pública; não exige copiar a chave da API REST em teste.
3. **Supabase**: MCP oficial do projeto `phjhedoavxicpsvuxmls`: `https://mcp.supabase.com/mcp?project_ref=phjhedoavxicpsvuxmls&read_only=true&features=database,docs,debugging,functions`. Adicione em **Connectors > Add custom connector**, faça login via OAuth. Essa conexão é read-only inicial; revisar mudanças e autorizar escrita somente para aplicar migrações aprovadas.
4. **Claude Code**: na pasta do repositório, `claude` > `/mcp` para confirmar servidores e autorizar. O arquivo `.mcp.json` já foi adicionado à branch de migração. A conexão de GitHub para leitura de repositório no chat Claude não substitui permissões para commits/deploys.
5. Use as instruções de `CLAUDE.md`. Peça para inspecionar os dois IDs antigos e seus backups, criar **versões novas desativadas**, configurar credenciais com OAuth/secret manager, testar antes da publicação.

**Não publique automaticamente nem envie tokens pelo chat.** No fim, peça ao Claude links para os dois novos workflows, evidências de testes e indicação de rollback. 
