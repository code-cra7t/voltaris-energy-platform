CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sites_name_unique_idx ON sites(name);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id),
  asset_code text NOT NULL UNIQUE,
  manufacturer text NOT NULL,
  model text NOT NULL,
  asset_type text NOT NULL DEFAULT 'ev_charger',
  status text NOT NULL CHECK (status IN ('operational', 'degraded', 'offline')),
  installed_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id),
  name text NOT NULL,
  service_level text NOT NULL,
  response_hours integer NOT NULL CHECK (response_hours > 0),
  monthly_fee_cents bigint NOT NULL DEFAULT 0,
  starts_on date NOT NULL,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  summary text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'analyzed', 'proposed', 'scheduled', 'resolved')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reported_by text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  finding jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  occurred_at timestamptz NOT NULL,
  summary text NOT NULL,
  cost_cents bigint NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  source_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_logs_source_idx ON maintenance_logs(source_reference);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_type text NOT NULL DEFAULT 'runbook',
  source_reference text NOT NULL UNIQUE,
  manufacturer text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  search_document tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_search_idx ON knowledge_chunks USING gin(search_document);

CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_city text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS technicians_name_unique_idx ON technicians(name);

CREATE TABLE IF NOT EXISTS technician_skills (
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  skill text NOT NULL,
  PRIMARY KEY (technician_id, skill)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'unavailable')),
  CHECK (ends_at > starts_at),
  UNIQUE (technician_id, starts_at)
);

CREATE INDEX IF NOT EXISTS availability_slots_lookup_idx ON availability_slots(status, starts_at);

CREATE TABLE IF NOT EXISTS dispatch_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  technician_id uuid NOT NULL REFERENCES technicians(id),
  slot_id uuid NOT NULL REFERENCES availability_slots(id),
  rationale text NOT NULL,
  work_summary text NOT NULL,
  forecast_cost_cents bigint NOT NULL CHECK (forecast_cost_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatch_proposals_incident_idx ON dispatch_proposals(incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL UNIQUE REFERENCES incidents(id),
  proposal_id uuid NOT NULL UNIQUE REFERENCES dispatch_proposals(id),
  technician_id uuid NOT NULL REFERENCES technicians(id),
  slot_id uuid NOT NULL UNIQUE REFERENCES availability_slots(id),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('proposed', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  forecast_cost_cents bigint NOT NULL CHECK (forecast_cost_cents >= 0),
  actual_cost_cents bigint CHECK (actual_cost_cents >= 0),
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  proposal_id uuid NOT NULL REFERENCES dispatch_proposals(id),
  actor text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  action text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'rejected', 'error')),
  detail text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_actions_incident_idx ON agent_actions(incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_on date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('recognized_revenue', 'actual_cost', 'forecast_revenue', 'forecast_cost')),
  category text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  description text NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id),
  work_order_id uuid REFERENCES work_orders(id),
  source_reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_events_period_idx ON financial_events(occurred_on, kind, site_id);

CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'dispatcher', 'manager')),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
