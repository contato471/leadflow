export type Role = 'adm' | 'corretor'
export type LeadStatus = 'novo' | 'em_atendimento' | 'convertido' | 'perdido'
export type LeadOrigem = 'olx' | 'chaves_na_mao' | 'facebook_ads' | 'ligacao' | 'fluxo' | 'trello' | 'outro'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  phone: string | null
  active: boolean
  created_at: string
}

export interface Empreendimento {
  id: string
  nome: string
  slug: string
  mensagem_whatsapp: string
  ativo: boolean
  created_at: string
}

export interface CorretorEmpreendimento {
  id: string
  corretor_id: string
  empreendimento_id: string
  participa_rodizio: boolean
  posicao_rodizio: number
  corretor?: User
  empreendimento?: Empreendimento
}

export interface Lead {
  id: string
  id_externo: string | null
  nome: string
  telefone: string
  origem: LeadOrigem
  interesse: string | null
  empreendimento_id: string | null
  status: LeadStatus
  corretor_id: string | null
  atribuido_em: string | null
  atendimento_em: string | null
  encerrado_em: string | null
  observacao: string | null
  created_at: string
  empreendimento?: Empreendimento
  corretor?: User
}

export interface DashboardStats {
  leads_hoje: number
  aguardando: number
  em_atendimento: number
  convertidos_hoje: number
  taxa_conversao: number
}
