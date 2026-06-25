'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'

type Stats = {
  leads: { total:number; novo:number; em_atendimento:number; convertido:number; perdido:number; taxa:string }
  clientes: { total:number; funil:Record<string,number> }
  corretores: Array<{ id:string; name:string; leads:number; convertidos:number; taxa:string }>
  empreendimentos: Array<{ id:string; nome:string; slug:string; leads:number; unidades:number; vendidas:number }>
  unidades: { total:number; disponiveis:number; reservados:number; vendidos:number; valorEstoque:number; valorVendido:number }
}

function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function moedaK(v:number){if(v>=1e6)return`R$ ${(v/1e6).toFixed(1)}M`;if(v>=1e3)return`R$ ${(v/1e3).toFixed(0)}K`;return moeda(v)}

export default function RelatoriosPage() {
  const [stats,setStats]=useState<Stats|null>(null)
  const [loading,setLoading]=useState(true)

  const carregar=useCallback(async()=>{
    setLoading(true)
    const [leadsRes,clientesRes,corsRes,empsRes,unidsRes]=await Promise.all([
      fetch('/api/leads').then(r=>r.json()),
      fetch('/api/clientes?limit=500').then(r=>r.json()),
      fetch('/api/corretores').then(r=>r.json()),
      fetch('/api/empreendimentos').then(r=>r.json()),
      fetch('/api/unidades').then(r=>r.json()),
    ])
    const leads=leadsRes.leads??[]
    const clientes=clientesRes.clientes??[]
    const corretores=corsRes.corretores??[]
    const emps=empsRes.empreendimentos??[]
    const unidades=unidsRes.unidades??[]

    const disp=unidades.filter((u:any)=>u.status==='disponivel')
    const vend=unidades.filter((u:any)=>u.status==='vendido')

    const stats:Stats={
      leads:{
        total:leads.length,novo:leads.filter((l:any)=>l.status==='novo').length,
        em_atendimento:leads.filter((l:any)=>l.status==='em_atendimento').length,
        convertido:leads.filter((l:any)=>l.status==='convertido').length,
        perdido:leads.filter((l:any)=>l.status==='perdido').length,
        taxa:leads.length>0?((leads.filter((l:any)=>l.status==='convertido').length/leads.length)*100).toFixed(1):'0',
      },
      clientes:{
        total:clientes.length,
        funil:clientes.reduce((acc:Record<string,number>,c:any)=>{acc[c.etapa]=(acc[c.etapa]??0)+1;return acc},{}),
      },
      corretores:corretores.map((c:any)=>{
        const meus=leads.filter((l:any)=>l.corretor_id===c.id)
        const conv=meus.filter((l:any)=>l.status==='convertido').length
        return{id:c.id,name:c.name,leads:meus.length,convertidos:conv,taxa:meus.length>0?((conv/meus.length)*100).toFixed(1):'0'}
      }).sort((a:any,b:any)=>parseFloat(b.taxa)-parseFloat(a.taxa)),
      empreendimentos:emps.map((e:any)=>{
        const eLeads=leads.filter((l:any)=>l.empreendimento_id===e.id)
        const eUnids=unidades.filter((u:any)=>u.empreendimento_id===e.id)
        return{id:e.id,nome:e.nome,slug:e.slug,leads:eLeads.length,unidades:eUnids.length,vendidas:eUnids.filter((u:any)=>u.status==='vendido').length}
      }).filter((e:any)=>e.leads>0||e.unidades>0),
      unidades:{
        total:unidades.length,
        disponiveis:disp.length,
        reservados:unidades.filter((u:any)=>u.status==='reservado').length,
        vendidos:vend.length,
        valorEstoque:disp.reduce((s:number,u:any)=>s+u.valor_total,0),
        valorVendido:vend.reduce((s:number,u:any)=>s+u.valor_total,0),
      },
    }
    setStats(stats)
    setLoading(false)
  },[])

  useEffect(()=>{carregar()},[carregar])

  if(loading)return<div className="loading">Carregando relatórios...</div>
  if(!stats)return null

  const ETAPA_LABEL:Record<string,string>={lead_novo:'Lead novo',atendimento:'Atendimento',visita_agendada:'Visita agendada',visita_realizada:'Visita realizada',proposta:'Proposta',venda_feita:'Venda feita',sucesso_cliente:'Sucesso',follow_up:'Follow-up',sem_resposta:'Sem resposta',desistente:'Desistente'}
  const ETAPA_COR:Record<string,string>={lead_novo:'#888780',atendimento:'#378ADD',visita_agendada:'#7F77DD',visita_realizada:'#5DCAA5',proposta:'#EF9F27',venda_feita:'#639922',sucesso_cliente:'#1D9E75',follow_up:'#BA7517',sem_resposta:'#888',desistente:'#E24B4A'}

  const maxFunil=Math.max(...Object.values(stats.clientes.funil),1)

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
        <span style={{fontSize:'18px',fontWeight:600,color:'var(--text)'}}>Relatórios</span>
        <button onClick={carregar} style={{padding:'8px 14px',fontSize:'13px'}}>↻ Atualizar</button>
      </div>

      {/* Leads */}
      <section>
        <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#378ADD',display:'inline-block'}}></span>
          Leads
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
          {[
            {l:'Total',v:stats.leads.total,c:'var(--text)'},
            {l:'Novos',v:stats.leads.novo,c:'#888780'},
            {l:'Em atendimento',v:stats.leads.em_atendimento,c:'#378ADD'},
            {l:'Convertidos',v:stats.leads.convertido,c:'#1D9E75'},
            {l:'Perdidos',v:stats.leads.perdido,c:'#E24B4A'},
            {l:'Taxa de conversão',v:`${stats.leads.taxa}%`,c:parseFloat(stats.leads.taxa)>10?'#1D9E75':parseFloat(stats.leads.taxa)>5?'#BA7517':'#E24B4A'},
          ].map(s=>(
            <div key={s.l} style={{flex:'1 1 120px',minWidth:'100px',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
              <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
              <div style={{fontSize:'22px',fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Funil CRM */}
      <section>
        <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--teal)',display:'inline-block'}}></span>
          Funil de clientes — {stats.clientes.total} no total
        </div>
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {Object.entries(stats.clientes.funil).sort((a,b)=>b[1]-a[1]).map(([etapa,total])=>{
            const pct=Math.round((total/maxFunil)*100)
            return(
              <div key={etapa} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'130px',fontSize:'12px',color:'var(--text-2)',textAlign:'right',flexShrink:0}}>{ETAPA_LABEL[etapa]??etapa}</div>
                <div style={{flex:1,height:'20px',background:'var(--bg-2)',borderRadius:'4px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:ETAPA_COR[etapa]??'#888',borderRadius:'4px',display:'flex',alignItems:'center',paddingLeft:'6px',fontSize:'11px',color:'#fff',fontWeight:500}}>{total>0?total:''}</div>
                </div>
                <div style={{width:'28px',textAlign:'right',fontSize:'12px',color:'var(--text-3)',flexShrink:0}}>{total}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Ranking corretores */}
      <section>
        <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#EF9F27',display:'inline-block'}}></span>
          Ranking de corretores
        </div>
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--bg-2)'}}>
                {['#','Corretor','Leads','Convertidos','Taxa de conversão'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.corretores.map((c,i)=>{
                const taxa=parseFloat(c.taxa)
                return(
                  <tr key={c.id} style={{borderBottom:'0.5px solid var(--border)'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                    <td style={{padding:'10px 14px',fontWeight:700,color:i===0?'#633806':i===1?'#5F5E5A':'var(--text-3)'}}>{i+1}</td>
                    <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text)'}}>{c.name}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{c.leads}</td>
                    <td style={{padding:'10px 14px',color:'#1D9E75',fontWeight:500}}>{c.convertidos}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{width:'80px',height:'6px',background:'var(--bg-2)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${Math.min(taxa*5,100)}%`,background:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A',borderRadius:'3px'}}></div>
                        </div>
                        <span style={{fontWeight:600,color:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A'}}>{c.taxa}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {stats.corretores.length===0&&<tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'var(--text-3)'}}>Nenhum dado ainda</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Estoque */}
      <section>
        <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#639922',display:'inline-block'}}></span>
          Estoque de unidades
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
          {[
            {l:'Total de lotes',v:stats.unidades.total,c:'var(--text)'},
            {l:'Disponíveis',v:stats.unidades.disponiveis,c:'#1D9E75'},
            {l:'Reservados',v:stats.unidades.reservados,c:'#BA7517'},
            {l:'Vendidos',v:stats.unidades.vendidos,c:'#E24B4A'},
            {l:'Em estoque (R$)',v:moedaK(stats.unidades.valorEstoque),c:'#1D9E75'},
            {l:'Valor vendido',v:moedaK(stats.unidades.valorVendido),c:'#E24B4A'},
          ].map(s=>(
            <div key={s.l} style={{flex:'1 1 140px',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
              <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
              <div style={{fontSize:'20px',fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Por empreendimento */}
      {stats.empreendimentos.length>0&&(
        <section>
          <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#7F77DD',display:'inline-block'}}></span>
            Por empreendimento
          </div>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'500px'}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--bg-2)'}}>
                    {['Empreendimento','Leads','Unidades','Vendidas','Taxa'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.empreendimentos.map(e=>{
                    const taxa=e.unidades>0?((e.vendidas/e.unidades)*100).toFixed(1):'0'
                    return(
                      <tr key={e.id} style={{borderBottom:'0.5px solid var(--border)'}}
                        onMouseEnter={ev=>(ev.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                        onMouseLeave={ev=>(ev.currentTarget as HTMLElement).style.background='transparent'}>
                        <td style={{padding:'10px 14px'}}><div style={{fontWeight:500,color:'var(--text)'}}>{e.slug}</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>{e.nome}</div></td>
                        <td style={{padding:'10px 14px',color:'#378ADD',fontWeight:500}}>{e.leads}</td>
                        <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{e.unidades}</td>
                        <td style={{padding:'10px 14px',color:'#1D9E75',fontWeight:500}}>{e.vendidas}</td>
                        <td style={{padding:'10px 14px',fontWeight:600,color:parseFloat(taxa)>20?'#1D9E75':parseFloat(taxa)>10?'#BA7517':'var(--text-3)'}}>{taxa}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
