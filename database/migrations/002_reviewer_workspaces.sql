ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS workspace_schema text NOT NULL DEFAULT 'public';

CREATE TABLE IF NOT EXISTS public.reviewer_workspaces (
  schema_name text PRIMARY KEY CHECK (schema_name ~ '^sandbox_[a-z0-9_]{8,48}$'),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.staff_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reset_at timestamptz,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.sandbox_ai_usage (
  owner_id uuid NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  calls integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (owner_id, usage_date)
);
