'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { User, Empreendimento } from '@/types'

type CorretorComMetrics = User & {
  corretor_empreendimento: Array<{ empreendimento_id: string; participa_rodizio: boolean }>
  leads_total?: number
  leads_convertidos?: number
  leads_em_atendimento?: number
  taxa_conversao?: string
}

const AVC = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806']
function av(n: string) { const [bg,tx] = AVC[n.charCodeAt(0)%AVC.length].split(':'); return {bg,tx} }
function ini(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<CorretorComMetrics[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [expandido, setExpandido] = useState<string|null>(null)
  const [estado, setEstado] = useState<Record<string,{emps:string[];rodizio:boolean;active:boolean}>>({})
  const [salvando, setSalvando] = useState<string|null>(null)
  const [salvo, setSalvo] = useState<string|null>(null)
  const [aba, setAba] = useState<'ranking'|'config'>('ranking')
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const [{ data: cors }, { data: empsData }, { data: leads }] = await Promise.all([
      supabase.from('users').select('*, corretor_empreendimento(empreendimento_id, participa_rodizio)').eq('role','corretor').order('name'),
      supabase.from('empreendimentos').select('*').eq('ativo', true).order('nome'),
      supabase.from('leads').select('corretor_id, status'),
    ])
    const lista = (cors as CorretorComMetrics[]) ?? []
    const leadsData = leads ?? []
    lista.forEach(c => {
      const meus = leadsData.filter(l => l.corretor_id === c.id)
      c.leads_total = meus.length
      c.leads_convertidos = meus.filter(l => l.status === 'convertido').length
      c.leads_em_atendimento = meus.filter(l => l.status === 'em_atendimento').length
      c.taxa_conversao = meus.length > 0 ? ((c.leads_convertidos / meus.length)*100).toFixed(1) : '0'
    })
    lista.sort((a,b) => parseFloat(b.taxa_conversao??'0') - parseFloat(a.taxa_conversao??'0'))
    setCorretores(lista)
    setEmps(empsData ?? [])
    const e: Record<string,{emps:string[];rodizio:boolean;active:boolean}> = {}
    lista.forEach(c => { e[c.id] = { emps: c.corretor_empreendimento.map(x=>x.empreendimento_id), rodizio: c.corretor_empreendimento[0]?.participa_rodizio??true, active: c.active } })
    setEstado(e)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function toggleEmp(corretorId: string, empId: string) {
    setEstado(prev => {
      const cur = prev[corretorId]
      const idx = cur.emps.indexOf(empId)
      return { ...prev, [corretorId]: { ...cur, emps: idx>=0 ? cur.emps.filter(e=>e!==empId) : [...cur.emps, empId] } }
    })
  }

  async function salvar(corretorId: string) {
    setSalvando(corretorId)
    const cfg = estado[corretorId]
    await fetch('/api/rodizio', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ corretor_id:corretorId, empreendimentos:cfg.emps, participa_rodizio:cfg.rodizio, active:cfg.active }),
    })
    setSalvando(null); setSalvo(corretorId)
    setTimeout(()=>setSalvo(null),2500)
    await carregar()
  }

  const maxConv = Math.max(...corretores.map(c=>parseFloat(c.taxa_conversao??'0')), 0.1)

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <span style={{ fontSize:'15px', fontWeight:600, color:'var(--text)', flex:1 }}>Corretores</span>
        <div style={{ display:'flex', gap:'4px', background:'var(--bg-2)', padding:'3px', borderRadius:'var(--radius)' }}>
          {(['ranking','config'] as const).map(a => (
            <button key={a} onClick={()=>setAba(a)} style={{ fontSize:'12px', padding:'5px 14px', borderRadius:'var(--radius)', cursor:'pointer', border:'none', background:aba===a?'var(--bg)':'transparent', color:aba===a?'var(--text)':'var(--text-3)', fontWeight:aba===a?500:400 }}>
              {a==='ranking'?'Ranking & Métricas':'Configurações'}
            </button>
          ))}
        </div>
      </div>

      {aba === 'ranking' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {corretores.map((c, i) => {
            const cor = av(c.name)
            const pct = maxConv > 0 ? (parseFloat(c.taxa_conversao??'0')/maxConv)*100 : 0
            const taxa = parseFloat(c.taxa_conversao??'0')
            return (
              <div key={c.id} style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px', opacity:c.active?1:.5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:i===0?'#FAEEDA':i===1?'#F0EEEA':i===2?'#F5EFE8':'var(--bg-2)', color:i===0?'#633806':i===1?'#5F5E5A':i===2?'#7A6040':'var(--text-3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:cor.bg, color:cor.tx, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:500, flexShrink:0 }}>{ini(c.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-3)', marginTop:'1px' }}>{c.phone?.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3') ?? '—'}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,60px)', gap:'8px', textAlign:'center' }}>
                    {[
                      { l:'Leads', v:c.leads_total??0, c:'var(--text)' },
                      { l:'Atendendo', v:c.leads_em_atendimento??0, c:'#378ADD' },
                      { l:'Convertidos', v:c.leads_convertidos??0, c:'#1D9E75' },
                      { l:'Taxa', v:`${c.taxa_conversao}%`, c:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A' },
                    ].map(m => (
                      <div key={m.l}>
                        <div style={{ fontSize:'11px', color:'var(--text-3)' }}>{m.l}</div>
                        <div style={{ fontSize:'14px', fontWeight:600, color:m.c }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop:'10px', height:'5px', background:'var(--bg-2)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:taxa>10?'#1D9E75':taxa>5?'#BA7517':'#E24B4A', borderRadius:'3px', transition:'width .4s' }}></div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'10px' }}>
          {corretores.map(cor => {
            const cfg = estado[cor.id] ?? { emps:[], rodizio:true, active:true }
            const corAv = av(cor.name)
            const aberto = expandido === cor.id
            return (
              <div key={cor.id} style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', opacity:cfg.active?1:.55 }}>
                <div onClick={()=>setExpandido(aberto?null:cor.id)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', cursor:'pointer', borderBottom:aberto?'0.5px solid var(--border)':'none' }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:corAv.bg, color:corAv.tx, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:500, flexShrink:0 }}>{ini(cor.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)' }}>{cor.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-2)' }}>{cfg.emps.length} empreendimento{cfg.emps.length!==1?'s':''}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'11px', color:'var(--text-3)' }}>{cfg.active?'Ativo':'Inativo'}</span>
                    <button className={`toggle ${cfg.active?'on':''}`} onClick={e=>{e.stopPropagation();setEstado(p=>({...p,[cor.id]:{...p[cor.id],active:!p[cor.id].active}}))}} aria-label="Ativar/desativar"/>
                  </div>
                </div>
                {aberto && (
                  <div style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'8px' }}>Empreendimentos</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'12px' }}>
                      {emps.map(e => (
                        <button key={e.id} onClick={()=>toggleEmp(cor.id,e.id)} style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', cursor:'pointer', border:`0.5px solid ${cfg.emps.includes(e.id)?'var(--teal)':'var(--border-2)'}`, background:cfg.emps.includes(e.id)?'var(--teal-bg)':'transparent', color:cfg.emps.includes(e.id)?'var(--teal-text)':'var(--text-2)' }}>
                          {cfg.emps.includes(e.id)?'✓ ':''}{e.slug}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'0.5px solid var(--border)', paddingTop:'10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--text-2)' }}>
                        Rodízio
                        <button className={`toggle ${cfg.rodizio?'on':''}`} onClick={()=>setEstado(p=>({...p,[cor.id]:{...p[cor.id],rodizio:!p[cor.id].rodizio}}))} aria-label="Rodízio"/>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {salvo===cor.id && <span style={{ fontSize:'12px', color:'var(--teal)' }}>✓ Salvo</span>}
                        <button onClick={()=>salvar(cor.id)} disabled={salvando===cor.id} style={{ fontSize:'12px', padding:'6px 14px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer' }}>
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
    </div>
  )
}
