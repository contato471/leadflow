'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Avatar from '@/components/Avatar'
import type { Empreendimento } from '@/types'

type Corretor = {
  id:string;name:string;email:string;phone:string|null;active:boolean
  corretor_empreendimento:Array<{empreendimento_id:string;participa_rodizio:boolean}>
  leads_total?:number;leads_atendimento?:number;leads_convertido?:number;taxa_conversao?:string
}

const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}
function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}

export default function CorretoresPage() {
  const [corretores,setCorretores]=useState<Corretor[]>([])
  const [emps,setEmps]=useState<Empreendimento[]>([])
  const [estado,setEstado]=useState<Record<string,{emps:string[];rodizio:boolean;active:boolean}>>({})
  const [expandido,setExpandido]=useState<string|null>(null)
  const [salvando,setSalvando]=useState<string|null>(null)
  const [salvo,setSalvo]=useState<string|null>(null)
  const [aba,setAba]=useState<'ranking'|'config'>('ranking')
  const [modalNovo,setModalNovo]=useState(false)
  const [modalExcluir,setModalExcluir]=useState<Corretor|null>(null)
  const [excluindo,setExcluindo]=useState(false)
  const [novoForm,setNovoForm]=useState({name:'',email:'',phone:'',password:''})
  const [criando,setCriando]=useState(false)
  const [erroNovo,setErroNovo]=useState('')

  const carregar=useCallback(async()=>{
    // Busca corretores + leads via API admin (bypassa RLS)
    const [corsRes,empsRes,leadsRes]=await Promise.all([
      fetch('/api/corretores').then(r=>r.json()),
      fetch('/api/empreendimentos').then(r=>r.json()),
      fetch('/api/leads').then(r=>r.json()),
    ])
    const lista:Corretor[]=corsRes.corretores??[]
    const leadsData=leadsRes.leads??[]

    // Calcular métricas a partir dos leads reais
    lista.forEach(c=>{
      const meus=leadsData.filter((l:any)=>l.corretor_id===c.id)
      c.leads_total=meus.length
      c.leads_atendimento=meus.filter((l:any)=>l.status==='em_atendimento').length
      c.leads_convertido=meus.filter((l:any)=>l.status==='convertido').length
      c.taxa_conversao=meus.length>0?(((c.leads_convertido??0)/meus.length)*100).toFixed(1):'0'
    })
    lista.sort((a,b)=>parseFloat(b.taxa_conversao??'0')-parseFloat(a.taxa_conversao??'0'))

    setCorretores(lista)
    setEmps(empsRes.empreendimentos??[])
    const e:Record<string,{emps:string[];rodizio:boolean;active:boolean}>={}
    lista.forEach(c=>{e[c.id]={emps:c.corretor_empreendimento.map((x:any)=>x.empreendimento_id),rodizio:c.corretor_empreendimento[0]?.participa_rodizio??true,active:c.active}})
    setEstado(e)
  },[])

  useEffect(()=>{carregar()},[carregar])

  function toggleEmp(corretorId:string,empId:string){
    setEstado(prev=>{const cur=prev[corretorId];const idx=cur.emps.indexOf(empId);return{...prev,[corretorId]:{...cur,emps:idx>=0?cur.emps.filter(e=>e!==empId):[...cur.emps,empId]}}})
  }

  async function salvar(corretorId:string){
    setSalvando(corretorId)
    const cfg=estado[corretorId]
    await fetch('/api/rodizio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({corretor_id:corretorId,empreendimentos:cfg.emps,participa_rodizio:cfg.rodizio,active:cfg.active})})
    setSalvando(null);setSalvo(corretorId);setTimeout(()=>setSalvo(null),2500);await carregar()
  }

  async function criarCorretor(e:React.FormEvent){
    e.preventDefault();setCriando(true);setErroNovo('')
    const res=await fetch('/api/corretores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(novoForm)})
    const d=await res.json()
    if(d.error){setErroNovo(d.error);setCriando(false);return}
    setCriando(false);setModalNovo(false);setNovoForm({name:'',email:'',phone:'',password:''});await carregar()
  }

  async function excluirCorretor(){
    if(!modalExcluir)return;setExcluindo(true)
    await fetch(`/api/corretores/${modalExcluir.id}`,{method:'DELETE'})
    setExcluindo(false);setModalExcluir(null);await carregar()
  }

  const maxConv=Math.max(...corretores.map(c=>parseFloat(c.taxa_conversao??'0')),0.1)

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)',flex:1}}>Corretores</span>
        <span style={{fontSize:'var(--fs-sm)',color:'var(--text-3)'}}>{corretores.length} cadastrados</span>
        <button onClick={()=>setModalNovo(true)} style={{padding:'9px 16px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>+ Novo corretor</button>
        <div style={{display:'flex',gap:'4px',background:'var(--bg-2)',padding:'3px',borderRadius:'var(--radius)'}}>
          {(['ranking','config'] as const).map(a=>(
            <button key={a} onClick={()=>setAba(a)} style={{fontSize:'var(--fs-sm)',padding:'6px 14px',borderRadius:'var(--radius)',cursor:'pointer',border:'none',background:aba===a?'var(--bg)':'transparent',color:aba===a?'var(--text)':'var(--text-3)',fontWeight:aba===a?500:400}}>
              {a==='ranking'?'Ranking & Métricas':'Configurações'}
            </button>
          ))}
        </div>
      </div>

      {corretores.length===0&&(
        <div style={{background:'var(--amber-bg)',border:'0.5px solid var(--amber-text)',borderRadius:'var(--radius-lg)',padding:'14px 16px',fontSize:'var(--fs-sm)',color:'var(--amber-text)'}}>
          Nenhum corretor encontrado. Clique em "+ Novo corretor" para adicionar.
        </div>
      )}

      {aba==='ranking'?(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {corretores.map((c,i)=>{
            const cor=av(c.name);const pct=maxConv>0?(parseFloat(c.taxa_conversao??'0')/maxConv)*100:0;const taxa=parseFloat(c.taxa_conversao??'0')
            return(
              <div key={c.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px',opacity:c.active?1:.5}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                  <div style={{width:'30px',height:'30px',borderRadius:'50%',background:i===0?'#FAEEDA':i===1?'#F0EEEA':'var(--bg-2)',color:i===0?'#633806':i===1?'#5F5E5A':'var(--text-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <Avatar nome={c.name} avatarUrl={null} size={40} fontSize={13}/>
                  <div style={{flex:1,minWidth:'140px'}}>
                    <div style={{fontSize:'var(--fs-base)',fontWeight:500,color:'var(--text)'}}>{c.name}</div>
                    <div style={{fontSize:'var(--fs-sm)',color:'var(--text-3)',marginTop:'1px'}}>{c.phone?.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')??'—'} · {c.email}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(54px,1fr))',gap:'8px',textAlign:'center',minWidth:'220px'}}>
                    {[{l:'Leads',v:c.leads_total??0,c:'var(--text)'},{l:'Atendendo',v:c.leads_atendimento??0,c:'#378ADD'},{l:'Convertidos',v:c.leads_convertido??0,c:'#1D9E75'},{l:'Taxa',v:`${c.taxa_conversao}%`,c:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A'}].map(m=>(
                      <div key={m.l} style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'8px 4px'}}>
                        <div style={{fontSize:'11px',color:'var(--text-3)'}}>{m.l}</div>
                        <div style={{fontSize:'var(--fs-lg)',fontWeight:700,color:m.c,lineHeight:1.2,marginTop:'2px'}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:'12px',height:'6px',background:'var(--bg-2)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A',borderRadius:'3px',transition:'width .5s'}}></div>
                </div>
              </div>
            )
          })}
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'10px'}}>
          {corretores.map(cor=>{
            const cfg=estado[cor.id]??{emps:[],rodizio:true,active:true};const corAv=av(cor.name);const aberto=expandido===cor.id
            return(
              <div key={cor.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',opacity:cfg.active?1:.55}}>
                <div onClick={()=>setExpandido(aberto?null:cor.id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px',cursor:'pointer',borderBottom:aberto?'0.5px solid var(--border)':'none'}}>
                  <div style={{width:'38px',height:'38px',borderRadius:'50%',background:corAv.bg,color:corAv.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:500,flexShrink:0}}>{ini(cor.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'var(--fs-base)',fontWeight:500,color:'var(--text)'}}>{cor.name}</div>
                    <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)',marginTop:'1px'}}>{cor.phone?.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')??'—'}</div>
                    <div style={{fontSize:'12px',color:'var(--text-3)'}}>{cor.email}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();setModalExcluir(cor)}} style={{background:'none',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',color:'var(--red-text)',fontSize:'12px',padding:'4px 8px'}}>✕</button>
                    <button className={`toggle ${cfg.active?'on':''}`} onClick={e=>{e.stopPropagation();setEstado(p=>({...p,[cor.id]:{...p[cor.id],active:!p[cor.id].active}}))}} aria-label="Ativar/desativar"/>
                  </div>
                </div>
                {aberto&&(
                  <div style={{padding:'14px'}}>
                    <div style={{fontSize:'12px',fontWeight:500,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'10px'}}>Empreendimentos que atende</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}}>
                      {emps.map(e=>(
                        <button key={e.id} onClick={()=>toggleEmp(cor.id,e.id)} style={{fontSize:'12px',padding:'6px 12px',borderRadius:'20px',cursor:'pointer',border:`0.5px solid ${cfg.emps.includes(e.id)?'var(--teal)':'var(--border-2)'}`,background:cfg.emps.includes(e.id)?'var(--teal-bg)':'transparent',color:cfg.emps.includes(e.id)?'var(--teal-text)':'var(--text-2)',fontWeight:cfg.emps.includes(e.id)?500:400}}>
                          {cfg.emps.includes(e.id)?'✓ ':''}{e.slug}
                        </button>
                      ))}
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'0.5px solid var(--border)',paddingTop:'12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'var(--fs-sm)',color:'var(--text-2)'}}>
                        Participar do rodízio
                        <button className={`toggle ${cfg.rodizio?'on':''}`} onClick={()=>setEstado(p=>({...p,[cor.id]:{...p[cor.id],rodizio:!p[cor.id].rodizio}}))} aria-label="Rodízio"/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {salvo===cor.id&&<span style={{fontSize:'var(--fs-sm)',color:'var(--teal)'}}>✓ Salvo</span>}
                        <button onClick={()=>salvar(cor.id)} disabled={salvando===cor.id} style={{padding:'8px 16px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>
                          {salvando===cor.id?'Salvando...':'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal novo corretor */}
      {modalNovo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'400px',overflow:'hidden'}}>
            <div style={{padding:'16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'var(--fs-lg)',fontWeight:600}}>Novo corretor</span>
              <button onClick={()=>{setModalNovo(false);setErroNovo('')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'22px',lineHeight:1}}>✕</button>
            </div>
            <form onSubmit={criarCorretor} style={{padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Nome completo *</label><input required value={novoForm.name} onChange={e=>setNovoForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Maria Silva"/></div>
              <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>E-mail *</label><input required type="email" value={novoForm.email} onChange={e=>setNovoForm(p=>({...p,email:e.target.value}))} placeholder="corretor@prime.com.br"/></div>
              <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Telefone</label><input value={novoForm.phone} onChange={e=>setNovoForm(p=>({...p,phone:e.target.value}))} placeholder="(75) 99999-0000"/></div>
              <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Senha inicial *</label><input required type="password" value={novoForm.password} onChange={e=>setNovoForm(p=>({...p,password:e.target.value}))} placeholder="mínimo 6 caracteres"/></div>
              {erroNovo&&<p style={{fontSize:'13px',color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 10px',borderRadius:'var(--radius)'}}>{erroNovo}</p>}
              <div style={{display:'flex',gap:'10px',paddingTop:'4px'}}>
                <button type="button" onClick={()=>{setModalNovo(false);setErroNovo('')}} style={{flex:1,padding:'10px'}}>Cancelar</button>
                <button type="submit" disabled={criando} style={{flex:1,padding:'10px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{criando?'Criando...':'Criar corretor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {modalExcluir&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'380px',padding:'24px'}}>
            <div style={{fontSize:'var(--fs-lg)',fontWeight:600,marginBottom:'8px'}}>Excluir corretor?</div>
            <p style={{fontSize:'var(--fs-sm)',color:'var(--text-2)',marginBottom:'6px'}}>Você está prestes a excluir <strong>{modalExcluir.name}</strong> ({modalExcluir.email}).</p>
            <p style={{fontSize:'13px',color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 10px',borderRadius:'var(--radius)',marginBottom:'16px'}}>⚠️ Esta ação não pode ser desfeita.</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setModalExcluir(null)} style={{flex:1,padding:'10px'}}>Cancelar</button>
              <button onClick={excluirCorretor} disabled={excluindo} style={{flex:1,padding:'10px',background:'var(--red-text)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{excluindo?'Excluindo...':'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
