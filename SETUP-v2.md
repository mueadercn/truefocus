# TrueFocus v2 — Passos de configuração (deploy das novas features)

As novas funcionalidades precisam de 3 ajustes no Supabase. O frontend (Netlify)
publica sozinho a cada push; estes passos são feitos **uma vez** no painel do Supabase.

## 1. Anotações (item 4) — criar a tabela `notes`

No **Supabase → SQL Editor**, rode o conteúdo de:

```
supabase/migrations/create_notes_table.sql
```

Isso cria a tabela `notes` com RLS (cada usuário só vê as próprias anotações).
Enquanto a tabela não existir, o app funciona normalmente (só não salva anotações).

## 2. Agendamento por voz com IA (item 9) — chave da OpenAI + redeploy da função

O endpoint novo `POST /make-server-41f917a5/ai/parse-voice-task` usa o GPT-4o-mini.

1. No **Supabase → Edge Functions → (sua função) → Secrets**, adicione:
   ```
   OPENAI_API_KEY = sk-...  (a mesma chave usada no Serviço Seguro serve)
   ```
2. **Faça o redeploy da Edge Function** — o arquivo `supabase/functions/server/index.tsx`
   foi alterado (endpoint novo). Sem o redeploy, o agendamento por voz retorna erro.

## 3. Offline + Biometria (itens 7 e 8) — funcionam automaticamente

- Assim que o frontend estiver no Netlify (HTTPS), o app já é **instalável** (PWA) e
  abre offline.
- A **biometria** (Touch ID / Face ID / digital) aparece na tela de login após o
  primeiro acesso com senha, quando o aparelho suportar.
- **(Opcional)** Para o usuário ficar logado offline por mais tempo:
  **Supabase → Authentication → Settings → JWT expiry** — aumentar de 1h (3600s) para,
  por exemplo, 7 dias. Assim a sessão sobrevive a longos períodos sem internet.

---

## Como testar cada item depois do deploy

| Item | Como testar |
|---|---|
| 1/2 (tarefas menores) | Home com várias tarefas — cabem mais na tela |
| 3 (histórico calendário) | Calendário → clicar em dia passado → ver tarefas |
| 4 (anotações) | Botão "Anotações do dia" na Home → gravar/escrever → menu Anotações |
| 5 (métricas) | Menu Metrics → barras por dia + horas por categoria |
| 6 (annual report) | Menu não tem mais "Annual Report" |
| 7 (offline) | Modo avião → criar tarefa → voltar online → sincroniza; menu mostra última sync |
| 8 (biometria) | Login com senha → "Enable" → sair → "Sign in with biometrics" |
| 9 (voz + IA) | Botão microfone → "Agendar" → falar data/compromisso → confirmar |
