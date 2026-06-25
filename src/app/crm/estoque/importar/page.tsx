'use client'
export const dynamic = 'force-dynamic'
import { useRef, useState } from 'react'

type Resultado = {
  processadas: number; importadas: number; atualizadas: number
  ignoradas: number; erros: string[]; empreendimentos: string[]
}

export default function ImportarEstoquePage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [modo, setModo] = useState<'atualizar' | 'substituir'>('atualizar')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function importar() {
    if (!arquivo) return
    setImportando(true); setErro(''); setResultado(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1]
        const res = await fetch('/api/unidades/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, modoImportacao: modo }),
        })
        const data = await res.json()
        if (data.error) setErro(data.error)
        else setResultado(data)
        setImportando(false)
      }
      reader.readAsDataURL(arquivo)
    } catch (err) {
      setErro('Erro ao ler o arquivo')
      setImportando(false)
    }
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:'16px', maxWidth:'700px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <a href="/crm/estoque" style={{ color:'var(--text-3)', textDecoration:'none', fontSize:'20px' }}>←</a>
        <span style={{ fontSize:'18px', fontWeight:600, color:'var(--text)' }}>Importar planilha de estoque</span>
      </div>

      {/* Instruções */}
      <div style={{ background:'var(--blue-bg)', border:'0.5px solid var(--blue-text)', borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--blue-text)', marginBottom:'8px' }}>📋 Como funciona</div>
        <div style={{ fontSize:'13px', color:'var(--blue-text)', lineHeight:1.7 }}>
          • Cada <strong>aba</strong> da planilha deve corresponder a um empreendimento<br/>
          • O nome da aba deve conter a <strong>sigla</strong> (ex: MV, CDA, BLC, AV...)<br/>
          • As colunas são detectadas automaticamente por nome<br/>
          • Colunas esperadas: <strong>Lote/Unidade · Área (m²) · Valor/m² · Valor Total · Status</strong><br/>
          • Se não tiver "Valor Total", o sistema calcula: Área × Valor/m²<br/>
          • Status reconhecidos: "disponível", "reservado", "vendido"
        </div>
      </div>

      {/* Siglas reconhecidas */}
      <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'10px' }}>Siglas reconhecidas nas abas:</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
          {['MV','CDA','VV','PDC','VM1','BS','BI','CAC','MVE','AV','RR','NN','BLC'].map(s => (
            <span key={s} style={{ fontSize:'12px', padding:'4px 10px', borderRadius:'20px', background:'var(--bg-2)', border:'0.5px solid var(--border-2)', color:'var(--text)', fontWeight:500 }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px' }}>
        <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)', marginBottom:'12px' }}>Selecionar planilha</div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border:`2px dashed ${arquivo ? 'var(--teal)' : 'var(--border-2)'}`, borderRadius:'var(--radius-lg)', padding:'32px 16px', textAlign:'center', cursor:'pointer', background:arquivo?'var(--teal-bg)':'var(--bg-2)', transition:'all .2s', marginBottom:'14px' }}
        >
          {arquivo ? (
            <>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontSize:'14px', fontWeight:500, color:'var(--teal-text)' }}>{arquivo.name}</div>
              <div style={{ fontSize:'12px', color:'var(--teal-text)', marginTop:'4px' }}>
                {(arquivo.size / 1024).toFixed(0)} KB · Clique para trocar
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>📊</div>
              <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text-2)' }}>Clique para selecionar o arquivo Excel</div>
              <div style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'4px' }}>.xlsx ou .xls</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => setArquivo(e.target.files?.[0] ?? null)} style={{ display:'none' }}/>

        {/* Modo de importação */}
        <div style={{ marginBottom:'14px' }}>
          <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>Modo de importação:</div>
          <div style={{ display:'flex', gap:'10px' }}>
            {([
              ['atualizar', '🔄 Atualizar', 'Mantém unidades existentes e adiciona/atualiza as da planilha'],
              ['substituir', '♻️ Substituir tudo', 'Apaga todas as unidades do empreendimento e reimporta do zero'],
            ] as const).map(([val, label, desc]) => (
              <label key={val} style={{ flex:1, padding:'12px', border:`1.5px solid ${modo===val?'var(--teal)':'var(--border)'}`, borderRadius:'var(--radius-lg)', cursor:'pointer', background:modo===val?'var(--teal-bg)':'var(--bg-2)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <input type="radio" name="modo" value={val} checked={modo===val} onChange={()=>setModo(val)} style={{ accentColor:'var(--teal)' }}/>
                  <span style={{ fontSize:'13px', fontWeight:600, color:modo===val?'var(--teal-text)':'var(--text)' }}>{label}</span>
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-3)', paddingLeft:'20px' }}>{desc}</div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={importar}
          disabled={!arquivo || importando}
          style={{ width:'100%', padding:'14px', fontSize:'15px', fontWeight:600, background:arquivo?'var(--teal)':'var(--bg-2)', color:arquivo?'#fff':'var(--text-3)', border:'none', borderRadius:'var(--radius-lg)', cursor:arquivo?'pointer':'not-allowed', transition:'all .2s' }}
        >
          {importando ? '⏳ Importando...' : '📥 Importar planilha'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background:'var(--red-bg)', border:'0.5px solid var(--red-text)', borderRadius:'var(--radius-lg)', padding:'14px 16px', fontSize:'14px', color:'var(--red-text)' }}>
          ❌ {erro}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', background:'var(--teal-bg)', borderBottom:'0.5px solid var(--teal)', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'22px' }}>✅</span>
            <span style={{ fontSize:'15px', fontWeight:600, color:'var(--teal-text)' }}>Importação concluída!</span>
          </div>
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
            {/* Empreendimentos processados */}
            {resultado.empreendimentos.length > 0 && (
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Abas processadas:</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {resultado.empreendimentos.map(e => (
                    <span key={e} style={{ fontSize:'12px', padding:'3px 10px', borderRadius:'20px', background:'var(--teal-bg)', color:'var(--teal-text)', fontWeight:500 }}>✓ {e}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Números */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
              {[
                { l:'Processadas', v:resultado.processadas, c:'var(--text)' },
                { l:'Novas', v:resultado.importadas, c:'#1D9E75' },
                { l:'Atualizadas', v:resultado.atualizadas, c:'#378ADD' },
                { l:'Ignoradas', v:resultado.ignoradas, c:'#BA7517' },
              ].map(s => (
                <div key={s.l} style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'var(--text-3)', marginBottom:'3px' }}>{s.l}</div>
                  <div style={{ fontSize:'22px', fontWeight:700, color:s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Erros */}
            {resultado.erros.length > 0 && (
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'#BA7517', marginBottom:'6px' }}>⚠️ Avisos ({resultado.erros.length}):</div>
                <div style={{ background:'#FAEEDA', borderRadius:'var(--radius)', padding:'10px 12px', maxHeight:'200px', overflowY:'auto' }}>
                  {resultado.erros.map((e, i) => (
                    <div key={i} style={{ fontSize:'12px', color:'#633806', padding:'2px 0', borderBottom:i < resultado.erros.length-1?'0.5px solid rgba(0,0,0,0.08)':'none' }}>{e}</div>
                  ))}
                </div>
              </div>
            )}

            <a href="/crm/estoque" style={{ display:'block', textAlign:'center', padding:'12px', fontSize:'14px', background:'var(--teal)', color:'#fff', borderRadius:'var(--radius-lg)', textDecoration:'none', fontWeight:600 }}>
              → Ver estoque atualizado
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
