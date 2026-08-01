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
  ip_address  TEXT,
  deleted_at  TIMESTAMPTZ
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

-- 3. RLS policies for thoughts (SELECT + INSERT for everyone, UPDATE/DELETE for admin operations)
DROP POLICY IF EXISTS "thoughts_select_all" ON public.thoughts;
CREATE POLICY "thoughts_select_all"
  ON public.thoughts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "thoughts_insert_all" ON public.thoughts;
CREATE POLICY "thoughts_insert_all"
  ON public.thoughts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "thoughts_update_all" ON public.thoughts;
CREATE POLICY "thoughts_update_all"
  ON public.thoughts FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "thoughts_delete_all" ON public.thoughts;
CREATE POLICY "thoughts_delete_all"
  ON public.thoughts FOR DELETE
  USING (true);

-- 4. RLS policies for users (SELECT + INSERT for everyone, UPDATE/DELETE for admin operations)
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users_insert_all" ON public.users;
CREATE POLICY "users_insert_all"
  ON public.users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_all" ON public.users;
CREATE POLICY "users_update_all"
  ON public.users FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete_all" ON public.users;
CREATE POLICY "users_delete_all"
  ON public.users FOR DELETE
  USING (true);

-- 5. RLS policies for contact messages (SELECT + INSERT for everyone, UPDATE/DELETE for admin operations)
DROP POLICY IF EXISTS "contact_messages_select_all" ON public.contact_messages;
CREATE POLICY "contact_messages_select_all"
  ON public.contact_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "contact_messages_insert_all" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_all"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_update_all" ON public.contact_messages;
CREATE POLICY "contact_messages_update_all"
  ON public.contact_messages FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_delete_all" ON public.contact_messages;
CREATE POLICY "contact_messages_delete_all"
  ON public.contact_messages FOR DELETE
  USING (true);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at        ON public.thoughts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_username          ON public.thoughts (username);
CREATE INDEX IF NOT EXISTS idx_users_username             ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at           ON public.users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages (created_at DESC);

-- 7. Backfill existing users (deleted_at defaults to NULL)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 8. Migrate older contact_messages tables that used a different message column name.
--    Older deployments may store the message in `content`, `text`, or `body`.
--    This block renames the first one found to `message`, or adds `message`
--    when none of the alternatives exist.
DO $$
DECLARE
  msg_col TEXT;
BEGIN
  SELECT column_name INTO msg_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contact_messages'
    AND column_name IN ('content', 'text', 'body')
  ORDER BY CASE column_name
    WHEN 'content' THEN 1
    WHEN 'text' THEN 2
    WHEN 'body' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF msg_col IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.contact_messages RENAME COLUMN %I TO message', msg_col);
  ELSE
    ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
