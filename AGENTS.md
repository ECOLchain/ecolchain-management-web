# AGENTS.md — Portal da empresa ECOLchain (management-web)

SPA de autenticação (OTP) + onboarding de empresas da ECOLchain.
Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + Vitest. Todo o código fica em `app/`.

## Comandos

```bash
cd app
npm install        # Node 20+ (desenvolvido com Node 22)
npm run dev        # http://localhost:3000 (proxy para a API em :8080)
npm test           # vitest run
npm run lint       # eslint (flat config, next/typescript + react-hooks)
npm run build      # build de produção
```

Antes de dar qualquer tarefa por pronta: `npm test`, `npm run lint` e `npm run build` verdes.

## Como rodar E2E local contra a API dev

1. Suba o backend (`ecolchain-management-api`): `.env` na raiz do clone (nunca commitar),
   `QUARKUS_MAILER_MOCK=true JAVA_HOME=~/jdk25 mvn quarkus:dev` → API em `http://localhost:8080`.
2. `cd app && npm run dev`. O `next.config.ts` faz rewrite same-origin:
   `/auth/*`, `/public/*`, `/me/*`, `/.well-known/*` e `/dev-mailbox` → `API_INTERNAL_URL ?? http://localhost:8080`.
   Same-origin é obrigatório: o cookie de refresh é `SameSite=Strict` com `Path=/auth`.
3. Login: `POST /auth/otp/request` dispara e-mail; com o mailer mockado o código aparece em
   `GET http://localhost:8080/dev-mailbox?to=<email>` (últimos 6 dígitos do corpo).
4. Fluxo: `/login` → `/empresa` → `/onboarding` → `/revisao` (ou `/painel` quando APPROVED).

## Decisões de auth

- `accessToken` fica **só em memória** (`src/lib/session.ts`); nada em localStorage/sessionStorage.
- Refresh: cookie HttpOnly `ecolchain_refresh` (rotativo a cada `/auth/refresh`).
  `apiFetch` (em `src/lib/api.ts`) faz `credentials: "include"` só nas chamadas `/auth/*`.
- 401 em qualquer chamada → `refreshSession()` com **single-flight** (um refresh por vez) e retry
  da request. Se o refresh falhar → sessão expira e volta para `/login`.
- Refresh proativo quando faltam <30s para expirar (`tokenExpiringSoon()`).
- **`expiraEm` diverge do contrato**: o OpenAPI documenta epoch em segundos, mas a API devolve o
  **TTL** (900). `setSession` normaliza os dois casos — não remova esse ajuste.
- Bug conhecido do backend: a 2ª rotação de refresh de uma mesma família responde
  `REFRESH_REUSED` e mata a sessão (o `revokeFamily` revoga também o token recém-criado).
  Evite chamadas espúrias a `/auth/refresh` — o single-flight existe por isso.
  Detalhes em `docs/DUVIDAS.md`.

## Contrato

- Fonte da verdade: `openapi/management-api.yaml` no repo `ecolchain-management-api`.
- Envelope em toda resposta: `{data, links, erros}`. Lógica sempre por `erros[].code`
  (ex.: `CNPJ_IN_USE`, `SUBMIT_INCOMPLETE`), nunca por title. `erros[].detail` é o texto exibido;
  `campo` direciona o erro para o input certo.
- Erros de rede e 500 → mensagem genérica (`GENERIC_ERROR` em `src/lib/errors.ts`), sem vazar detail.
- `GET /me` devolve `proximoPasso` (COMPANY_FORM, ONBOARDING, AWAITING_REVIEW, HOME, REJECTED,
  SUSPENDED) — **o roteamento é dirigido por ele** (componente `Gate`/`RequireStep`); o front
  não reimplementa a máquina de estados.
- Códigos de tipo de perfil são em PT (`GERADOR`, `TRANSPORTADOR`, `COOPERATIVA`, `CLEANTECH`,
  `RECICLADORA`, `HIGIENIZADORA`) — vêm de `GET /public/profile-types`.

## Estrutura

```
app/
  src/app/            rotas App Router (/login /empresa /onboarding /revisao /rejeitada
                      /suspendida /painel + / que redireciona pelo proximoPasso)
  src/components/     login-form, company-form, onboarding-flow, document-card,
                      status-screen, gate, session-context, ui (Button/Card/Field/Alert...)
  src/lib/            api.ts (apiFetch + endpoints), session.ts (token/refresh),
                      errors.ts (envelope→friendly), cnpj.ts (máscara + validação), types.ts
  tests/              vitest (api, session, cnpj, onboarding-flow)
docs/DUVIDAS.md       decisões e divergências encontradas vs. o contrato
```

## Regras de contribuição

- UI em pt-BR, código em inglês, commits Conventional Commits.
- Sem libs pesadas sem necessidade; sem over-engineering.
- Campos do contrato são pt-BR camelCase; paths em inglês.
- `.env` não existe aqui — segredos só no repo da API. `API_INTERNAL_URL` pode ser passada
  como variável de ambiente para apontar o proxy a outro host.
