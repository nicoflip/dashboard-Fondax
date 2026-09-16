-- ==========================================================
-- Migration : Table dédiée pour les « Retours attendus »
-- Exécuter dans l'éditeur SQL de Supabase si vous souhaitez la table native
-- ==========================================================

CREATE TABLE IF NOT EXISTS waiting_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  waiting_on VARCHAR(255) NOT NULL,
  target_type VARCHAR(100) DEFAULT 'Prestataire',
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'en attente',
  follow_up_date DATE,
  follow_up_count INTEGER DEFAULT 0,
  since_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waiting_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON waiting_returns;
CREATE POLICY "auth_all" ON waiting_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all" ON waiting_returns;
CREATE POLICY "anon_all" ON waiting_returns FOR ALL TO anon USING (true) WITH CHECK (true);
