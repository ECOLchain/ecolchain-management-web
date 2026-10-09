import { describe, expect, it } from "vitest";
import { isValidCnpj, maskCnpj, normalizeCnpj } from "../src/lib/cnpj";

describe("cnpj", () => {
  it("normaliza removendo máscara e deixando maiúsculo", () => {
    expect(normalizeCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(normalizeCnpj("  04.252.011/0001-10 ")).toBe("04252011000110");
  });

  it("aplica a máscara XX.XXX.XXX/XXXX-XX", () => {
    expect(maskCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(maskCnpj("04252011000110")).toBe("04.252.011/0001-10");
    expect(maskCnpj("123")).toBe("12.3");
    expect(maskCnpj("12abc34")).toBe("12.ABC.34");
  });

  it("trunca em 14 chars ao mascarar", () => {
    expect(maskCnpj("123456789012345678")).toBe("12.345.678/9012-34");
  });

  it("valida o CNPJ alfanumérico oficial da Receita", () => {
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCnpj("12ABC34501DE35")).toBe(true);
  });

  it("valida CNPJ numérico clássico", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCnpj("12.ABC.345/01DE-34")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita formato errado", () => {
    expect(isValidCnpj("123")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
    expect(isValidCnpj("12.ABC.345/01DE-3A")).toBe(false); // dígitos finais devem ser numéricos
    expect(isValidCnpj("12.ABC.345/01DE-355")).toBe(false);
  });
});
