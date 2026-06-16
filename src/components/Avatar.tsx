'use client'
const CORES = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806']
export function getAvCor(nome: string) {
  const [bg, tx] = CORES[nome.charCodeAt(0) % CORES.length].split(':')
  return { bg, tx }
}
export function getIni(nome: string) {
  return nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()
}
interface AvatarProps {
  nome: string
  avatarUrl?: string | null
  size?: number
  fontSize?: number
}
export default function Avatar({ nome, avatarUrl, size = 32, fontSize = 11 }: AvatarProps) {
  const cor = getAvCor(nome)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarUrl ? 'transparent' : cor.bg,
      color: cor.tx, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize, fontWeight: 500, overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : getIni(nome)
      }
    </div>
  )
}
