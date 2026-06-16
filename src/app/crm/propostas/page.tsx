'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Proposta, Cliente, Unidade, Empreendimento } from '@/types'

type PropostaForm = {
  // Proponente 1
  proponente: string; cpf: string; identidade: string; profissao: string; estado_civil: string
  endereco: string; bairro: string; uf: string; cep: string; ponto_ref: string
  municipio: string; tel_fixo: string; cel1: string; cel2: string; email: string
  // Proponente 2
  p2_proponente: string; p2_cpf: string; p2_identidade: string; p2_profissao: string; p2_estado_civil: string
  p2_endereco: string; p2_bairro: string; p2_uf: string; p2_cep: string; p2_ponto_ref: string
  p2_municipio: string; p2_tel_fixo: string; p2_cel1: string; p2_cel2: string; p2_email: string
  // Lote
  lote: string; quadra: string; area: string; tipo: string; cidade: string
  // Pagamento
  valor_proposta: string; valor_contrato: string; sinal: string; saldo: string
  parcelas_mensais: string; valor_parcela: string; primeiro_vencimento: string; melhor_data: string
  // Corretor
  corretor_nome: string; corretor_tel: string; observacoes: string
  tem_segundo_proponente: boolean
  local_data: string
}

function emptyForm(): PropostaForm {
  return {
    proponente:'',cpf:'',identidade:'',profissao:'',estado_civil:'',
    endereco:'',bairro:'',uf:'BA',cep:'',ponto_ref:'',municipio:'',
    tel_fixo:'',cel1:'',cel2:'',email:'',
    p2_proponente:'',p2_cpf:'',p2_identidade:'',p2_profissao:'',p2_estado_civil:'',
    p2_endereco:'',p2_bairro:'',p2_uf:'BA',p2_cep:'',p2_ponto_ref:'',p2_municipio:'',
    p2_tel_fixo:'',p2_cel1:'',p2_cel2:'',p2_email:'',
    lote:'',quadra:'',area:'',tipo:'Residencial',cidade:'Conceição da Feira',
    valor_proposta:'',valor_contrato:'',sinal:'',saldo:'',
    parcelas_mensais:'',valor_parcela:'',primeiro_vencimento:'',melhor_data:'10',
    corretor_nome:'',corretor_tel:'',observacoes:'',
    tem_segundo_proponente:false,
    local_data: new Date().toLocaleDateString('pt-BR'),
  }
}

function moeda(v:string){const n=parseFloat(v.replace(/\D/g,''))/100;return isNaN(n)?v:n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

function gerarHtmlProposta(f: PropostaForm): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposta de Compra - Prime Empreendimentos</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 10mm; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
  .header h2 { font-size: 11px; background: #1a3a6b; color: #fff; padding: 4px 10px; display: inline-block; margin-top: 4px; }
  .lote-info { border: 0.5px solid #ccc; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; }
  .lote-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .lote-row span { margin-right: 4px; }
  .section-title { background: #1a3a6b; color: #fff; padding: 3px 8px; font-size: 10px; font-weight: bold; margin: 6px 0 3px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 0.5px solid #ccc; padding: 4px 6px; font-size: 9.5px; vertical-align: top; }
  .campo-label { color: #333; font-weight: bold; font-size: 8.5px; display: block; margin-bottom: 1px; }
  .campo-valor { border-bottom: 0.5px solid #999; min-height: 14px; display: block; font-size: 10px; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px; }
  .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 4px; }
  .row4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 4px; }
  .campo { margin-bottom: 4px; }
  .pagamento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .pagamento-left { border: 0.5px solid #ccc; padding: 5px 8px; }
  .pagamento-right { border: 0.5px solid #ccc; border-left: none; padding: 5px 8px; }
  .pag-row { display: flex; border-bottom: 0.5px solid #eee; padding: 3px 0; }
  .pag-label { width: 130px; font-size: 9px; color: #555; flex-shrink: 0; }
  .pag-val { flex: 1; font-size: 10px; font-weight: bold; border-bottom: 0.5px solid #999; }
  .declaracao { border: 0.5px solid #ccc; padding: 6px 8px; font-size: 8.5px; line-height: 1.5; margin-top: 6px; }
  .corretor-row { border: 0.5px solid #ccc; padding: 5px 8px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; }
  .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; text-align: center; }
  .ass-linha { border-top: 0.5px solid #000; padding-top: 4px; font-size: 9px; }
  .data-linha { text-align: right; font-size: 9.5px; margin-top: 8px; }
  .banco-info { font-size: 8.5px; margin-top: 4px; color: #333; }
  @media print { body { print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Bom Viver</h1>
    <h2>PROPOSTA DE COMPRA</h2>
  </div>

  <div class="lote-info">
    <div class="lote-row">
      <span><b>Lote</b> [ ${f.lote} ]</span>
      <span><b>Quadra</b> [ ${f.quadra} ]</span>
      <span><b>Área</b> [ ${f.area} ] m²</span>
    </div>
    <div style="margin-top:4px">
      <b>Cidade:</b>
      ${['Conceição da Feira','Conceição do Jacuípe','Campo Formoso'].map(c=>`${c} (${f.cidade===c?'X':'&nbsp;&nbsp;'})`).join(' &nbsp;&nbsp; ')}
    </div>
    <div style="margin-top:2px">
      <b>Tipo de lote:</b>
      Residencial (${f.tipo==='Residencial'?'X':'&nbsp;'}) &nbsp;&nbsp;
      Comercial (${f.tipo==='Comercial'?'X':'&nbsp;'})
    </div>
  </div>

  <div class="section-title">Dados do Proponente</div>
  <div style="border:0.5px solid #ccc;padding:6px 8px">
    <div class="campo"><span class="campo-label">Proponente:</span><span class="campo-valor">${f.proponente}</span></div>
    <div class="row4">
      <div class="campo"><span class="campo-label">CPF:</span><span class="campo-valor">${f.cpf}</span></div>
      <div class="campo"><span class="campo-label">Identidade:</span><span class="campo-valor">${f.identidade}</span></div>
      <div class="campo"><span class="campo-label">Profissão:</span><span class="campo-valor">${f.profissao}</span></div>
      <div class="campo"><span class="campo-label">Estado Civil:</span><span class="campo-valor">${f.estado_civil}</span></div>
    </div>
    <div class="row2">
      <div class="campo"><span class="campo-label">Endereço Residencial:</span><span class="campo-valor">${f.endereco}</span></div>
      <div class="campo"><span class="campo-label">Bairro:</span><span class="campo-valor">${f.bairro}</span></div>
    </div>
    <div class="row4">
      <div class="campo"><span class="campo-label">Ponto de Referência:</span><span class="campo-valor">${f.ponto_ref}</span></div>
      <div class="campo"><span class="campo-label">Município:</span><span class="campo-valor">${f.municipio}</span></div>
      <div class="campo"><span class="campo-label">UF:</span><span class="campo-valor">${f.uf}</span></div>
      <div class="campo"><span class="campo-label">CEP:</span><span class="campo-valor">${f.cep}</span></div>
    </div>
    <div class="row3">
      <div class="campo"><span class="campo-label">Tel. Fixo:</span><span class="campo-valor">${f.tel_fixo}</span></div>
      <div class="campo"><span class="campo-label">Celular 01:</span><span class="campo-valor">${f.cel1}</span></div>
      <div class="campo"><span class="campo-label">Celular 02:</span><span class="campo-valor">${f.cel2}</span></div>
    </div>
    <div class="campo"><span class="campo-label">E-mail:</span><span class="campo-valor">${f.email}</span></div>
  </div>

  ${f.tem_segundo_proponente ? `
  <div class="section-title">Dados do Segundo Proponente</div>
  <div style="border:0.5px solid #ccc;padding:6px 8px">
    <div class="campo"><span class="campo-label">Proponente:</span><span class="campo-valor">${f.p2_proponente}</span></div>
    <div class="row4">
      <div class="campo"><span class="campo-label">CPF:</span><span class="campo-valor">${f.p2_cpf}</span></div>
      <div class="campo"><span class="campo-label">Identidade:</span><span class="campo-valor">${f.p2_identidade}</span></div>
      <div class="campo"><span class="campo-label">Profissão:</span><span class="campo-valor">${f.p2_profissao}</span></div>
      <div class="campo"><span class="campo-label">Estado Civil:</span><span class="campo-valor">${f.p2_estado_civil}</span></div>
    </div>
    <div class="row2">
      <div class="campo"><span class="campo-label">Endereço Residencial:</span><span class="campo-valor">${f.p2_endereco}</span></div>
      <div class="campo"><span class="campo-label">Bairro:</span><span class="campo-valor">${f.p2_bairro}</span></div>
    </div>
    <div class="row4">
      <div class="campo"><span class="campo-label">Ponto de Referência:</span><span class="campo-valor">${f.p2_ponto_ref}</span></div>
      <div class="campo"><span class="campo-label">Município:</span><span class="campo-valor">${f.p2_municipio}</span></div>
      <div class="campo"><span class="campo-label">UF:</span><span class="campo-valor">${f.p2_uf}</span></div>
      <div class="campo"><span class="campo-label">CEP:</span><span class="campo-valor">${f.p2_cep}</span></div>
    </div>
    <div class="row3">
      <div class="campo"><span class="campo-label">Tel. Fixo:</span><span class="campo-valor">${f.p2_tel_fixo}</span></div>
      <div class="campo"><span class="campo-label">Celular 01:</span><span class="campo-valor">${f.p2_cel1}</span></div>
      <div class="campo"><span class="campo-label">Celular 02:</span><span class="campo-valor">${f.p2_cel2}</span></div>
    </div>
    <div class="campo"><span class="campo-label">E-mail:</span><span class="campo-valor">${f.p2_email}</span></div>
  </div>
  ` : ''}

  <div class="section-title">Condições de Pagamento</div>
  <div class="pagamento-grid">
    <div class="pagamento-left">
      <div class="pag-row"><span class="pag-label">Valor da Proposta:</span><span class="pag-val">${f.valor_proposta}</span></div>
      <div class="pag-row"><span class="pag-label">Valor do Contrato:</span><span class="pag-val">${f.valor_contrato}</span></div>
      <div class="pag-row"><span class="pag-label">Sinal:</span><span class="pag-val">${f.sinal}</span></div>
      <div class="pag-row"><span class="pag-label">Saldo a Financiar:</span><span class="pag-val">${f.saldo}</span></div>
      <div class="pag-row" style="display:grid;grid-template-columns:130px 80px 1fr">
        <span class="pag-label" style="width:auto">Parcelas Mensais:</span>
        <span class="pag-val">${f.parcelas_mensais}</span>
        <span style="font-size:9px;padding-left:8px">*Valor Parcela: <b>${f.valor_parcela}</b></span>
      </div>
      <div class="pag-row"><span class="pag-label">Melhor data de vencimento:</span>
        <span style="font-size:9px">
          (${f.melhor_data==='10'?'X':'&nbsp;'}) 10 &nbsp;
          (${f.melhor_data==='20'?'X':'&nbsp;'}) 20 &nbsp;
          (${f.melhor_data==='30'?'X':'&nbsp;'}) 30
        </span>
        &nbsp;&nbsp;<span style="font-size:9px">Primeiro vencimento: <b>${f.primeiro_vencimento}</b></span>
      </div>
      <div style="font-size:8px;color:#555;margin-top:4px;text-align:center">*PARCELAS CORRIGIDAS PELO IGPM+1%</div>
    </div>
    <div class="pagamento-right">
      <div style="font-weight:bold;font-size:9px;margin-bottom:4px">COMISSÃO (5%)</div>
      <div style="font-size:9px;color:#555;margin-bottom:4px">Observações:</div>
      <div style="font-size:10px;min-height:40px">${f.observacoes}</div>
    </div>
  </div>

  <div class="section-title">Dos Serviços de Intermediação Imobiliária</div>
  <div class="corretor-row">
    <div class="campo"><span class="campo-label">Corretor:</span><span class="campo-valor">${f.corretor_nome}</span></div>
    <div class="campo"><span class="campo-label">Telefone:</span><span class="campo-valor">${f.corretor_tel}</span></div>
    <div class="campo"><span class="campo-label">Imobiliária:</span><span class="campo-valor">Prime Empreendimentos</span></div>
  </div>

  <div class="declaracao">
    <p style="font-weight:bold;margin-bottom:4px">DECLARAÇÃO DO(A,S) PROPONENTE(S) SOBRE A PRESENTE PROPOSTA DE AQUISIÇÃO DO IMÓVEL</p>
    <p>Essa proposta, juntamente com o(s) pagamento(o), referente ao sinal, será(ao) encaminhado(s) pela imobiliária, à apreciação da incorporadora ficando a sua aprovação sujeita a análise. É de meu (nosso) conhecimento que a incorporadora tem o direito de recusá-la, ainda que imotivadamente.</p>
    <p style="margin-top:4px">Declaro que é do meu conhecimento que a venda só será considerada efetivada com a assinatura desta proposta, juntamente com a entrega de toda a documentação solicitada pela imobiliária, bem como a aprovação do incorporador. É de meu (nosso) conhecimento que as parcelas sofrerão correção monetária, tendo como base o índice IGPM+1%.</p>
    <div class="banco-info" style="margin-top:6px">O valor referente a comissão de corretagem será pago na conta da Imobiliária PRIME EMPREENDIMENTOS E LOTEAMENTOS LTDA, AG 3802, OP 003, C/C 1790-9 Caixa Econômica Federal, Chave Pix: 16.393.431/0001-03</div>
  </div>

  <div class="data-linha">${f.local_data}</div>

  <div class="assinaturas">
    <div><div class="ass-linha">Proponente</div></div>
    <div><div class="ass-linha">${f.tem_segundo_proponente?'Segundo Proponente':''}</div></div>
    <div><div class="ass-linha">Corretor/CRECI</div></div>
  </div>
</div>
</body>
</html>`
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [modal, setModal] = useState<'novo'|'ver'|null>(null)
  const [sel, setSel] = useState<Proposta|null>(null)
  const [form, setForm] = useState<PropostaForm>(emptyForm())
  const [clienteId, setClienteId] = useState('')
  const [unidadeId, setUnidadeId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [pRes, cRes, uRes] = await Promise.all([
      fetch('/api/propostas').then(r=>r.json()),
      fetch('/api/clientes?limit=200').then(r=>r.json()),
      fetch('/api/unidades').then(r=>r.json()),
    ])
    setPropostas(pRes.propostas ?? [])
    setClientes(cRes.clientes ?? [])
    setUnidades(uRes.unidades ?? [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function novaPropostaComCliente(c: Cliente) {
    const f = emptyForm()
    f.proponente = c.nome
    f.cel1 = c.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')
    f.email = c.email ?? ''
    setForm(f); setClienteId(c.id); setUnidadeId('')
    setModal('novo')
  }

  function preencherUnidade(uId: string) {
    setUnidadeId(uId)
    const u = unidades.find(x=>x.id===uId)
    if (!u) return
    setForm(p => ({
      ...p,
      lote: u.nome,
      area: u.area_m2?.toString() ?? '',
      valor_proposta: moeda(u.valor_total.toString()),
      valor_contrato: moeda(u.valor_total.toString()),
    }))
  }

  async function salvar() {
    setSalvando(true)
    await fetch('/api/propostas', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ cliente_id: clienteId||null, unidade_id: unidadeId||null, dados: form }),
    })
    setSalvando(false); setModal(null)
    await carregar()
  }

  function imprimir(p: Proposta) {
    const dados = p.dados as unknown as PropostaForm
    const html = gerarHtmlProposta(dados)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  const f = form
  const label = (l:string) => <label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>{l}</label>
  const inp = (key: keyof PropostaForm, placeholder='') => (
    <input value={f[key] as string} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} style={{fontSize:'12px',width:'100%'}}/>
  )

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'15px',fontWeight:600,color:'var(--text)',flex:1}}>Propostas de Compra</span>
        <button onClick={()=>{setForm(emptyForm());setClienteId('');setUnidadeId('');setModal('novo')}} style={{fontSize:'13px',padding:'7px 16px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>
          + Nova proposta
        </button>
      </div>

      {/* Lista de clientes para criar proposta rápida */}
      {clientes.length > 0 && (
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
          <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>Criar proposta para cliente existente</div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <select onChange={e=>{ const c=clientes.find(x=>x.id===e.target.value); if(c)novaPropostaComCliente(c) }} defaultValue="" style={{fontSize:'12px',padding:'5px 8px',flex:1,maxWidth:'280px'}}>
              <option value="" disabled>Selecionar cliente...</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nome} — {c.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}</option>)}
            </select>
            <span style={{fontSize:'12px',color:'var(--text-3)'}}>ou preencha manualmente clicando em + Nova proposta</span>
          </div>
        </div>
      )}

      {/* Lista de propostas */}
      {propostas.length === 0 ? (
        <div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'13px'}}>Nenhuma proposta ainda. Crie a primeira!</div>
      ) : (
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{borderBottom:'0.5px solid var(--border)'}}>
                  {['#','Cliente','Unidade','Corretor','Criada em','Ações'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {propostas.map(p=>(
                  <tr key={p.id} style={{borderBottom:'0.5px solid var(--border)'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                    <td style={{padding:'10px 14px',color:'var(--text-3)',fontWeight:500}}>#{p.id_amigavel}</td>
                    <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text)'}}>{(p as any).cliente?.nome ?? '—'}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{(p as any).unidade?.nome ?? (p.dados as any)?.lote ?? '—'}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{(p as any).corretor?.name ?? '—'}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-3)',fontSize:'11px'}}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>imprimir(p)} style={{fontSize:'11px',padding:'4px 10px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>🖨 Imprimir</button>
                        <button onClick={async()=>{if(confirm('Excluir proposta?'))await fetch(`/api/propostas/${p.id}`,{method:'DELETE'}).then(()=>carregar())}} style={{fontSize:'11px',padding:'4px 8px',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--red-text)'}}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Proposta */}
      {modal === 'novo' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:200,padding:'16px',overflowY:'auto'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'680px',overflow:'hidden',margin:'auto'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--bg)',zIndex:1}}>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>Nova Proposta de Compra</span>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'20px',lineHeight:1}}>✕</button>
            </div>
            <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'14px',maxHeight:'80vh',overflowY:'auto'}}>

              {/* Lote */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>📍 Dados do Lote</div>
                <div style={{marginBottom:'8px'}}>
                  {label('Selecionar unidade do estoque (opcional)')}
                  <select value={unidadeId} onChange={e=>preencherUnidade(e.target.value)} style={{width:'100%',fontSize:'12px'}}>
                    <option value="">Preencher manualmente</option>
                    {unidades.map(u=><option key={u.id} value={u.id}>{u.nome} — {(u as any).empreendimento?.slug} — R$ {u.valor_total.toLocaleString('pt-BR')}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Lote')}{inp('lote','ex: 15')}</div>
                  <div>{label('Quadra')}{inp('quadra','ex: A')}</div>
                  <div>{label('Área (m²)')}{inp('area','ex: 250')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div>{label('Cidade')}
                    <select value={f.cidade} onChange={e=>setForm(p=>({...p,cidade:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
                      {['Conceição da Feira','Conceição do Jacuípe','Campo Formoso'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>{label('Tipo')}
                    <select value={f.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
                      <option>Residencial</option><option>Comercial</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Proponente 1 */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>👤 Dados do Proponente</div>
                <div style={{marginBottom:'8px'}}>{label('Nome completo')}{inp('proponente')}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('CPF')}{inp('cpf','000.000.000-00')}</div>
                  <div>{label('Identidade')}{inp('identidade')}</div>
                  <div>{label('Profissão')}{inp('profissao')}</div>
                  <div>{label('Estado Civil')}{inp('estado_civil','Solteiro(a)')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Endereço')}{inp('endereco')}</div>
                  <div>{label('Bairro')}{inp('bairro')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Município')}{inp('municipio')}</div>
                  <div>{label('UF')}{inp('uf','BA')}</div>
                  <div>{label('CEP')}{inp('cep')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Tel. Fixo')}{inp('tel_fixo')}</div>
                  <div>{label('Celular 1')}{inp('cel1','(75) 9xxxx-xxxx')}</div>
                  <div>{label('Celular 2')}{inp('cel2')}</div>
                </div>
                <div>{label('E-mail')}{inp('email')}</div>
              </div>

              {/* Segundo proponente toggle */}
              <div>
                <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',fontWeight:500,color:'var(--text)'}}>
                  <input type="checkbox" checked={f.tem_segundo_proponente} onChange={e=>setForm(p=>({...p,tem_segundo_proponente:e.target.checked}))} style={{width:'15px',height:'15px',accentColor:'var(--teal)'}}/>
                  Incluir segundo proponente
                </label>
              </div>

              {f.tem_segundo_proponente && (
                <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>👤 Segundo Proponente</div>
                  <div style={{marginBottom:'8px'}}>{label('Nome completo')}{inp('p2_proponente')}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <div>{label('CPF')}{inp('p2_cpf')}</div>
                    <div>{label('Identidade')}{inp('p2_identidade')}</div>
                    <div>{label('Profissão')}{inp('p2_profissao')}</div>
                    <div>{label('Estado Civil')}{inp('p2_estado_civil')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <div>{label('Endereço')}{inp('p2_endereco')}</div>
                    <div>{label('Bairro')}{inp('p2_bairro')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <div>{label('Município')}{inp('p2_municipio')}</div>
                    <div>{label('UF')}{inp('p2_uf')}</div>
                    <div>{label('CEP')}{inp('p2_cep')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <div>{label('Tel. Fixo')}{inp('p2_tel_fixo')}</div>
                    <div>{label('Celular 1')}{inp('p2_cel1')}</div>
                    <div>{label('Celular 2')}{inp('p2_cel2')}</div>
                  </div>
                  <div>{label('E-mail')}{inp('p2_email')}</div>
                </div>
              )}

              {/* Condições de pagamento */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>💰 Condições de Pagamento</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Valor da Proposta')}{inp('valor_proposta','R$ 85.000,00')}</div>
                  <div>{label('Valor do Contrato')}{inp('valor_contrato')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Sinal')}{inp('sinal')}</div>
                  <div>{label('Saldo a Financiar')}{inp('saldo')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Parcelas Mensais')}{inp('parcelas_mensais','ex: 120')}</div>
                  <div>{label('Valor da Parcela')}{inp('valor_parcela')}</div>
                  <div>{label('Primeiro Vencimento')}{inp('primeiro_vencimento','ex: 10/08/2025')}</div>
                </div>
                <div>
                  {label('Melhor data de vencimento')}
                  <div style={{display:'flex',gap:'12px'}}>
                    {['10','20','30'].map(d=>(
                      <label key={d} style={{display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',fontSize:'13px'}}>
                        <input type="radio" name="melhor_data" value={d} checked={f.melhor_data===d} onChange={e=>setForm(p=>({...p,melhor_data:e.target.value}))} style={{accentColor:'var(--teal)'}}/>
                        Dia {d}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Corretor */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>🏠 Corretor / Observações</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>{label('Nome do corretor')}{inp('corretor_nome')}</div>
                  <div>{label('Telefone')}{inp('corretor_tel')}</div>
                </div>
                <div>{label('Observações')}<textarea value={f.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} rows={2} style={{width:'100%',fontSize:'12px',resize:'vertical'}}/></div>
              </div>

              <div>
                {label('Local e data')}
                {inp('local_data','ex: Feira de Santana, 16 de junho de 2026')}
              </div>
            </div>

            <div style={{padding:'12px 16px',borderTop:'0.5px solid var(--border)',background:'var(--bg-2)',display:'flex',gap:'8px',flexShrink:0}}>
              <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',fontSize:'13px'}}>Cancelar</button>
              <button onClick={()=>{const html=gerarHtmlProposta(f);const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),500)}}} style={{flex:1,padding:'10px',fontSize:'13px',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent'}}>
                👁 Visualizar
              </button>
              <button onClick={salvar} disabled={salvando} style={{flex:2,padding:'10px',fontSize:'13px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>
                {salvando?'Salvando...':'✓ Salvar proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
