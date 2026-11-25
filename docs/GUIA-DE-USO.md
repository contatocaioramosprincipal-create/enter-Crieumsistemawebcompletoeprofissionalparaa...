# Guia de uso rápido — AMCF (Dr. Adilson e secretária)

Endereço: https://sistema.dradilsoncouto.com.br

## Antes de tudo
1. Entre com e-mail e senha.
2. Digite o código do aplicativo autenticador (MFA). Sem esse código o sistema não mostra casos nem aceita arquivos. O topo da tela deve mostrar "Conta verificada com MFA".

## Abrir um caso novo (1 minuto)
1. Menu **Casos** > **Novo caso**.
2. Escolha **Contato novo** (nome, categoria, telefone) ou **Contato já cadastrado**.
3. Preencha o título e o tipo de serviço. Clique **Criar caso**. O caso abre sozinho.

## Anexar documentos
- Dentro do caso, aba **Documentos**, ou menu **Documentos** > **Enviar documento**.
- Escolha o caso, selecione **um ou vários** arquivos (PDF, PNG ou JPEG, até 50 MB cada) e envie.
- O nome é opcional: se vazio, usa o nome do arquivo.
- Não envie prontuários ou laudos reais enquanto a homologação de LGPD não estiver concluída.

## Ver um contato
- Em **Relacionamento**, clique na linha do contato: abre a ficha com os casos dele e o botão **Novo caso**.
- Os ícones da direita (lápis, arquivo) continuam editando e arquivando.

## Quando algo não funciona
- "Selecione o caso": crie o caso primeiro (acima).
- Tela vazia ou erro de permissão: saia, entre de novo e confirme o código MFA.
- Secretária não vê um caso: o administrador precisa atribuí-lo (caso > aba Equipe).

## Rollback (para quem mantém o sistema)
Voltar o deploy anterior no Cloudflare Pages (`amcf-dr-adilson-original` > Deployments > Rollback). Nenhuma mudança de banco acompanha estas telas.
