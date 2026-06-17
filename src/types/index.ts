export type Role = 'adm' | 'corretor'
export type LeadStatus = 'novo' | 'em_atendimento' | 'convertido' | 'perdido'
export type LeadOrigem = 'olx' | 'chaves_na_mao' | 'facebook_ads' | 'ligacao' | 'fluxo' | 'trello' | 'outro'

export interface User {
  id: string; email: string; name: string; role: Role
  phone: string | null; active: boolean; created_at: string; avatar_url?: string | null
}

export interface Empreendimento {
  id: string; nome: string; slug: string; mensagem_whatsapp: string; ativo: boolean
}

export interface Lead {
  id: string; id_externo: string | null; nome: string; telefone: string
  origem: LeadOrigem; interesse: string | null; status: LeadStatus
  empreendimento_id: string | null; corretor_id: string | null
  atribuido_em: string | null; atendimento_em: string | null; encerrado_em: string | null
  created_at: string; observacao?: string | null
}

export type FunilEtapa = 'lead_novo'|'atendimento'|'visita_agendada'|'visita_realizada'|'proposta'|'venda_feita'|'sucesso_cliente'|'follow_up'|'sem_resposta'|'desistente'

export const FUNIL_ETAPAS: {value:FunilEtapa;label:string;cor:string}[] = [
  {value:'lead_novo',label:'Lead novo',cor:'#888780'},
  {value:'atendimento',label:'Atendimento',cor:'#378ADD'},
  {value:'visita_agendada',label:'Visita agendada',cor:'#7F77DD'},
  {value:'visita_realizada',label:'Visita realizada',cor:'#5DCAA5'},
  {value:'proposta',label:'Proposta',cor:'#EF9F27'},
  {value:'venda_feita',label:'Venda feita',cor:'#639922'},
  {value:'sucesso_cliente',label:'Sucesso cliente',cor:'#1D9E75'},
  {value:'follow_up',label:'Follow-up',cor:'#BA7517'},
  {value:'sem_resposta',label:'Sem resposta',cor:'#888780'},
  {value:'desistente',label:'Desistente',cor:'#E24B4A'},
]

export interface Cliente {
  id: string; id_amigavel: number; nome: string; telefone: string
  email: string | null; origem: LeadOrigem; interesse: string | null
  empreendimento_id: string | null; corretor_id: string | null
  etapa: FunilEtapa; observacao: string | null; unidade_interesse_id: string | null
  created_at: string; updated_at: string
  empreendimento?: Empreendimento; corretor?: User; unidade_interesse?: Unidade
}

export interface ClienteTimeline {
  id: string; cliente_id: string; autor_id: string | null
  etapa_de: FunilEtapa | null; etapa_para: FunilEtapa | null
  nota: string | null; tipo: string; created_at: string; autor?: User
}

export interface ClienteSimulacao {
  id: string; cliente_id: string; unidade_id: string | null
  autor_id: string | null; dados: Record<string,unknown>
  mensagem_gerada: string | null; created_at: string
  unidade?: Unidade; autor?: User
}

export type UnidadeStatus = 'disponivel' | 'reservado' | 'vendido'

export interface Unidade {
  id: string; empreendimento_id: string; nome: string
  area_m2: number | null; valor_total: number
  status: UnidadeStatus; observacao: string | null
  created_at: string; updated_at: string; empreendimento?: Empreendimento
}

export interface Proposta {
  id: string; id_amigavel: number; cliente_id: string | null
  corretor_id: string | null; unidade_id: string | null
  dados: Record<string,unknown>; status: string
  created_at: string; updated_at: string
  cliente?: Cliente; corretor?: User; unidade?: Unidade
}

// Reexporta Proposta com campos extras
export interface PropostaExt extends Proposta {
  proposta_feita: boolean
  feita_em: string | null
  doc_identidade_url: string | null
  doc_residencia_url: string | null
}
