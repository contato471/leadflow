'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { FUNIL_ETAPAS } from '@/types'

type D = { kpis:{total:number;atendimento:number;vendas:number;perdidos:number;taxaConv:string}; funil:{etapa:string;total:number}[]; porOrigem:{origem:string;total:number}[]; porEmp:{id:string;nome:string;slug:string;total:number;vendas:number;taxa:string}[]; porCorretor:{id:string;nome:string;total:number;vendas:number;taxa:string}[] }

const ORIG_LABEL:Record<string,string> = {olx:'OLX',chaves_na_mao:'Chaves na Mão',facebook_ads:'Facebook ADS',ligacao:'Ligação',fluxo:'Fluxo',trello:'Trello',outro:'Outro'}
const ORIG_COR:Record<string,string> = {olx:'#7F77DD',chaves_na_mao:'#5DCAA5',facebook_ads:'#378ADD',ligacao:'#EF9F27',fluxo:'#1D9E75',trello:'#BA7517',outro:'#888780'}
const AVC = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(i:number){const[bg,tx]=AVC[i%AVC.length].split(':');return{bg,tx}}
function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}

export default function Dashboard() {
  const [data, setData] = useState<D|null>(null)
  const [emps, setEmps] = useState<{id:string;nome:string;slug:string}[]>([])
  const [periodo, setPeriodo] = useState('30d')

  const carregar = useCallback(async () => {
    const res = await fetch('/api/crm')
    setData(await res.json())
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[])) }, [])

  if (!data) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'var(--text-3)',fontSize:'14px'}}>Carregando...</div>

  const maxF = Math.max(...data.funil.map(f=>f.total),1)
  const maxR = Math.max(...data.porCorretor.map(c=>parseFloat(c.taxa)),0.1)

  return (
    <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <span style={{fontSize:'14px',fontWeight:500,color:'var(--text)',flex:1}}>Dashboard CRM</span>
        {['7d','30d','90d','ano'].map(p=>(
          <button key={p} onClick={()=>setPeriodo(p)} style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',cursor:'pointer',border:`0.5px solid ${periodo===p?'var(--border-2)':'var(--border)'}`,background:periodo===p?'var(--bg)':'transparent',color:periodo===p?'var(--text)':'var(--text-3)',fontWeight:periodo===p?500:400}}>{p==='ano'?'Este ano':p}</button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:'8px'}}>
        {[{l:'Total no funil',v:data.kpis.total,c:undefined},{l:'Em atendimento',v:data.kpis.atendimento,c:'#378ADD'},{l:'Vendas feitas',v:data.kpis.vendas,c:'#1D9E75'},{l:'Taxa conversão',v:`${data.kpis.taxaConv}%`,c:undefined},{l:'Perdidos',v:data.kpis.perdidos,c:'#E24B4A'}].map(k=>(
          <div key={k.l} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px'}}>
            <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'3px'}}>{k.l}</div>
            <div style={{fontSize:'20px',fontWeight:500,color:k.c??'var(--text)'}}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
        <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>Distribuição no funil</div>
        {FUNIL_ETAPAS.map(e=>{
          const t=data.funil.find(f=>f.etapa===e.value)?.total??0
          const pct=Math.round((t/maxF)*100)
          return(
            <div key={e.value} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
              <div style={{width:'110px',fontSize:'10px',color:'var(--text-2)',textAlign:'right',flexShrink:0}}>{e.label}</div>
              <div style={{flex:1,height:'16px',background:'var(--bg-2)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:e.cor,borderRadius:'3px',display:'flex',alignItems:'center',paddingLeft:'4px',fontSize:'9px',color:'#fff',fontWeight:500}}>{pct>15?t:''}</div>
              </div>
              <div style={{width:'22px',textAlign:'right',fontSize:'10px',color:'var(--text-3)',flexShrink:0}}>{t}</div>
            </div>
          )
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>Ranking de corretores</div>
          {data.porCorretor.length===0
            ? <div style={{fontSize:'12px',color:'var(--text-3)',textAlign:'center',padding:'16px'}}>Nenhum dado ainda</div>
            : data.porCorretor.slice(0,6).map((c,i)=>{
              const cor=av(i); const pct=maxR>0?(parseFloat(c.taxa)/maxR)*100:0
              return(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 0',borderBottom:'0.5px solid var(--border)'}}>
                  <div style={{width:'15px',height:'15px',borderRadius:'50%',background:i===0?'#FAEEDA':'var(--bg-2)',color:i===0?'#633806':'var(--text-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:500,flexShrink:0}}>{i+1}</div>
                  <div style={{width:'22px',height:'22px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:500,flexShrink:0}}>{ini(c.nome)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.nome}</div>
                    <div style={{fontSize:'10px',color:'var(--text-3)'}}>{c.vendas} vendas · {c.total} leads</div>
                  </div>
                  <div style={{width:'55px',height:'4px',background:'var(--bg-2)',borderRadius:'2px',overflow:'hidden',flexShrink:0}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'#1D9E75',borderRadius:'2px'}}></div>
                  </div>
                  <div style={{fontSize:'11px',fontWeight:500,color:parseFloat(c.taxa)>5?'#1D9E75':parseFloat(c.taxa)>2?'#BA7517':'#E24B4A',width:'32px',textAlign:'right',flexShrink:0}}>{c.taxa}%</div>
                </div>
              )
            })
          }
        </div>

        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>Leads por origem</div>
          {data.porOrigem.length===0
            ? <div style={{fontSize:'12px',color:'var(--text-3)',textAlign:'center',padding:'16px'}}>Nenhum dado ainda</div>
            : data.porOrigem.map(o=>{
              const max=Math.max(...data.porOrigem.map(x=>x.total),1)
              const pct=Math.round((o.total/max)*100)
              return(
                <div key={o.origem} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
                  <div style={{width:'90px',fontSize:'10px',color:'var(--text-2)',textAlign:'right',flexShrink:0}}>{ORIG_LABEL[o.origem]??o.origem}</div>
                  <div style={{flex:1,height:'16px',background:'var(--bg-2)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:ORIG_COR[o.origem]??'#888',borderRadius:'3px',display:'flex',alignItems:'center',paddingLeft:'4px',fontSize:'9px',color:'#fff',fontWeight:500}}>{pct>20?o.total:''}</div>
                  </div>
                  <div style={{width:'22px',textAlign:'right',fontSize:'10px',color:'var(--text-3)',flexShrink:0}}>{o.total}</div>
                </div>
              )
            })
          }
        </div>
      </div>

      {data.porEmp.length > 0 && (
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>Conversão por empreendimento</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'8px'}}>
            {data.porEmp.map(e=>(
              <div key={e.id} style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'8px 10px'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',marginBottom:'2px'}}>{e.slug}</div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'4px'}}>{e.total} leads · {e.vendas} vendas</div>
                <div style={{height:'4px',background:'var(--bg-3)',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(parseFloat(e.taxa)*10,100)}%`,background:'#1D9E75',borderRadius:'2px'}}></div>
                </div>
                <div style={{fontSize:'11px',fontWeight:500,color:parseFloat(e.taxa)>5?'#1D9E75':parseFloat(e.taxa)>2?'#BA7517':'var(--text-3)',marginTop:'3px'}}>{e.taxa}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
