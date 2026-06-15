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

export type FunilEtapa =
  | 'lead_novo' | 'atendimento' | 'visita_agendada' | 'visita_realizada'
  | 'proposta' | 'venda_feita' | 'sucesso_cliente' | 'follow_up'
  | 'sem_resposta' | 'desistente'

export const FUNIL_ETAPAS: { value: FunilEtapa; label: string; cor: string }[] = [
  { value: 'lead_novo',        label: 'Lead novo',        cor: '#888780' },
  { value: 'atendimento',      label: 'Atendimento',      cor: '#378ADD' },
  { value: 'visita_agendada',  label: 'Visita agendada',  cor: '#7F77DD' },
  { value: 'visita_realizada', label: 'Visita realizada', cor: '#5DCAA5' },
  { value: 'proposta',         label: 'Proposta',         cor: '#EF9F27' },
  { value: 'venda_feita',      label: 'Venda feita',      cor: '#639922' },
  { value: 'sucesso_cliente',  label: 'Sucesso cliente',  cor: '#1D9E75' },
  { value: 'follow_up',        label: 'Follow-up',        cor: '#BA7517' },
  { value: 'sem_resposta',     label: 'Sem resposta',     cor: '#888780' },
  { value: 'desistente',       label: 'Desistente',       cor: '#E24B4A' },
]

export interface Cliente {
  id: string
  id_amigavel: number
  nome: string
  telefone: string
  email: string | null
  origem: LeadOrigem
  interesse: string | null
  empreendimento_id: string | null
  corretor_id: string | null
  etapa: FunilEtapa
  lead_id: string | null
  observacao: string | null
  created_at: string
  updated_at: string
  empreendimento?: Empreendimento
  corretor?: User
}

export interface ClienteTimeline {
  id: string
  cliente_id: string
  autor_id: string | null
  etapa_de: FunilEtapa | null
  etapa_para: FunilEtapa | null
  nota: string | null
  tipo: string
  created_at: string
  autor?: User
}

