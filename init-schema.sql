-- Rehab Tracker Database Schema (Self-hosted PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('athlete', 'coach')) NOT NULL DEFAULT 'athlete',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT CHECK (session_type IN ('rehab', 'gym')) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date DESC);

-- Exercises (predefined + custom)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  is_rehab BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category, is_rehab);

-- Session Sets
CREATE TABLE IF NOT EXISTS session_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INT NOT NULL,
  reps INT,
  weight_kg NUMERIC(5,2),
  duration_seconds INT,
  pain_level INT CHECK (pain_level BETWEEN 0 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id);

-- AI Coaching Logs
CREATE TABLE IF NOT EXISTS coaching_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recommendation TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_logs_athlete ON coaching_logs(athlete_id, created_at DESC);

-- Seed data: Rehab exercises (no user reference for predefined exercises)
INSERT INTO exercises (name, category, is_rehab, created_by) VALUES
  ('Wall Sit', 'knee_rehab', TRUE, NULL),
  ('Reverse Step-Up', 'knee_rehab', TRUE, NULL),
  ('ATG Split Squat', 'knee_rehab', TRUE, NULL),
  ('Calf Raise', 'knee_rehab', TRUE, NULL),
  ('Tibialis Raise', 'knee_rehab', TRUE, NULL),
  ('Pogo Hop', 'knee_rehab', TRUE, NULL),
  ('Skipping', 'knee_rehab', TRUE, NULL),
  ('Knee Extension', 'knee_rehab', TRUE, NULL),
  ('Hamstring Curl', 'knee_rehab', TRUE, NULL),
  ('Single Leg Deadlift', 'knee_rehab', TRUE, NULL),
  ('Box Step Down', 'knee_rehab', TRUE, NULL),
  ('Leg Press', 'gym', FALSE, NULL),
  ('Squat', 'gym', FALSE, NULL),
  ('Deadlift', 'gym', FALSE, NULL),
  ('Bench Press', 'gym', FALSE, NULL)
ON CONFLICT DO NOTHING;

-- Create demo user (password: Demo2026!)
-- Password hash generated with bcrypt rounds=10
INSERT INTO users (email, password_hash, display_name, role) VALUES
  ('demo@rehab.local', '$2b$10$kQxZX4PqJ8n5mNPxP.OP6OMsZxD0qvWFf5VpYc9KzPzJ.xR5A8u/i', 'Demo User', 'athlete')
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
