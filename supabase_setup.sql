-- =============================================================================
-- i think — Supabase Migration Script
-- Run this ENTIRE script in your Supabase project SQL Editor:
-- https://app.supabase.com → your project → SQL Editor → New query
-- =============================================================================

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS public.users (
  id          TEXT        PRIMARY KEY,
  username    TEXT        UNIQUE NOT NULL,
  word1       TEXT        NOT NULL,
  word2       TEXT        NOT NULL,
  is_admin    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT
);

CREATE TABLE IF NOT EXISTS public.thoughts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  username    TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT,
  username              TEXT        NOT NULL,
  message               TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending_retry',
  delivered_to_telegram INTEGER     NOT NULL DEFAULT 0,
  user_agent            TEXT,
  ip_address            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for thoughts (SELECT + INSERT for everyone)
DROP POLICY IF EXISTS "thoughts_select_all" ON public.thoughts;
CREATE POLICY "thoughts_select_all"
  ON public.thoughts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "thoughts_insert_all" ON public.thoughts;
CREATE POLICY "thoughts_insert_all"
  ON public.thoughts FOR INSERT
  WITH CHECK (true);

-- 4. RLS policies for users (SELECT + INSERT for everyone)
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users_insert_all" ON public.users;
CREATE POLICY "users_insert_all"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- 5. RLS policies for contact messages
DROP POLICY IF EXISTS "contact_messages_select_all" ON public.contact_messages;
CREATE POLICY "contact_messages_select_all"
  ON public.contact_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "contact_messages_insert_all" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_all"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON public.thoughts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_username   ON public.thoughts (username);
CREATE INDEX IF NOT EXISTS idx_users_username      ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages (created_at DESC);
