// Tipos do contrato `openapi/management-api.yaml` (fonte da verdade no backend).
// Campos em pt-BR camelCase, como no contrato.

export interface Link {
  rel: string;
  href: string;
  metodo: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  campo?: string | null;
}

export interface Envelope<T> {
  data: T | null;
  links: Link[];
  erros: Problem[];
}

export type AccountRole = "COMPANY_OWNER" | "PLATFORM_ADMIN";

export interface ContaInfo {
  email: string;
  papel: AccountRole;
  nomeCompleto: string | null;
}

export interface SessionData {
  accessToken: string;
  /** Contrato diz epoch (s); a API devolve TTL em segundos — ver session.setSession. */
  expiraEm: number;
  conta: ContaInfo;
}

export type NextStep =
  | "COMPANY_FORM"
  | "ONBOARDING"
  | "AWAITING_REVIEW"
  | "HOME"
  | "REJECTED"
  | "SUSPENDED";

export type CompanyStatus =
  | "PENDING_DOCUMENTS"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "PENDING_UPDATE";

export interface EmpresaResumo {
  id: string;
  cnpj: string;
  razaoSocial: string;
  status: CompanyStatus;
  tiposPerfil: string[];
}

export interface MeData {
  conta: ContaInfo;
  empresa: EmpresaResumo | null;
  proximoPasso: NextStep;
}

export interface ProfileTypeSummary {
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
}

export interface AttributeRules {
  input?: string | null;
  regex?: string | null;
  maxLength?: number | null;
  extensoesPermitidas?: string[] | null;
  tamanhoMaxBytes?: number | null;
}

export type AttributeKind = "DATA" | "DOCUMENT";
export type ReviewStatus = "PENDING" | "UPLOADED" | "ACCEPTED" | "REJECTED";

export interface Revisao {
  status: ReviewStatus;
  nota: string | null;
}

export interface OnboardingAttribute {
  codigo: string;
  tipo: AttributeKind;
  rotulo: string;
  ajuda: string | null;
  obrigatorio: boolean;
  /** A API pode mandar null (atributo DATA sem restrições). */ regras: AttributeRules | null;
  valor: string | null;
  revisao: Revisao | null;
}

export interface OnboardingStep {
  codigo: string;
  titulo: string;
  atributos: OnboardingAttribute[];
}

export interface Progresso {
  totalObrigatorios: number;
  preenchidosObrigatorios: number;
}

export interface OnboardingData {
  status: CompanyStatus;
  tiposPerfil: ProfileTypeSummary[];
  passos: OnboardingStep[];
  progresso: Progresso;
}

export interface UploadUrlData {
  url: string;
  objectKey: string;
  expiraEm: number;
  contentType: string;
  tamanhoBytes: number;
}

export interface DownloadUrlData {
  url: string;
  objectKey: string;
  expiraEm: number;
}

export interface CompanyUpsertBody {
  cnpj: string;
  razaoSocial: string;
  nomeCompleto: string;
  tiposPerfil: string[];
  declaracaoRepresentante: boolean;
  versaoTermos: string;
}

// ---------- Admin (papel PLATFORM_ADMIN) ----------

export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "SUSPEND";

export interface AdminCompanyListItem {
  id: string;
  cnpj: string;
  razaoSocial: string;
  status: CompanyStatus;
  tiposPerfil: string[];
  criadoEm: string;
  submetidoEm: string | null;
}

export interface AdminCompanyList {
  empresas: AdminCompanyListItem[];
  pagina: number;
  tamanho: number;
  total: number;
}

export interface AdminCompanyContact {
  email: string;
  nomeCompleto: string;
  versaoTermos: string;
  termosAceitosEm: string;
}

export interface AdminCompanyDocument {
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  status: "UPLOADED" | "ACCEPTED" | "REJECTED";
  confirmadoEm: string | null;
}

export interface AdminCompanyValue {
  codigo: string;
  tipo: AttributeKind;
  rotuloPt: string;
  rotuloEn: string;
  obrigatorio: boolean;
  valor: string | null;
  revisao: Revisao | null;
  documento: AdminCompanyDocument | null;
}

export interface AdminCompany {
  id: string;
  cnpj: string;
  razaoSocial: string;
  status: CompanyStatus;
  tiposPerfil: string[];
  contato: AdminCompanyContact | null;
  valores: AdminCompanyValue[];
  criadoEm: string;
  submetidoEm: string | null;
}

export interface AdminAttribute {
  codigo: string;
  tipo: AttributeKind;
  rotuloPt: string;
  rotuloEn: string;
  ajudaPt: string | null;
  ajudaEn: string | null;
  regras: AttributeRules | null;
  ativo: boolean;
}

export interface AdminFlowAttribute {
  codigo: string;
  obrigatorio: boolean;
  definicao: AdminAttribute;
}

export interface AdminFlowStep {
  codigo: string;
  tituloPt: string;
  tituloEn: string;
  atributos: AdminFlowAttribute[];
}

export interface AdminProfileType {
  codigo: string;
  nomePt: string;
  nomeEn: string;
  descricaoPt: string | null;
  descricaoEn: string | null;
  ativo: boolean;
  ordem: number;
  passos: AdminFlowStep[];
}

export interface AdminAccount {
  id: string;
  email: string;
  nomeCompleto: string | null;
  telefone: string | null;
  papel: AccountRole;
  criadoEm: string;
}

export interface AuditLogItem {
  id: string;
  ator: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  antes: string | null;
  depois: string | null;
  criadoEm: string;
}

export interface AuditLogPage {
  itens: AuditLogItem[];
  pagina: number;
  tamanho: number;
  total: number;
}
