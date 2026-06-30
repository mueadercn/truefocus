-- ========================================
-- ANNUAL GOALS TABLE MIGRATION
-- ========================================
-- Execute this SQL in Supabase Dashboard → SQL Editor

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) >= 10 AND char_length(text) <= 100),
  "order" INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'partial', 'not_completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, year, text)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_user_year ON goals(user_id, year);
CREATE INDEX IF NOT EXISTS idx_goals_user_year_status ON goals(user_id, year, status);
CREATE INDEX IF NOT EXISTS idx_goals_order ON goals(user_id, year, "order");

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;

-- Success message
SELECT 'Goals table created successfully!' AS message;
