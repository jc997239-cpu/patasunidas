# Patas Unidas

## Configuracao do Supabase

O GitHub Pages publica apenas arquivos estaticos. O Supabase fornece a
autenticacao e o banco PostgreSQL usados pelo site.

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. No painel do projeto, abra **SQL Editor**, cole o conteudo de
   `supabase-schema.sql` e execute-o.
3. Em **Project Settings > API Keys**, copie a **Project URL** e a chave
   publica **anon** (ou **publishable key**) para `url` e `anonKey` em
   `supabase-config.js`.
4. Em **Authentication > URL Configuration**, configure **Site URL** e
   **Redirect URLs** para o endereco do GitHub Pages. Para este repositorio:
   `https://jc997239-cpu.github.io/patasunidas/` e
   `https://jc997239-cpu.github.io/patasunidas/**`, respectivamente. Essas
   URLs ja foram configuradas no projeto Supabase.
5. Em **Authentication > Providers > Email**, escolha se a confirmacao por
   e-mail ficara habilitada. Com confirmacao habilitada, o cadastro mostra
   uma mensagem para verificar o e-mail antes de entrar.
6. Publique estes arquivos no GitHub Pages e teste cadastro, login e anuncios.

`supabase-config.js` contem somente valores publicos que o navegador precisa
para conectar. Nunca coloque uma chave `service_role` nesse arquivo ou no
GitHub. As tabelas usam Row Level Security; os contatos dos responsaveis ficam
em uma tabela privada e so sao revelados quando alguem solicita o contato de
um anuncio ativo.

Contas autenticadas podem publicar anuncios de adocao, animais perdidos e
animais encontrados. A pagina de adocao tambem permite consultar, encerrar e
excluir os proprios anuncios. Os anuncios ficam disponiveis publicamente
enquanto estiverem ativos.
