'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const ST_BG = { disponivel:'#E1F5EE', reservado:'#FAEEDA', vendido:'#FCEBEB' }
const ST_COR = { disponivel:'#1D9E75', reservado:'#BA7517', vendido:'#E24B4A' }
const ST_LABEL = { disponivel:'Disponível', reservado:'Reservado', vendido:'Vendido' }
function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
type Opcoes={entrada_dividida:boolean;parcelas_intermediarias:boolean;parcelas_semestrais:boolean;parcelas_anuais:boolean}
type Sim={entrada_pct:string;entrada_rs:string;parcelas:string;int_val:string;int_qtd:string;sem_val:string;sem_qtd:string;anu_val:string;anu_qtd:string;div_qtd:string}

export default function CorretorEstoquePage() {
  const [unidades,setUnidades]=useState<Unidade[]>([])
  const [emps,setEmps]=useState<Empreendimento[]>([])
  const [empFiltro,setEmpFiltro]=useState('todos')
  const [statusFiltro,setStatusFiltro]=useState<string[]>(['disponivel','reservado','vendido'])
  const [busca,setBusca]=useState('')
  const [sel,setSel]=useState<Unidade|null>(null)
  const [reservando,setReservando]=useState(false)
  const [reservado,setReservado]=useState(false)
  const [copiado,setCopiado]=useState(false)
  const [msgBase,setMsgBase]=useState('Olá! Segue a simulação de pagamento do lote que conversamos:')
  const [opcoes,setOpcoes]=useState<Opcoes>({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false})
  const [sim,setSim]=useState<Sim>({entrada_pct:'',entrada_rs:'',parcelas:'',int_val:'',int_qtd:'',sem_val:'',sem_qtd:'',anu_val:'',anu_qtd:'',div_qtd:''})

  const carregar=useCallback(async()=>{
    const p=new URLSearchParams()
    if(empFiltro!=='todos')p.set('empreendimento_id',empFiltro)
    const d=await fetch(`/api/unidades?${p}`).then(r=>r.json())
    setUnidades(d.unidades??[])
  },[empFiltro])

  useEffect(()=>{
    fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[]))
    fetch('/api/configuracoes').then(r=>r.json()).then(d=>{if(d.mensagem_simulacao)setMsgBase(d.mensagem_simulacao)})
  },[])
  useEffect(()=>{carregar()},[carregar])

  const filtrados=unidades.filter(u=>{
    const stOk=statusFiltro.includes(u.status)
    const bOk=!busca||u.nome.toLowerCase().includes(busca.toLowerCase())||(u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase())
    return stOk&&bOk
  })

  function abrirSim(u:Unidade){setSel(u);setReservado(false);setCopiado(false);setOpcoes({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false});setSim({entrada_pct:'',entrada_rs:'',parcelas:'',int_val:'',int_qtd:'',sem_val:'',sem_qtd:'',anu_val:'',anu_qtd:'',div_qtd:''})}
  function toggleStatus(s:string){setStatusFiltro(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}

  const vT=sel?.valor_total??0
  const eRS=sim.entrada_rs?parseFloat(sim.entrada_rs):sim.entrada_pct?(vT*parseFloat(sim.entrada_pct)/100):0
  const ePct=vT>0?((eRS/vT)*100):0
  const dQ=parseInt(sim.div_qtd)||0; const eDivP=dQ>0&&eRS>0?eRS/dQ:0
  const iV=parseFloat(sim.int_val)||0; const iQ=parseInt(sim.int_qtd)||0
  const sV=parseFloat(sim.sem_val)||0; const sQ=parseInt(sim.sem_qtd)||0
  const aV=parseFloat(sim.anu_val)||0; const aQ=parseInt(sim.anu_qtd)||0
  const totAdd=(iV*iQ)+(sV*sQ)+(aV*aQ)
  const rest=Math.max(vT-eRS-totAdd,0); const pQ=parseInt(sim.parcelas)||0
  const pV=pQ>0&&rest>0?rest/pQ:0; const simOk=eRS>0||pQ>0

  function gerarMsg():string{
    if(!sel)return''
    const emp=(sel as any).empreendimento
    const l:string[]=[msgBase,'',`📍 *${emp?.nome??sel.nome}*`,`🔹 Lote: ${sel.nome}`]
    if(sel.area_m2)l.push(`📐 Área: ${sel.area_m2} m²`)
    l.push(`💰 Valor total: *${moeda(vT)}*`,'','━━━━━━━━━━━━━━━━━','')
    if(opcoes.entrada_dividida&&dQ>0&&eRS>0){l.push('✅ *Entrada dividida:*');l.push(`   ${dQ}x de ${moeda(eDivP)} = ${moeda(eRS)} (${ePct.toFixed(1)}%)`)}
    else if(eRS>0){l.push(`✅ *Entrada:* ${moeda(eRS)} (${ePct.toFixed(1)}%)`)}
    if(opcoes.parcelas_intermediarias&&iQ>0&&iV>0)l.push(`📅 *Intermediárias:* ${iQ}x de ${moeda(iV)} = ${moeda(iV*iQ)}`)
    if(opcoes.parcelas_semestrais&&sQ>0&&sV>0)l.push(`📆 *Semestrais:* ${sQ}x de ${moeda(sV)} = ${moeda(sV*sQ)}`)
    if(opcoes.parcelas_anuais&&aQ>0&&aV>0)l.push(`🗓️ *Anuais:* ${aQ}x de ${moeda(aV)} = ${moeda(aV*aQ)}`)
    if(pQ>0&&pV>0)l.push(`💳 *Saldo:* ${pQ}x de *${moeda(pV)}*`)
    l.push('','━━━━━━━━━━━━━━━━━','','📊 *Resumo:*',`• Valor total: ${moeda(vT)}`)
    if(eRS>0)l.push(`• Entrada: ${moeda(eRS)}`)
    if(totAdd>0)l.push(`• Outros: ${moeda(totAdd)}`)
    if(pQ>0)l.push(`• Saldo: ${pQ}x de ${moeda(pV)}`)
    l.push('','Qualquer dúvida, estou à disposição! 😊','_Prime Empreendimentos_')
    return l.join('\n')
  }

  async function copiar(){await navigator.clipboard.writeText(gerarMsg());setCopiado(true);setTimeout(()=>setCopiado(false),3000)}
  async function reservar(){if(!sel)return;setReservando(true);await fetch(`/api/unidades/${sel.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'reservado'})});setReservando(false);setReservado(true);carregar()}

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)',flex:1}}>Estoque</span>
        <span style={{fontSize:'var(--fs-sm)',color:'var(--text-3)'}}>{filtrados.length} unidades</span>
      </div>

      {/* Filtros */}
      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'10px'}}>
        <input type="text" placeholder="Buscar lote ou loteamento..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        <select value={empFiltro} onChange={e=>setEmpFiltro(e.target.value)}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {(['disponivel','reservado','vendido'] as const).map(s=>(
            <label key={s} style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontSize:'var(--fs-sm)',padding:'8px 12px',borderRadius:'20px',border:`0.5px solid ${statusFiltro.includes(s)?ST_COR[s]:'var(--border)'}`,background:statusFiltro.includes(s)?ST_BG[s]:'var(--bg)',color:statusFiltro.includes(s)?ST_COR[s]:'var(--text-3)',flex:1,justifyContent:'center'}}>
              <input type="checkbox" checked={statusFiltro.includes(s)} onChange={()=>toggleStatus(s)} style={{width:'16px',height:'16px',accentColor:ST_COR[s],cursor:'pointer'}}/>
              {ST_LABEL[s]}
            </label>
          ))}
        </div>
      </div>

      {/* Cards de unidades - mobile friendly */}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {filtrados.length===0 && <div className="empty">Nenhuma unidade encontrada.</div>}
        {filtrados.map(u=>(
          <div key={u.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'10px'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)'}}>{u.nome}</div>
                <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)',marginTop:'2px'}}>{(u as any).empreendimento?.nome??'—'}</div>
              </div>
              <span style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:ST_BG[u.status],color:ST_COR[u.status],fontWeight:500,flexShrink:0,marginLeft:'8px'}}>{ST_LABEL[u.status]}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'8px 10px'}}>
                <div style={{fontSize:'11px',color:'var(--text-3)'}}>Área</div>
                <div style={{fontSize:'var(--fs-base)',fontWeight:500}}>{u.area_m2?`${u.area_m2} m²`:'—'}</div>
              </div>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'8px 10px'}}>
                <div style={{fontSize:'11px',color:'var(--text-3)'}}>Valor total</div>
                <div style={{fontSize:'var(--fs-base)',fontWeight:600,color:'var(--teal)'}}>{moeda(u.valor_total)}</div>
              </div>
            </div>
            {u.status==='disponivel'
              ? <button onClick={()=>abrirSim(u)} style={{width:'100%',padding:'12px',fontSize:'var(--fs-base)',fontWeight:600,background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>
                  Simular pagamento
                </button>
              : <div style={{textAlign:'center',fontSize:'var(--fs-sm)',color:'var(--text-3)',padding:'8px'}}>Indisponível para simulação</div>
            }
          </div>
        ))}
      </div>

      {/* Modal Simulação */}
      {sel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg) var(--radius-lg) 0 0',width:'100%',maxWidth:'600px',maxHeight:'95vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
              <div>
                <div style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)'}}>Simulação</div>
                <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)',marginTop:'2px'}}>{sel.nome} · {(sel as any).empreendimento?.nome??'—'}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'24px',lineHeight:1,padding:'0'}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
              <div style={{background:'var(--teal-bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius-lg)',padding:'14px 16px'}}>
                <div style={{fontSize:'var(--fs-sm)',color:'var(--teal-text)',opacity:.8}}>Valor total do lote</div>
                <div style={{fontSize:'28px',fontWeight:700,color:'var(--teal-text)'}}>{moeda(vT)}</div>
                {sel.area_m2&&<div style={{fontSize:'var(--fs-sm)',color:'var(--teal-text)',opacity:.7,marginTop:'2px'}}>{sel.area_m2} m² · {moeda(vT/sel.area_m2)}/m²</div>}
              </div>
              {/* Opções */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'10px'}}>Opções do plano</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {([['entrada_dividida','Entrada dividida'],['parcelas_intermediarias','Intermediárias'],['parcelas_semestrais','Semestrais'],['parcelas_anuais','Anuais']] as [keyof Opcoes,string][]).map(([k,l])=>(
                    <label key={k} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'var(--fs-sm)',padding:'10px 12px',borderRadius:'var(--radius)',border:`0.5px solid ${opcoes[k]?'var(--teal)':'var(--border)'}`,background:opcoes[k]?'var(--teal-bg)':'var(--bg)'}}>
                      <input type="checkbox" checked={opcoes[k]} onChange={e=>setOpcoes(p=>({...p,[k]:e.target.checked}))} style={{width:'18px',height:'18px',accentColor:'var(--teal)',cursor:'pointer'}}/>
                      <span style={{color:opcoes[k]?'var(--teal-text)':'var(--text-2)',fontWeight:opcoes[k]?500:400}}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Entrada */}
              <div>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>{opcoes.entrada_dividida?'Valor total da entrada':'Entrada'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Percentual (%)</label><input type="number" placeholder="ex: 20" value={sim.entrada_pct} onChange={e=>setSim(p=>({...p,entrada_pct:e.target.value,entrada_rs:''}))} /></div>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Valor (R$)</label><input type="number" placeholder="ex: 17000" value={sim.entrada_rs} onChange={e=>setSim(p=>({...p,entrada_rs:e.target.value,entrada_pct:''}))} /></div>
                </div>
                {eRS>0&&<div style={{marginTop:'6px',fontSize:'var(--fs-sm)',color:'var(--text-2)'}}>Entrada: <strong>{moeda(eRS)}</strong> ({ePct.toFixed(1)}%)</div>}
              </div>
              {opcoes.entrada_dividida&&<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px',borderLeft:'3px solid var(--teal)'}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'6px'}}>Em quantas parcelas dividir?</div>
                <input type="number" placeholder="ex: 3" value={sim.div_qtd} onChange={e=>setSim(p=>({...p,div_qtd:e.target.value}))} style={{maxWidth:'160px'}}/>
                {eDivP>0&&<div style={{marginTop:'6px',fontSize:'var(--fs-sm)',color:'var(--teal-text)',fontWeight:500}}>{dQ}x de {moeda(eDivP)}</div>}
              </div>}
              {opcoes.parcelas_intermediarias&&<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px',borderLeft:'3px solid #7F77DD'}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>Parcelas intermediárias</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Quantidade</label><input type="number" value={sim.int_qtd} onChange={e=>setSim(p=>({...p,int_qtd:e.target.value}))} /></div>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Valor cada (R$)</label><input type="number" value={sim.int_val} onChange={e=>setSim(p=>({...p,int_val:e.target.value}))} /></div>
                </div>
                {iQ>0&&iV>0&&<div style={{marginTop:'6px',fontSize:'var(--fs-sm)',color:'#3C3489',fontWeight:500}}>{iQ}x de {moeda(iV)} = {moeda(iV*iQ)}</div>}
              </div>}
              {opcoes.parcelas_semestrais&&<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px',borderLeft:'3px solid #EF9F27'}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>Parcelas semestrais</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Quantidade</label><input type="number" value={sim.sem_qtd} onChange={e=>setSim(p=>({...p,sem_qtd:e.target.value}))} /></div>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Valor cada (R$)</label><input type="number" value={sim.sem_val} onChange={e=>setSim(p=>({...p,sem_val:e.target.value}))} /></div>
                </div>
                {sQ>0&&sV>0&&<div style={{marginTop:'6px',fontSize:'var(--fs-sm)',color:'#633806',fontWeight:500}}>{sQ}x de {moeda(sV)} = {moeda(sV*sQ)}</div>}
              </div>}
              {opcoes.parcelas_anuais&&<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px',borderLeft:'3px solid #639922'}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>Parcelas anuais</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Quantidade</label><input type="number" value={sim.anu_qtd} onChange={e=>setSim(p=>({...p,anu_qtd:e.target.value}))} /></div>
                  <div><label style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Valor cada (R$)</label><input type="number" value={sim.anu_val} onChange={e=>setSim(p=>({...p,anu_val:e.target.value}))} /></div>
                </div>
                {aQ>0&&aV>0&&<div style={{marginTop:'6px',fontSize:'var(--fs-sm)',color:'#27500A',fontWeight:500}}>{aQ}x de {moeda(aV)} = {moeda(aV*aQ)}</div>}
              </div>}
              <div>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>Parcelas mensais (saldo restante)</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <input type="number" placeholder="Quantidade de parcelas" value={sim.parcelas} onChange={e=>setSim(p=>({...p,parcelas:e.target.value}))} style={{maxWidth:'200px'}} />
                  {pQ>0&&pV>0&&<span style={{fontSize:'var(--fs-sm)',color:'var(--text-2)',whiteSpace:'nowrap'}}>{pQ}x de <strong>{moeda(pV)}</strong></span>}
                </div>
              </div>
              {simOk&&(
                <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px',border:'0.5px solid var(--border)'}}>
                  <div style={{fontSize:'var(--fs-sm)',fontWeight:600,marginBottom:'10px'}}>RESUMO</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)'}}><span style={{color:'var(--text-2)'}}>Valor do lote</span><span style={{fontWeight:500}}>{moeda(vT)}</span></div>
                    {eRS>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)'}}><span style={{color:'var(--text-2)'}}>{opcoes.entrada_dividida&&dQ>0?`Entrada (${dQ}x de ${moeda(eDivP)})`:'Entrada'}</span><span style={{fontWeight:500,color:'var(--teal)'}}>{moeda(eRS)}</span></div>}
                    {opcoes.parcelas_intermediarias&&iQ>0&&iV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)'}}><span style={{color:'var(--text-2)'}}>Intermediárias</span><span style={{fontWeight:500}}>{moeda(iV*iQ)}</span></div>}
                    {opcoes.parcelas_semestrais&&sQ>0&&sV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)'}}><span style={{color:'var(--text-2)'}}>Semestrais</span><span style={{fontWeight:500}}>{moeda(sV*sQ)}</span></div>}
                    {opcoes.parcelas_anuais&&aQ>0&&aV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-sm)'}}><span style={{color:'var(--text-2)'}}>Anuais</span><span style={{fontWeight:500}}>{moeda(aV*aQ)}</span></div>}
                    {pQ>0&&pV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'var(--fs-lg)',borderTop:'0.5px solid var(--border)',paddingTop:'8px',marginTop:'2px'}}><span>{pQ}x mensais de</span><span style={{fontWeight:700,color:'var(--teal)',fontSize:'22px'}}>{moeda(pV)}</span></div>}
                  </div>
                </div>
              )}
              {simOk&&<div><div style={{fontSize:'var(--fs-sm)',fontWeight:500,marginBottom:'8px'}}>💬 Mensagem para WhatsApp</div><textarea readOnly value={gerarMsg()} style={{width:'100%',minHeight:'160px',resize:'vertical',background:'var(--bg-2)',fontFamily:'monospace',lineHeight:1.6}}/></div>}
            </div>
            <div style={{padding:'14px 16px',borderTop:'0.5px solid var(--border)',background:'var(--bg-2)',display:'flex',gap:'10px',flexShrink:0}}>
              {simOk&&<button onClick={copiar} style={{flex:1,padding:'14px',fontSize:'var(--fs-sm)',background:copiado?'#1D9E75':'var(--bg)',color:copiado?'#fff':'var(--text)',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{copiado?'✓ Copiado!':'📋 Copiar'}</button>}
              {!reservado?<button onClick={reservar} disabled={reservando} style={{flex:1,padding:'14px',fontSize:'var(--fs-sm)',background:'#BA7517',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{reservando?'...':'🔒 Reservar'}</button>:<div style={{flex:1,padding:'14px',fontSize:'var(--fs-sm)',background:'#FAEEDA',color:'#633806',borderRadius:'var(--radius)',fontWeight:500,textAlign:'center'}}>✓ Reservado</div>}
              <button onClick={()=>setSel(null)} style={{padding:'14px 16px',fontSize:'var(--fs-sm)',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--text-2)'}}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
