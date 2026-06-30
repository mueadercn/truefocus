# 🎯 TrueFocus Landing Page

## 📁 Estrutura

Esta pasta contém **toda a Landing Page e sistema Admin**, completamente separado do sistema principal do app.

```
/src/landing-page/
├── LandingPage.tsx      # Landing page principal
├── AdminDashboard.tsx   # Dashboard administrativo
└── README.md            # Este arquivo
```

---

## 🌐 Landing Page (`/`)

### Rota
- **URL:** `/`
- **Componente:** `LandingPage.tsx`

### Funcionalidades
- ✅ **Header fixo** com navegação suave
- ✅ **Seções:**
  - Hero com CTA principal
  - Features (3 recursos principais)
  - Pricing (3 planos: Monthly, Annual, Lifetime)
  - Testimonials (6 depoimentos reais)
  - Download App (Google Play + iOS coming soon)
  - Footer com link escondido para Admin

### Botões no Header
1. **Login Web** → `/auth` (sistema web)
2. **Download App** → Scroll suave para seção #download
3. **Start Free** → `/auth` (cadastro gratuito)

### Links Importantes
- Todos os CTAs principais apontam para `/auth` (página de login/cadastro do sistema web)
- **Botões de Pricing** → `/home/licenca?plan={monthly|annual|lifetime}` (abre Stripe checkout diretamente)
- Link "Admin" escondido no footer → `/landing-admin`

---

## 🔐 Admin Dashboard (`/landing-admin`)

### Rota
- **URL:** `/landing-admin`
- **Componente:** `AdminDashboard.tsx`

### Autenticação
- **Senha:** `Truefocus2026`
- **Método:** Armazenamento em `sessionStorage`
- **Logout:** Remove autenticação e volta para tela de login

### Funcionalidades
- ✅ **Tela de login** com validação de senha
- ✅ **Dashboard com métricas:**
  - Total Users
  - Active Users (últimos 30 dias)
  - Monthly Revenue
  - New Conversions (esta semana)
- ✅ **Recent Activity** - últimas ações dos usuários
- ✅ **Quick Actions** - botões para ações rápidas
- ✅ **Botão "View Site"** → volta para `/`
- ✅ **Botão "Logout"** → faz logout do admin

### Status Atual
⚠️ **Usando dados MOCK** - conectar ao backend Supabase para dados reais.

---

## 🎨 Design System

### Cores (Light Mode Only)
- **Primary/Accent:** `#8B7355` → `#A89580` (Bronze gradient)
- **Background:** `#FAFAF8`, `#FFFFFF`, `#F5F5F5`
- **Borders:** `#E8E8E8`
- **Text:** `#1A1A1A` (títulos), `#6B6B6B` (corpo), `#9E9E9E` (secundário)
- **Gold Badge:** `#D4AF37` → `#F4E5A1` (para Lifetime)

### Tipografia
- **Font Family:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'`
- **Headings:** Font Serif (para títulos)
- **Body:** Sans-serif padrão do sistema

---

## 🔗 Integração com Sistema Web

A landing page está **completamente separada** do sistema principal:

- **Landing Page:** `/` (marketing/apresentação)
- **Sistema Web:** `/auth` e `/home/*` (aplicação funcional)
- **Admin Dashboard:** `/landing-admin` (gestão)

### Fluxo do Usuário
1. Usuário acessa `/` (Landing Page)
2. Clica em "Start Free" ou "Login Web"
3. É redirecionado para `/auth` (sistema web)
4. Após login, acessa `/home` (dashboard do app)

---

## 🚀 Próximos Passos

### Para Produção
1. ✅ **Adicionar screenshots reais** nas seções de features
2. ✅ **Conectar Admin ao Supabase** para métricas reais
3. ✅ **Adicionar link da Google Play Store** quando disponível
4. ✅ **Criar páginas Privacy Policy e Terms of Service**
5. ✅ **Adicionar Google Analytics / Tracking**
6. ✅ **SEO optimization** (meta tags, Open Graph, etc.)

### Melhorias Futuras
- [ ] Animações ao scroll (AOS, Framer Motion)
- [ ] Vídeo demo na hero section
- [ ] Mais testimonials dinâmicos
- [ ] FAQ section
- [ ] Blog/Resources section
- [ ] Integração com email marketing (MailChimp, ConvertKit)

---

## 💡 Observações Importantes

1. **Separação total:** Todo código da landing page está nesta pasta, não interfere com `/src/app/`
2. **Light mode apenas:** Sistema usa cores bronze/branco do app, sem dark mode
3. **Admin protegido:** Senha hardcoded - **mudar em produção** para sistema mais seguro
4. **Mock data:** Dashboard admin usa dados de exemplo - conectar API real
5. **Integração Stripe:** Botões de pricing redirecionam para `/home/licenca?plan=X` com checkout Stripe configurado

---

**Desenvolvido para TrueFocus** 🎯