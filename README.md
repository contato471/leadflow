# LeadFlow — Prime Empreendimentos

Sistema de distribuição de leads para o setor comercial.

## Setup rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Abra o arquivo `.env.local` e preencha:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase > Settings > API Keys > Publishable key
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase > Settings > API Keys > Secret key

As outras variáveis (Google Sheets, Trello) podem ser configuradas depois.

### 3. Criar usuário ADM no Supabase
1. Acesse https://supabase.com/dashboard/project/wsbafqnjjyjkzdagwddc/auth/users
2. Clique em "Add user" → preencha e-mail e senha
3. Copie o UUID do usuário criado
4. Abra o SQL Editor e rode:
```sql
insert into public.users (id, email, name, role, phone)
values ('<UUID>', 'seu@email.com', 'Seu Nome', 'adm', '(71) 99999-0000');
```

### 4. Rodar em desenvolvimento
```bash
npm run dev
# Acesse http://localhost:3000
```

### 5. Deploy na Vercel
```bash
npm i -g vercel
vercel
# Adicione as variáveis de ambiente no painel da Vercel
```

## Estrutura
```
src/
├── app/
│   ├── login/          # Tela de login
│   ├── adm/            # Painel ADM
│   │   ├── page.tsx         # Dashboard
│   │   ├── corretores/      # Gestão de corretores + rodízio
│   │   ├── empreendimentos/ # Gestão de empreendimentos
│   │   └── relatorios/      # Relatórios de performance
│   ├── corretor/       # Portal do corretor
│   └── api/            # Rotas da API
├── lib/
│   ├── supabase.ts     # Clientes Supabase
│   └── sync.ts         # Sync Google Sheets + Trello
├── types/              # Tipos TypeScript
└── middleware.ts       # Auth + proteção de rotas
```

## Fluxo principal
1. ADM importa leads (manual ou via sync automático a cada 5min)
2. Sistema distribui no rodízio automático por empreendimento
3. Corretor faz login, vê sua fila, clica "Iniciar + WhatsApp"
4. Link `wa.me/55...` abre conversa com mensagem personalizada
5. Corretor marca como Convertido ou Perdido
6. ADM acompanha tudo em tempo real no dashboard
