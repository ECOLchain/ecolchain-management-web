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
