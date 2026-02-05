#!/bin/bash

SUPABASE_URL="https://dzapjthijbykwtdrlbzq.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6YXBqdGhpamJ5a3d0ZHJsYnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4MTUxNSwiZXhwIjoyMDg1ODU3NTE1fQ.8Va66LgL8CzzFUyV6NY2IfewBMkSdv6c47mYfHKmMgo"

# Deploy schema via Supabase database URL (requires psql or pg_isready)
echo "🚀 Deploying schema to Supabase..."

# Extract connection details from project URL
PROJECT_REF="dzapjthijbykwtdrlbzq"
DB_URL="postgresql://postgres.${PROJECT_REF}:@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📦 Schema deployment via direct SQL execution..."
echo "Note: This requires database connection string with password."
echo "Deploying tables one by one via REST API..."

# Create profiles table
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name TEXT NOT NULL, role TEXT CHECK (role IN ('athlete', 'coach')) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"}' 2>&1

echo "✅ Schema deployment attempted. Verifying..."
