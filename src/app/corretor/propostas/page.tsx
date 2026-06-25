'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { EMPREENDIMENTOS_LISTA } from '@/lib/empreendimentos'
import type { PropostaExt as Proposta, Cliente, Unidade } from '@/types'

type Dados = {
  empreendimento:string;lote:string;quadra:string;area:string
  proponente:string;cpf:string;identidade:string;profissao:string
  estado_civil:string;endereco:string;bairro:string;uf:string;cep:string
  municipio:string;cel1:string;cel2:string;email:string
  valor_proposta:string;sinal_entrada:string;qtd_parcelas:string
  primeiro_vencimento:string;melhor_data:string;observacoes:string
  tem_segundo:boolean
  p2_nome:string;p2_cpf:string;p2_identidade:string;p2_profissao:string
  p2_estado_civil:string;p2_endereco:string;p2_cel1:string;p2_email:string
}

function emptyDados():Dados{return{empreendimento:'',lote:'',quadra:'',area:'',proponente:'',cpf:'',identidade:'',profissao:'',estado_civil:'',endereco:'',bairro:'',uf:'BA',cep:'',municipio:'',cel1:'',cel2:'',email:'',valor_proposta:'',sinal_entrada:'',qtd_parcelas:'',primeiro_vencimento:'',melhor_data:'10',observacoes:'',tem_segundo:false,p2_nome:'',p2_cpf:'',p2_identidade:'',p2_profissao:'',p2_estado_civil:'',p2_endereco:'',p2_cel1:'',p2_email:''}}
function moedaFmt(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function parseMoeda(s:string){return parseFloat(s.replace(/[^\d,.]/g,'').replace(',','.'))||0}

export default function CorretorPropostasPage() {
  const [propostas,setPropostas]=useState<Proposta[]>([])
  const [clientes,setClientes]=useState<Cliente[]>([])
  const [unidades,setUnidades]=useState<Unidade[]>([])
  const [modal,setModal]=useState<'novo'|'ver'|'editar'|null>(null)
  const [sel,setSel]=useState<Proposta|null>(null)
  const [dados,setDados]=useState<Dados>(emptyDados())
  const [clienteId,setClienteId]=useState('')
  const [unidadeId,setUnidadeId]=useState('')
  const [docIdUrl,setDocIdUrl]=useState('')
  const [docResUrl,setDocResUrl]=useState('')
  const [uploadandoId,setUploadandoId]=useState(false)
  const [uploadandoRes,setUploadandoRes]=useState(false)
  const [salvando,setSalvando]=useState(false)
  const docIdRef=useRef<HTMLInputElement>(null)
  const docResRef=useRef<HTMLInputElement>(null)
  const supabase=createBrowserSupabase()

  const carregar=useCallback(async()=>{
    const [pRes,cRes,uRes]=await Promise.all([
      fetch('/api/propostas').then(r=>r.json()),
      fetch('/api/clientes?limit=300').then(r=>r.json()),
      fetch('/api/unidades').then(r=>r.json()),
    ])
    setPropostas(pRes.propostas??[])
    setClientes(cRes.clientes??[])
    setUnidades(uRes.unidades??[])
  },[])

  useEffect(()=>{
    carregar()
    supabase.auth.getUser().then(({data:{user}})=>{
      if(user)supabase.from('users').select('name,phone').eq('id',user.id).single()
        .then(({data})=>{if(data)setDados(p=>({...p}))})
    })
  },[carregar,supabase])

  const vProposta=parseMoeda(dados.valor_proposta)
  const sinalEntrada=parseMoeda(dados.sinal_entrada)
  const comissao=vProposta*0.05
  const valorContrato=vProposta-comissao
  const sinalProposta=Math.max(sinalEntrada-comissao,0)
  const saldoFinanciar=Math.max(vProposta-sinalEntrada,0)
  const qtdParcelas=parseInt(dados.qtd_parcelas)||0
  const valorParcela=qtdParcelas>0?saldoFinanciar/qtdParcelas:0

  async function compress(file:File):Promise<string>{
    return new Promise(res=>{
      const img=new Image();const url=URL.createObjectURL(file)
      img.onload=()=>{
        const canvas=document.createElement('canvas')
        const MAX=900;let w=img.width,h=img.height
        if(w>MAX){h=Math.round(h*MAX/w);w=MAX}
        canvas.width=w;canvas.height=h
        canvas.getContext('2d')!.drawImage(img,0,0,w,h)
        URL.revokeObjectURL(url);res(canvas.toDataURL('image/jpeg',0.75))
      };img.src=url
    })
  }

  async function uploadFoto(file:File,tipo:'id'|'res'){
    if(tipo==='id')setUploadandoId(true);else setUploadandoRes(true)
    const c=await compress(file)
    if(tipo==='id'){setDocIdUrl(c);setUploadandoId(false)}
    else{setDocResUrl(c);setUploadandoRes(false)}
  }

  function abrirNova(c?:Cliente){
    const d=emptyDados()
    if(c){d.proponente=c.nome;d.cel1=c.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3');d.email=c.email??''}
    setDados(d);setClienteId(c?.id??'');setUnidadeId('');setDocIdUrl('');setDocResUrl('');setSel(null);setModal('novo')
  }

  function abrirEditar(p:Proposta){
    setDados((p.dados as unknown as Dados)??emptyDados())
    setClienteId(p.cliente_id??'');setUnidadeId(p.unidade_id??'')
    setDocIdUrl(p.doc_identidade_url??'');setDocResUrl(p.doc_residencia_url??'')
    setSel(p);setModal('editar')
  }

  function fecharModal(){setModal(null);setSel(null)}

  function preencherUnidade(uid:string){
    setUnidadeId(uid)
    const u=unidades.find(x=>x.id===uid);if(!u)return
    const emp=EMPREENDIMENTOS_LISTA.find(e=>(u as any).empreendimento?.slug?.toUpperCase()===e.sigla||(u as any).empreendimento?.nome===e.nome)
    setDados(p=>({...p,empreendimento:emp?`${emp.sigla} — ${emp.nome} — ${emp.cidade}`:(u as any).empreendimento?.nome??'',lote:u.nome,area:u.area_m2?.toString()??'',valor_proposta:u.valor_total.toLocaleString('pt-BR',{minimumFractionDigits:2})}))
  }

  async function salvar(){
    setSalvando(true)
    const obs=dados.sinal_entrada?`Entrada de ${moedaFmt(sinalEntrada)} referente a sinal + comissão. ${dados.observacoes}`.trim():dados.observacoes
    const dadosCompletos={...dados,comissao:comissao.toFixed(2),valor_contrato:valorContrato.toFixed(2),sinal_proposta:sinalProposta.toFixed(2),saldo_financiar:saldoFinanciar.toFixed(2),valor_parcela:valorParcela.toFixed(2),observacoes:obs}
    if(sel){
      await fetch(`/api/propostas/${sel.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({dados:dadosCompletos,doc_identidade_url:docIdUrl,doc_residencia_url:docResUrl})})
    }else{
      await fetch('/api/propostas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cliente_id:clienteId||null,unidade_id:unidadeId||null,dados:dadosCompletos,doc_identidade_url:docIdUrl,doc_residencia_url:docResUrl})})
    }
    setSalvando(false);fecharModal();await carregar()
  }

  const lbl=(t:string)=><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>{t}</label>
  const inp=(key:keyof Dados,ph='',type='text')=>(
    <input type={type} value={dados[key] as string} onChange={e=>setDados(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{width:'100%'}}/>
  )

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)',flex:1}}>Minhas Propostas</span>
        <button onClick={()=>abrirNova()} style={{padding:'10px 16px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500,fontSize:'var(--fs-sm)'}}>+ Nova proposta</button>
      </div>

      {clientes.length>0&&(
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>Criar proposta para cliente existente</div>
          <select onChange={e=>{const c=clientes.find(x=>x.id===e.target.value);if(c)abrirNova(c)}} defaultValue="">
            <option value="" disabled>Selecionar cliente...</option>
            {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}

      {propostas.length===0
        ? <div className="empty">Nenhuma proposta ainda. Clique em + Nova proposta.</div>
        : <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {propostas.map(p=>{
            const d=p.dados as unknown as Dados
            return(
              <div key={p.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'var(--fs-base)',fontWeight:600,color:'var(--text)'}}>{d.proponente||'—'}</span>
                      <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:p.proposta_feita?'#E1F5EE':'#FAEEDA',color:p.proposta_feita?'#085041':'#633806',fontWeight:500}}>{p.proposta_feita?'✓ Feita':'⏳ Pendente'}</span>
                    </div>
                    <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)'}}>{d.empreendimento||'—'} · Lote {d.lote||'—'}</div>
                    <div style={{fontSize:'13px',color:'var(--text-3)',marginTop:'2px'}}>#{p.id_amigavel} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                    <button onClick={()=>{setSel(p);setModal('ver')}} style={{padding:'8px 14px',fontSize:'var(--fs-sm)',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'var(--bg-2)'}}>👁 Ver</button>
                    <button onClick={()=>abrirEditar(p)} style={{padding:'8px 14px',fontSize:'var(--fs-sm)',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'var(--bg-2)'}}>✏️ Editar</button>
                    <button onClick={async()=>{if(confirm('Excluir proposta?'))await fetch(`/api/propostas/${p.id}`,{method:'DELETE'}).then(()=>carregar())}} style={{padding:'8px 12px',fontSize:'var(--fs-sm)',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--red-text)'}}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      }

      {/* Modal Ver */}
      {modal==='ver'&&sel&&(()=>{
        const d=sel.dados as unknown as Dados&{comissao:string;valor_contrato:string;sinal_proposta:string;saldo_financiar:string;valor_parcela:string}
        const fmt=(v:string)=>{const n=parseFloat(v);return isNaN(n)?v:moedaFmt(n)}
        return(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px',overflowY:'auto'}}>
            <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'560px',margin:'auto',overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}}>
              <div style={{padding:'16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div><div style={{fontSize:'var(--fs-lg)',fontWeight:600}}>Proposta #{sel.id_amigavel}</div><div style={{fontSize:'13px',color:'var(--text-3)'}}>{new Date(sel.created_at).toLocaleDateString('pt-BR')}</div></div>
                <button onClick={fecharModal} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'var(--text-3)',lineHeight:1,padding:'4px'}}>✕</button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
                <div style={{background:'var(--teal-bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:'var(--teal-text)',marginBottom:'4px'}}>📍 {d.empreendimento}</div>
                  <div style={{fontSize:'var(--fs-sm)',color:'var(--teal-text)'}}>Lote {d.lote} · Quadra {d.quadra} · {d.area} m²</div>
                </div>
                <div><div style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>👤 Proponente</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    {[['Nome',d.proponente],['CPF',d.cpf],['Identidade',d.identidade],['Profissão',d.profissao],['Estado Civil',d.estado_civil],['Telefone',d.cel1],['E-mail',d.email]].map(([l,v])=>(
                      v?<div key={l}><div style={{fontSize:'11px',color:'var(--text-3)'}}>{l}</div><div style={{fontSize:'var(--fs-sm)',color:'var(--text)'}}>{v}</div></div>:null
                    ))}
                  </div>
                </div>
                <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px'}}>
                  <div style={{fontSize:'13px',fontWeight:600,marginBottom:'10px'}}>💰 Pagamento</div>
                  {[['Valor da proposta',fmt(d.valor_proposta)],['Comissão (5%)',fmt(d.comissao)],['Valor do contrato',fmt(d.valor_contrato)],['Sinal na proposta',fmt(d.sinal_proposta)],['Saldo a financiar',fmt(d.saldo_financiar)],[`${d.qtd_parcelas}x de`,fmt(d.valor_parcela)],['Primeiro vencimento',d.primeiro_vencimento?new Date(d.primeiro_vencimento).toLocaleDateString('pt-BR'):'—'],['Melhor data',`Dia ${d.melhor_data}`]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)',padding:'4px 0',borderBottom:'0.5px solid var(--border)'}}>
                      <span style={{color:'var(--text-2)'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
                    </div>
                  ))}
                  {d.observacoes&&<div style={{marginTop:'8px',fontSize:'13px',color:'var(--text-2)',fontStyle:'italic',padding:'6px',background:'var(--bg)',borderRadius:'4px'}}>{d.observacoes}</div>}
                </div>
                <div><div style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>📎 Documentos</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {[['Identidade',sel.doc_identidade_url],['Comprovante residência',sel.doc_residencia_url]].map(([l,url])=>(
                      <div key={l}><div style={{fontSize:'11px',color:'var(--text-3)',marginBottom:'4px'}}>{l}</div>
                        {url?<img src={url as string} alt={l as string} style={{width:'100%',maxHeight:'140px',objectFit:'cover',borderRadius:'var(--radius)',border:'0.5px solid var(--border)'}}/>:<div style={{height:'80px',border:'0.5px dashed var(--border)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'var(--text-3)'}}>Não anexado</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{padding:'14px 16px',borderTop:'0.5px solid var(--border)',flexShrink:0}}>
                <button onClick={fecharModal} style={{width:'100%',padding:'12px',fontSize:'var(--fs-base)',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>Fechar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Novo / Editar */}
      {(modal==='novo'||modal==='editar')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:200,padding:'16px',overflowY:'auto'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'640px',margin:'auto',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            {/* Header fixo */}
            <div style={{padding:'16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg)',position:'sticky',top:0,zIndex:1}}>
              <span style={{fontSize:'var(--fs-lg)',fontWeight:600}}>{modal==='editar'?`Editar Proposta #${sel?.id_amigavel}`:'Nova Proposta'}</span>
              <button onClick={fecharModal} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'var(--text-3)',lineHeight:1,padding:'4px'}} title="Fechar sem salvar">✕</button>
            </div>

            <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'16px',overflowY:'auto',maxHeight:'75vh'}}>
              {/* Empreendimento */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'var(--fs-base)',fontWeight:600,marginBottom:'12px'}}>📍 Empreendimento e Lote</div>
                <div style={{marginBottom:'10px'}}><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Unidade do estoque</label>
                  <select value={unidadeId} onChange={e=>preencherUnidade(e.target.value)}>
                    <option value="">Selecionar do estoque...</option>
                    {unidades.map(u=><option key={u.id} value={u.id}>{u.nome} — {(u as any).empreendimento?.slug}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:'10px'}}>{lbl('Empreendimento *')}
                  <select value={dados.empreendimento} onChange={e=>setDados(p=>({...p,empreendimento:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {EMPREENDIMENTOS_LISTA.map(e=><option key={e.sigla} value={`${e.sigla} — ${e.nome} — ${e.cidade}`}>{e.sigla} — {e.nome} — {e.cidade}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                  <div>{lbl('Lote')}{inp('lote','ex: 15')}</div>
                  <div>{lbl('Quadra')}{inp('quadra','ex: A')}</div>
                  <div>{lbl('Área (m²)')}{inp('area','ex: 250')}</div>
                </div>
              </div>

              {/* Proponente */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'var(--fs-base)',fontWeight:600,marginBottom:'12px'}}>👤 Proponente</div>
                <div style={{marginBottom:'10px'}}>{lbl('Nome completo *')}{inp('proponente')}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('CPF')}{inp('cpf','000.000.000-00')}</div>
                  <div>{lbl('Identidade (RG/CNH)')}{inp('identidade')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Profissão')}{inp('profissao')}</div>
                  <div>{lbl('Estado Civil')}{inp('estado_civil')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Endereço')}{inp('endereco')}</div>
                  <div>{lbl('Bairro')}{inp('bairro')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Município')}{inp('municipio')}</div>
                  <div>{lbl('UF')}{inp('uf')}</div>
                  <div>{lbl('CEP')}{inp('cep')}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Celular 1 *')}{inp('cel1','(75) 9xxxx-xxxx')}</div>
                  <div>{lbl('Celular 2')}{inp('cel2')}</div>
                </div>
                <div>{lbl('E-mail')}{inp('email')}</div>
              </div>

              {/* 2º Proponente toggle */}
              <div>
                <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:500,padding:'12px 14px',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
                  <input type="checkbox" checked={dados.tem_segundo} onChange={e=>setDados(p=>({...p,tem_segundo:e.target.checked}))} style={{width:'18px',height:'18px',accentColor:'var(--teal)'}}/>
                  Incluir segundo proponente
                </label>
              </div>

              {dados.tem_segundo&&(
                <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                  <div style={{fontSize:'var(--fs-base)',fontWeight:600,marginBottom:'12px'}}>👤 2º Proponente</div>
                  <div style={{marginBottom:'10px'}}>{lbl('Nome completo')}{inp('p2_nome')}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div>{lbl('CPF')}{inp('p2_cpf')}</div>
                    <div>{lbl('Identidade')}{inp('p2_identidade')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div>{lbl('Profissão')}{inp('p2_profissao')}</div>
                    <div>{lbl('Estado Civil')}{inp('p2_estado_civil')}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div>{lbl('Celular')}{inp('p2_cel1')}</div>
                    <div>{lbl('E-mail')}{inp('p2_email')}</div>
                  </div>
                </div>
              )}

              {/* Pagamento */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'var(--fs-base)',fontWeight:600,marginBottom:'12px'}}>💰 Condições de Pagamento</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Valor da Proposta (R$) *')}<input value={dados.valor_proposta} onChange={e=>setDados(p=>({...p,valor_proposta:e.target.value}))} placeholder="ex: 37500,00"/></div>
                  <div>{lbl('Entrada total do cliente (R$)')}<input value={dados.sinal_entrada} onChange={e=>setDados(p=>({...p,sinal_entrada:e.target.value}))} placeholder="ex: 7500,00"/></div>
                </div>

                {/* Preview cálculo automático */}
                {vProposta>0&&(
                  <div style={{background:'var(--bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius)',padding:'12px',marginBottom:'10px'}}>
                    <div style={{fontSize:'12px',fontWeight:600,color:'var(--teal-text)',marginBottom:'8px'}}>✓ Calculado automaticamente:</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                      {[['Comissão (5%)',moedaFmt(comissao)],['Valor do contrato',moedaFmt(valorContrato)],['Sinal na proposta',moedaFmt(sinalProposta)],['Saldo a financiar',moedaFmt(saldoFinanciar)]].map(([l,v])=>(
                        <div key={l} style={{fontSize:'var(--fs-sm)'}}>
                          <span style={{color:'var(--text-3)'}}>{l}: </span>
                          <span style={{fontWeight:600,color:'var(--text)'}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {qtdParcelas>0&&valorParcela>0&&(
                      <div style={{marginTop:'8px',padding:'8px',background:'var(--teal-bg)',borderRadius:'var(--radius)',fontSize:'var(--fs-base)',color:'var(--teal-text)',fontWeight:600,textAlign:'center'}}>
                        {qtdParcelas}x de {moedaFmt(valorParcela)}
                      </div>
                    )}
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>{lbl('Quantidade de parcelas')}<input type="number" value={dados.qtd_parcelas} onChange={e=>setDados(p=>({...p,qtd_parcelas:e.target.value}))} placeholder="ex: 120"/></div>
                  <div>{lbl('Primeiro vencimento')}<input type="date" value={dados.primeiro_vencimento} onChange={e=>setDados(p=>({...p,primeiro_vencimento:e.target.value}))}/></div>
                </div>

                {/* Melhor data com feedback visual */}
                <div style={{marginBottom:'10px'}}>
                  {lbl('Melhor data de vencimento')}
                  <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                    {['10','20','30'].map(d=>(
                      <button
                        key={d}
                        type="button"
                        onClick={()=>setDados(p=>({...p,melhor_data:d}))}
                        style={{
                          flex:1,padding:'12px 8px',fontSize:'var(--fs-base)',fontWeight:600,
                          borderRadius:'var(--radius)',cursor:'pointer',
                          border:dados.melhor_data===d?'2px solid var(--teal)':'1.5px solid var(--border-2)',
                          background:dados.melhor_data===d?'var(--teal)':'var(--bg)',
                          color:dados.melhor_data===d?'#fff':'var(--text-2)',
                          transition:'all .15s',
                          boxShadow:dados.melhor_data===d?'0 2px 8px rgba(29,158,117,0.3)':'none',
                        }}
                      >
                        Dia {d}
                        {dados.melhor_data===d&&<div style={{fontSize:'10px',opacity:.8,marginTop:'2px'}}>✓ Selecionado</div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>{lbl('Observações adicionais')}<textarea value={dados.observacoes} onChange={e=>setDados(p=>({...p,observacoes:e.target.value}))} rows={2} style={{resize:'vertical'}}/></div>
              </div>

              {/* Documentos */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'var(--fs-base)',fontWeight:600,marginBottom:'12px'}}>📎 Documentos do cliente</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  {([['Identidade (RG, CNH...)',docIdUrl,setDocIdUrl,docIdRef,uploadandoId,'id'],['Comprovante de residência',docResUrl,setDocResUrl,docResRef,uploadandoRes,'res']] as const).map(([label,url,setUrl,ref,uploading,tipo])=>(
                    <div key={label}>
                      <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'6px',fontWeight:500}}>{label}</div>
                      <div onClick={()=>(ref as any).current?.click()} style={{border:`2px dashed ${url?'var(--teal)':'var(--border-2)'}`,borderRadius:'var(--radius)',minHeight:'120px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:url?'transparent':'var(--bg)'}}>
                        {url?<img src={url as string} alt={label} style={{width:'100%',maxHeight:'150px',objectFit:'cover'}}/>:(
                          <div style={{textAlign:'center',padding:'16px',color:'var(--text-3)'}}>
                            <div style={{fontSize:'28px',marginBottom:'6px'}}>📷</div>
                            <div style={{fontSize:'13px'}}>{(uploading as boolean)?'Enviando...':'Câmera ou galeria'}</div>
                          </div>
                        )}
                      </div>
                      <input ref={ref as any} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFoto(f,tipo as 'id'|'res')}} style={{display:'none'}}/>
                      {url&&<button onClick={()=>(setUrl as any)('')} style={{fontSize:'12px',marginTop:'6px',padding:'4px 10px',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--red-text)'}}>Remover</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer com botões SEMPRE visíveis */}
            <div style={{padding:'14px 16px',borderTop:'0.5px solid var(--border)',background:'var(--bg-2)',display:'flex',gap:'10px',flexShrink:0}}>
              <button
                onClick={fecharModal}
                style={{flex:1,padding:'14px',fontSize:'var(--fs-base)',borderRadius:'var(--radius)',cursor:'pointer',border:'0.5px solid var(--border-2)',background:'var(--bg)',color:'var(--text-2)',fontWeight:500}}
              >
                ✕ Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                style={{flex:2,padding:'14px',fontSize:'var(--fs-base)',fontWeight:600,background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}
              >
                {salvando?'Salvando...':(modal==='editar'?'✓ Salvar alterações':'✓ Enviar proposta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
