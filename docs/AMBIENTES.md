# Ambientes — portal de gestão (management-web)

Segregação de ambientes do `ecolchain-management-web`: cada ambiente da SPA
aponta para uma URL da `ecolchain-management-api` diferente. O deploy da API
vem depois — os hostnames abaixo são o combinado/documentado para alinhar.

| Ambiente | Hostname | API (`NEXT_PUBLIC_API_URL`) | Proteção |
|---|---|---|---|
| dev | `manage-dev.ecolchain.com` | `https://api-dev.ecolchain.com` | Basic Auth + `noindex` |
| prod | `manage.ecolchain.com` | `https://api.ecolchain.com` | — |
| local | `localhost` (`next dev`) | same-origin (rewrites → `:8080` ou `API_INTERNAL_URL`) | — |

## Como a API é escolhida

- `src/lib/api-base.ts` exporta `API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""`
  — prefixo de todas as chamadas (`apiFetch` e `POST /auth/refresh`).
- `NEXT_PUBLIC_API_URL` é inline **no build** pela esteira:
  - builds de dev (branches `feature/**` e `develop`): `https://api-dev.ecolchain.com`
  - build de prod (branch `main`): `https://api.ecolchain.com`
  - local: ausente → `""` (same-origin; `next dev` proxyfica para `API_INTERNAL_URL ?? :8080`)
- Front e API ficam sob `ecolchain.com`, então as chamadas são **same-site**:
  o cookie `ecolchain_refresh` (`SameSite=Strict; Path=/auth`) segue sendo
  enviado. Falta só o CORS credenciado na API quando ela for deployada
  (`Access-Control-Allow-Origin` com o host do front +
  `Access-Control-Allow-Credentials: true`).

## Esteira (feature -> develop -> main)

```
push em feature/** ──► typecheck + lint + test + build (out/) → sync → ecolchain-web-mgmt-dev
                     └─► auto-PR → develop (preview = manage-dev + credenciais Basic Auth)
push em develop ─────► idem → ecolchain-web-mgmt-dev
                     └─► auto-PR → main (preview = manage-dev + credenciais)
push em main ────────► typecheck + lint + test + build → sync → ecolchain-web-mgmt-prod
                     └─► purge de cache Cloudflare → manage.ecolchain.com
```

Os buckets (`ecolchain-web-mgmt-dev`, `ecolchain-web-mgmt-prod`), os workers de
proxy com SPA-fallback (`html_routes`) e os domínios são provisionados por
Terraform no repo `ecolchain-infra-general` (roots `management-web/dev` e
`management-web/prod`, módulo `web-hosting` — mesmo do `core-web`).

## Build estático (`output: 'export'`)

`npm run build` gera `app/out/` (uma página `.html` por rota + payloads `.txt`
do App Router). O worker do Cloudflare serve `<rota>.html` e cai no
`index.html` raiz (redirect → `/pt-br`) só quando a rota não existe.

- Em dev, `next dev` mantém os rewrites `/auth/*`, `/me/*`, `/public/*`,
  `/.well-known/*` e `/dev-mailbox` → `API_INTERNAL_URL` (fase DEV do
  `next.config.ts`); no build eles não existem (não há servidor).
- `src/proxy.ts` (redirect de path sem locale → `/pt-br/...`) só roda no dev
  server; no estático, path sem locale cai no `index.html` raiz → `/pt-br`.
