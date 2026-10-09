/**
 * CNPJ alfanumérico (formato novo da Receita): módulo 11 sobre os 12 primeiros
 * chars (ASCII − 48), pesos 2–9 da direita p/ esquerda. Espelha
 * `CnpjValidator` do backend — mesma regra, validação client-side para UX.
 * Exemplo oficial: 12.ABC.345/01DE-35
 */

/** Remove máscara e normaliza: só [A-Z0-9], maiúsculo. */
export function normalizeCnpj(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Aplica a máscara XX.XXX.XXX/XXXX-XX sobre até 14 chars alfanuméricos. */
export function maskCnpj(raw: string): string {
  const s = normalizeCnpj(raw).slice(0, 14);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i === 2 || i === 5) out += ".";
    else if (i === 8) out += "/";
    else if (i === 12) out += "-";
    out += s[i];
  }
  return out;
}

export function isValidCnpj(raw: string): boolean {
  const s = normalizeCnpj(raw);
  if (s.length !== 14 || !/^[A-Z0-9]{12}[0-9]{2}$/.test(s)) return false;
  const v = [...s].map((c) => c.charCodeAt(0) - 48);
  return v[12] === digit(v, 12) && v[13] === digit(v, 13);
}

function digit(v: number[], len: number): number {
  let sum = 0;
  let weight = 2;
  for (let i = len - 1; i >= 0; i--) {
    sum += v[i] * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}
