-- Stora Database Schema
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT CHECK (category IN ('Trabalho', 'Exercício', 'Estudo', 'Pensamento Crítico')),
  duration_min INTEGER,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('livre', 'tempo')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- 2. Tabela de Resgates
CREATE TABLE IF NOT EXISTS rescues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  phase1_source TEXT NOT NULL,
  phase2_activity TEXT NOT NULL,
  phase3_activity TEXT NOT NULL,
  phase4_activity TEXT NOT NULL,
  phase5_target TEXT NOT NULL,
  phase5_category TEXT,
  phase5_duration_min INTEGER,
  reflection_cause TEXT,
  reflection_adjust TEXT,
  reflection_nugget TEXT,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_rescues_date ON rescues(date DESC);
CREATE INDEX IF NOT EXISTS idx_rescues_completed_date ON rescues(completed_date);
CREATE INDEX IF NOT EXISTS idx_rescues_user_id ON rescues(user_id);

-- 3. Tabela de Configurações (um registro por usuário)
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications BOOLEAN DEFAULT TRUE,
  sound BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescues ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para rescues
CREATE POLICY "Users can view their own rescues" ON rescues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rescues" ON rescues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rescues" ON rescues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rescues" ON rescues
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para settings
CREATE POLICY "Users can view their own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Tabela de Deadlines (Datas-Limite)
CREATE TABLE IF NOT EXISTS deadlines_41f917a5 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT CHECK (char_length(notes) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notification_sent_30days BOOLEAN DEFAULT FALSE,
  notification_sent_15days BOOLEAN DEFAULT FALSE,
  notification_sent_7days BOOLEAN DEFAULT FALSE,
  notification_sent_3days BOOLEAN DEFAULT FALSE,
  notification_sent_1day BOOLEAN DEFAULT FALSE
);

-- Índices para deadlines
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON deadlines_41f917a5(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines_41f917a5(deadline_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines_41f917a5(status);

-- RLS para deadlines
ALTER TABLE deadlines_41f917a5 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deadlines" ON deadlines_41f917a5
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deadlines" ON deadlines_41f917a5
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deadlines" ON deadlines_41f917a5
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deadlines" ON deadlines_41f917a5
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em deadlines
CREATE OR REPLACE FUNCTION update_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deadlines_updated_at ON deadlines_41f917a5;

CREATE TRIGGER update_deadlines_updated_at 
  BEFORE UPDATE ON deadlines_41f917a5
  FOR EACH ROW 
  EXECUTE FUNCTION update_deadlines_updated_at();