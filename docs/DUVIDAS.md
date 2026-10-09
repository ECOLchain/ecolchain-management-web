# Dúvidas e decisões — SPA auth + onboarding

Registro das decisões tomadas e das divergências encontradas entre o contrato
(`openapi/management-api.yaml`) e o comportamento real da API dev (2026-10-09).

## Divergências encontradas no backend (todas reportáveis como bugs da API)

### 1. `GET /me/onboarding` → 500 após upload de documento confirmado

Fluxo: `upload-url` → `PUT` OCI → `confirm` retornam 200 e o arquivo fica gravado no bucket
(`download-url` 200). Na sequência, `GET /me/onboarding` passa a responder **500 INTERNAL_ERROR**
para qualquer empresa com um documento em estado `UPLOADED`.

Stack trace (Quarkus dev log):

```
java.lang.IllegalArgumentException: Unexpected value 'UPLOADED'
  at Revisao$StatusEnum.fromValue (generated, contract/model/Revisao.java)
  at MeController.lambda$getOnboarding$3 (MeController.java:123)
```

Causa: o enum `Revisao.status` do contrato só tinha `PENDING|ACCEPTED|REJECTED`, mas o
controller mapeia o **estado do documento** (`UPLOADED`) para esse enum.
**Resolvido no backend** (`main` `488841f`, 2026-10-09): o enum do contrato passou a
cobrir `UPLOADED` e `GET /me/onboarding` volta a responder 200 com doc enviado. O front
também inclui `UPLOADED` no tipo `ReviewStatus`.

### 2. Segunda rotação do refresh token → `REFRESH_REUSED` (sessão morta)

`POST /auth/refresh` rotaciona `familyId.secret`. Observado em dev: qualquer **segundo**
refresh da mesma família responde 401 `REFRESH_REUSED` e revoga tudo — mesmo com o cookie
rotacionado correto. Causa raiz confirmada: `revokeFamily` marcava `revokedAt` em todos os tokens da família
**incluindo o recém-criado** (o filtro `revokedAt is null` o alcançava).
**Resolvido no backend** (`main` `488841f`): rotações consecutivas verificadas — a rotação
revoga só o token apresentado. O front mantém o single-flight (defesa contra refresh
paralelo) e o fluxo de sessão expirada para `REFRESH_REUSED` residual/real.

### 3. `SessionData.expiraEm`: TTL em segundos (contrato alinhado)

O OpenAPI dizia "epoch em segundos"; a API devolvia `900` (TTL). **Resolvido** (`488841f`):
a descrição do campo foi alinhada a TTL — implementação e contrato agora batem.
`setSession` continua normalizando os dois formatos por tolerância.

### 4. Códigos de tipo de perfil em PT

`tiposPerfil` aceita `GERADOR|TRANSPORTADOR|COOPERATIVA|CLEANTECH|RECICLADORA|HIGIENIZADORA`
(não slugs em inglês). O form usa sempre os códigos vindos de `GET /public/profile-types`,
sem hardcode.

### 5. `regras` pode ser `null`

Atributos DATA podem vir com `regras: null` (sem restrições) — o tipo no front é
`AttributeRules | null` e todos os acessos usam `?.`. Sem isso, `/onboarding` quebrava com
`Cannot read properties of null (reading 'input')`.

## Decisões do front

- **Salvar por passo** (não debounce por campo): `PUT /me/onboarding/attributes/{code}` é
  disparado para todos os campos alterados ao clicar em "Salvar"/"Salvar e continuar".
  Justificativa: menos chamadas, sem writes parciais, mensagem de erro por passo; o rascunho
  por campo é preservado em memória mesmo se a re-carga do schema sobrescrever valores.
- **Proxy same-origin** via `next.config.ts` rewrites: o cookie `ecolchain_refresh` é
  `SameSite=Strict; Path=/auth` — cross-origin dev (:3000→:8080) impediria o envio. O proxy
  também elimina CORS nas chamadas `/auth/*`.
- **Token só em memória** + single-flight de refresh + uma única retentativa por request.
- `SUBMIT_INCOMPLETE`: códigos extraídos de `detail` (formato
  "itens obrigatórios pendentes: a, b"); fallback = cálculo local pelo schema; foco no
  primeiro passo incompleto via ring + nav.

## E2E real executado (API dev, mailer mock)

- `e2e5` (GERADOR): login OTP → empresa (CNPJ_IN_USE e erro por campo validados) →
  onboarding 3 passos save-per-step (0→100%) → submit → `/revisao` AWAITING_REVIEW. ✅
- `e2e6` (CLEANTECH): login → empresa → upload via browser de `contrato-social.pdf`:
  presign→PUT→confirm 200, objeto persistido (`download-url` 200). A recarga seguinte do
  onboarding falhou com o bug #1 (500) — a tela mostrou a mensagem genérica correta.
- `submit` em `e2e6` via curl confirmou `SUBMIT_INCOMPLETE` com detail real
  ("itens obrigatórios pendentes: business_permit, primary_cnae, partner_rg, partner_cpf,
  responsible_cpf") — mesmo formato que o parser do front espera.
- 429 do `otp/request` exibe a mensagem amigável ("limite de códigos atingido"). ✅

## Não verificado

- Estados REJECTED/CHANGES_REQUESTED/SUSPENDED em runtime — precisam de ação admin;
  as telas existem e são dirigidas por `proximoPasso`.

(Após o fix `488841f` do backend, `UPLOADED`/download voltaram a ser renderizáveis —
a recarga do onboarding que falhava com 500 já foi coberta no E2E pós-fix.)

## Deploy/esteira (export estático, ambientes e API)

### 4. `output: 'export'` — recursos de servidor que ficaram restritos ao dev

- **Rewrites do `next.config.ts`** não existem em runtime estático (não há
  servidor Next). Decisão: config bifásica — `next dev` mantém os rewrites
  (proxy → `API_INTERNAL_URL`/`localhost:8080`); o build exporta `out/`.
  Em produção as chamadas vão para `NEXT_PUBLIC_API_URL` (ver AMBIENTES.md).
- **`src/proxy.ts`** (redirect de path sem locale → `/pt-br/...`) só roda em
  dev. No estático, um path sem locale cai no `index.html` raiz (redirect →
  `/pt-br`) — perde só a preservação do subpath (`/login` → `/pt-br` em vez de
  `/pt-br/login`). Aceito: quem navega sempre usa URLs já localizadas.
- **`searchParams` em server component** (`/login?motivo=...`) quebrava o
  prerender. Decisão: leitura movida para `useSearchParams()` em
  `login-form-with-motivo.tsx` dentro de `<Suspense>` — mesmo comportamento.
- **`next/image`** exigiu `images.unoptimized` (sem otimizador server-side;
  as imagens são só SVGs locais, sem perda real).

### 5. Como a SPA fala com a API em produção (cross-origin same-site)

- O pedido pedia `NEXT_PUBLIC_API_URL` por ambiente. Adotado:
  dev `https://api-dev.ecolchain.com`, prod `https://api-prod.ecolchain.com`
  (inline no build; `""` local = same-origin). Os hostnames são o
  **combinado** para o futuro deploy da `ecolchain-management-api`
  (prod ajustado de `api` para `api-prod` a pedido do dono, 2026-10-09).
- O cookie `ecolchain_refresh` é `SameSite=Strict`: `manage(-dev)` → `api(-dev)`
  continua **same-site** (eTLD+1 `ecolchain.com`), então o refresh funciona —
  **desde que a API configure CORS credenciado** (`Allow-Origin` =
  `https://manage-dev.ecolchain.com`/`https://manage.ecolchain.com` +
  `Allow-Credentials`) e os headers `Authorization`, `Content-Type`,
  `Accept-Language`, `Accept` no preflight. Pendente do deploy do backend —
  registrado para alinhar lá.
- Alternativa avaliada e descartada por ora: proxy `/auth`,`/me` no worker
  Cloudflare (manteria same-origin e zeraria CORS). Se o CORS virar problema,
  é o plano B documentado — o módulo `web-hosting` aceitaria um `api_origin`.

### 6. Worker compartilhado (`html_routes`)

- O `out/` do Next emite `<rota>.html` (não `<rota>/index.html` nem bundle
  único estilo Vite). O fallback antigo do worker (tudo sem extensão →
  `/index.html`) servia o index raiz para `/pt-br/login` — e como o index raiz
  é a página-redirect `/` → `/pt-br`, gerava **loop**.
- Decisão: módulo `web-hosting` ganhou `html_routes` (binding `HTML_ROUTES`
  no worker): rota sem extensão tenta `<rota>.html` → `<rota>/index.html` →
  `/index.html`. Ativado só nos roots `management-web/*` — `core-web` fica
  idêntico em comportamento. Payloads `.txt` do App Router (client nav) e
  assets `/_next/*` têm extensão e passam direto, igual antes.
