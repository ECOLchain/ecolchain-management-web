/**
 * Origem base das chamadas à API.
 *
 * Vazio = mesma origem do front. Em desenvolvimento local os rewrites do
 * `next dev` encaminham /auth/*, /me/* etc. para :8080.
 * No deploy, a esteira injeta `NEXT_PUBLIC_API_URL` por ambiente no build:
 * dev → https://api-dev.ecolchain.com | prod → https://api-prod.ecolchain.com.
 * Como o host continua sob ecolchain.com, as chamadas são same-site e o
 * cookie `ecolchain_refresh` (SameSite=Strict, Path=/auth) segue sendo
 * enviado — basta CORS credenciado na API (pendente do deploy do backend).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
