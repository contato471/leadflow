'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'

export default function ConfiguracoesPage() {
  const [msgSim, setMsgSim] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/configuracoes').then(r=>r.json()).then(d => {
      setMsgSim(d.mensagem_simulacao ?? '')
      setLoading(false)
    })
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true)
    await fetch('/api/configuracoes', {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ mensagem_simulacao: msgSim }),
    })
    setSalvando(false); setSalvo(true); setTimeout(()=>setSalvo(false),3000)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'var(--text-3)'}}>Carregando...</div>

  return (
    <div style={{flex:1,overflowY:'auto',padding:'20px 16px',display:'flex',flexDirection:'column',gap:'14px',maxWidth:'600px'}}>
      <span style={{fontSize:'15px',fontWeight:600,color:'var(--text)'}}>Configurações do sistema</span>

      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'4px'}}>Mensagem de abertura para simulações</div>
        <div style={{fontSize:'12px',color:'var(--text-3)',marginBottom:'12px'}}>
          Esta mensagem aparece no início de todas as simulações de pagamento enviadas pelo WhatsApp. Apenas o administrador pode alterar.
        </div>
        <form onSubmit={salvar} style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <textarea
            value={msgSim}
            onChange={e=>setMsgSim(e.target.value)}
            rows={4}
            placeholder="Ex: Olá! Segue a simulação do lote que conversamos:"
            style={{width:'100%',fontSize:'13px',resize:'vertical',lineHeight:1.6}}
          />
          <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px',fontSize:'12px',color:'var(--text-2)'}}>
            <div style={{fontWeight:500,marginBottom:'4px'}}>Prévia da mensagem:</div>
            <div style={{fontStyle:'italic',whiteSpace:'pre-wrap'}}>{msgSim}</div>
            <div style={{marginTop:'6px',color:'var(--text-3)'}}>
              🔹 Lote: [nome do lote]{'\n'}
              💰 Valor: [valor total]{'\n'}
              ✅ Entrada: [valor]{'\n'}
              💳 Parcelas: [qtd]x de [valor]
            </div>
          </div>
          <button type="submit" disabled={salvando} style={{padding:'9px',fontSize:'13px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500,alignSelf:'flex-start',minWidth:'160px'}}>
            {salvando?'Salvando...':salvo?'✓ Salvo!':'Salvar mensagem'}
          </button>
        </form>
      </div>
    </div>
  )
}
