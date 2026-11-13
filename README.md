# Amigo Secreto do Chinelo 🩴

- **`/`**: página dos participantes (nome, e-mail e número do chinelo). Também serve como link geral para divulgar em grupo; quem se inscreve recebe um e-mail de confirmação.
- **`/admin`**: página do organizador, protegida por senha (tela de login em `/login`). Por ela você envia os convites, acompanha quem se inscreveu e, a partir da data do sorteio, clica em **Sortear e enviar resultados**.

O sorteio não repete ninguém e ninguém tira a si mesmo. Cada pessoa recebe por e-mail o nome e o número do chinelo de quem tirou. O resultado não aparece na tela do organizador.

## Requisitos

- Node.js 18 ou superior
- Uma conta de e-mail com acesso SMTP

## Instalação

```bash
npm install
cp .env.example .env     # edite com seus dados
npm start
```

Os dados ficam no arquivo `data.json`, na pasta do projeto. Não apague esse arquivo depois do sorteio, porque é ele que guarda o resultado.

## Configuração (.env)

| Variável | O que é |
|---|---|
| `BASE_URL` | Endereço público do site (vai no link do convite) |
| `ADMIN_PASSWORD` | Senha da página /admin |
| `DRAW_DATE` | Data do sorteio, no formato AAAA-MM-DD (horário de São Paulo) |
| `AUTO_SORTEIO` | `true` (padrão): sorteia e envia sozinho no dia. `false`: só pelo botão |
| `AUTO_HORA` | Horário do sorteio automático, HH:MM (São Paulo). Padrão `09:00` |
| `OBS` | Texto extra nos e-mails (opcional) |
| `SMTP_*`, `MAIL_FROM` | Dados do servidor de e-mail |

### E-mail do Microsoft 365

Use `smtp.office365.com`, porta `587`, `SMTP_SECURE=false`. A caixa precisa ter o **SMTP AUTH** habilitado no admin do Microsoft 365. Se a conta usar MFA, gere uma senha de app ou use outra caixa de envio.

## Publicar no Railway

1. Instale a CLI e entre: `npm i -g @railway/cli` e `railway login`
2. Na pasta do projeto: `railway init` (cria o projeto) e `railway up` (envia o código; `.env` e `data.json` ficam de fora pelo `.gitignore`)
3. No painel do serviço:
   - **Volume**: adicione um volume montado em `/data`. Sem ele, os inscritos somem a cada nova publicação.
   - **Variables**: copie as variáveis do `.env` (menos `PORT`, que o Railway define sozinho).
   - **Settings → Networking → Generate Domain**: gera o endereço público. Coloque esse endereço em `BASE_URL`.
   - Deixe o **Serverless / App Sleeping desligado**, para o sorteio automático rodar no horário.
4. Atenção: o Railway só libera envio por SMTP no plano **Pro**. Nos planos Free/Trial/Hobby os e-mails não saem.

## Produção

- Rode atrás de HTTPS (Nginx, IIS ou o proxy que você já usa). A senha do admin é enviada na tela de login, e com HTTPS o cookie da sessão fica marcado como seguro.
- Para manter rodando, use `pm2 start server.js --name amigo-secreto` ou um serviço do sistema.
- Antes do dia, faça um teste com 3 e-mails seus e `DRAW_DATE` no passado. Depois apague o `data.json` e volte a data.
