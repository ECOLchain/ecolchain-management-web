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
4. Fluxo: `/pt-br/login` → `/pt-br/empresa` → `/pt-br/onboarding` → `/pt-br/revisao`
   (ou `/painel` quando APPROVED). `/` redireciona para `/pt-br`.

## Decisões de auth

- `accessToken` fica **só em memória** (`src/lib/session.ts`); nada em localStorage/sessionStorage.
- Refresh: cookie HttpOnly `ecolchain_refresh` (rotativo a cada `/auth/refresh`).
  `apiFetch` (em `src/lib/api.ts`) faz `credentials: "include"` só nas chamadas `/auth/*`.
- 401 em qualquer chamada → `refreshSession()` com **single-flight** (um refresh por vez) e retry
  da request. Se o refresh falhar → sessão expira e volta para `/login`.
- Refresh proativo quando faltam <30s para expirar (`tokenExpiringSoon()`).
- `expiraEm` é **TTL em segundos** (900) conforme o contrato (alinhado na API em `488841f`).
  `setSession` ainda aceita epoch por tolerância — não remova o ajuste.
- **Sessão expirada**: se o refresh falhar (401, cookie ausente, `REFRESH_REUSED`),
  `expire()` marca o estado `expired` e os guards levam a `/{locale}/login?motivo=sessao-expirada`
  — a tela de login exibe o aviso "sessão expirada" localizado (logout voluntário não mostra).

## Contrato

- Fonte da verdade: `openapi/management-api.yaml` no repo `ecolchain-management-api`.
- Envelope em toda resposta: `{data, links, erros}`. Lógica sempre por `erros[].code`
  (ex.: `CNPJ_IN_USE`, `SUBMIT_INCOMPLETE`), nunca por title. `erros[].detail` é o texto exibido;
  `campo` direciona o erro para o input certo.
- Erros de rede e 500 → mensagem genérica (`copy.errors.generic`), sem vazar detail.
- A API negocia idioma por `Accept-Language` (default pt-BR, `en` explícito): `apiFetch`
  envia o header do locale ativo — rótulos e `detail` chegam já traduzidos.
- `GET /me` devolve `proximoPasso` (COMPANY_FORM, ONBOARDING, AWAITING_REVIEW, HOME, REJECTED,
  SUSPENDED) — **o roteamento é dirigido por ele** (componente `Gate`/`RequireStep`); o front
  não reimplementa a máquina de estados.
- Códigos de tipo de perfil são em PT (`GERADOR`, `TRANSPORTADOR`, `COOPERATIVA`, `CLEANTECH`,
  `RECICLADORA`, `HIGIENIZADORA`) — vêm de `GET /public/profile-types`.

## i18n

- Rotas por idioma: `/pt-br` (default) e `/en`, via segmento `src/app/[locale]`.
  `/` → redirect server-side para `/pt-br`; `src/proxy.ts` redireciona qualquer path
  de página sem locale para o equivalente `/pt-br/...`.
- **Todo o copy sai de `src/i18n/pt-br.ts` / `en.ts`** (mesmo padrão `content/` da landing).
  Nunca hardcode texto nem misture idiomas — a paridade entre os dois arquivos é coberta
  por teste (`tests/i18n.test.ts`).
- Client components leem `useCopy()`/`useLocale()` do `I18nProvider` (montado no layout
  de `[locale]`); server components usam `getCopy(locale)`.
- `routeForStep(step, locale)` devolve rota já prefixada; `localPath(path, locale)`
  prefixa paths livres como `/login`.

## Estrutura

```
app/
  src/app/[locale]/   rotas App Router (/pt-br e /en de login, empresa, onboarding,
                      revisao, rejeitada, suspendida, painel + index guiado pelo
                      proximoPasso); src/app/page.tsx redireciona / → /pt-br
  src/proxy.ts        redirect 307 de paths sem locale → /pt-br/<path>
  src/i18n/           pt-br.ts, en.ts (copy), index.ts (locales/helpers),
                      provider.tsx (I18nProvider/useCopy/useLocale)
  src/components/     login-form, company-form, onboarding-flow, document-card,
                      status-screen, gate, session-context, ui (Button/Card/Field/Alert...)
  src/lib/            api.ts (apiFetch + endpoints + Accept-Language), session.ts
                      (token/refresh), errors.ts (envelope→friendly), cnpj.ts,
                      steps.ts, types.ts
  tests/              vitest (api, session, cnpj, steps, errors, i18n)
docs/DUVIDAS.md       decisões e divergências encontradas vs. o contrato
```

## Regras de contribuição

- UI bilíngue pt-BR/en via arquivos de conteúdo (nunca hardcode), código em inglês,
  commits Conventional Commits.
- Sem libs pesadas sem necessidade; sem over-engineering.
- Campos do contrato são pt-BR camelCase; paths em inglês.
- `.env` não existe aqui — segredos só no repo da API. `API_INTERNAL_URL` pode ser passada
  como variável de ambiente para apontar o proxy a outro host.
