-- ============================================
-- Dashboard IT Fondax — Schéma Supabase (Complet & Idempotent)
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================
-- NETTOYAGE PRÉALABLE (CASCADE)
-- ============================
DROP TABLE IF EXISTS vendor_issues CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS network_connections CASCADE;
DROP TABLE IF EXISTS lan_devices CASCADE;
DROP TABLE IF EXISTS network_equipment CASCADE;
DROP TABLE IF EXISTS networks CASCADE;
DROP TABLE IF EXISTS computers CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- ============================
-- TABLES
-- ============================

-- Organigramme
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  department VARCHAR(255),
  has_pc BOOLEAN DEFAULT false,
  has_m365 BOOLEAN DEFAULT false,
  category TEXT NOT NULL DEFAULT 'encadrant',
  manager_id UUID REFERENCES people(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tâches
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Autre',
  status TEXT NOT NULL DEFAULT 'à faire',
  priority TEXT NOT NULL DEFAULT 'moyenne',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Réseaux
CREATE TABLE networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ssid VARCHAR(255),
  ip_range VARCHAR(50),
  gateway VARCHAR(50),
  manager VARCHAR(255),
  role_status TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Équipements réseau
CREATE TABLE network_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  location VARCHAR(255),
  ip VARCHAR(50),
  role VARCHAR(255),
  notes TEXT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connexions réseau
CREATE TABLE network_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES network_equipment(id) ON DELETE CASCADE,
  target_id UUID REFERENCES network_equipment(id) ON DELETE CASCADE,
  label VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Appareils LAN
CREATE TABLE lan_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip VARCHAR(50) NOT NULL,
  hostname VARCHAR(255),
  role VARCHAR(255),
  network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prestataires
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  scope TEXT,
  known_access TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Points ouverts prestataires
CREATE TABLE vendor_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'en attente',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Événements / Calendrier
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type TEXT NOT NULL DEFAULT 'rdv',
  status TEXT NOT NULL DEFAULT 'à venir',
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Postes informatiques
CREATE TABLE computers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  os VARCHAR(100),
  antivirus_status VARCHAR(255),
  warranty_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Équipements infrastructure (non-PC)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  model VARCHAR(255),
  location VARCHAR(255),
  characteristics TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chantiers (Cahier des charges)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'À FAIRE',
  notes_blockers TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notes personnelles
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- ROW LEVEL SECURITY
-- ============================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lan_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Politiques pour utilisateurs authentifiés
DROP POLICY IF EXISTS "auth_all" ON people;
CREATE POLICY "auth_all" ON people FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON tasks;
CREATE POLICY "auth_all" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON networks;
CREATE POLICY "auth_all" ON networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON network_equipment;
CREATE POLICY "auth_all" ON network_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON network_connections;
CREATE POLICY "auth_all" ON network_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON lan_devices;
CREATE POLICY "auth_all" ON lan_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON vendors;
CREATE POLICY "auth_all" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON vendor_issues;
CREATE POLICY "auth_all" ON vendor_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON events;
CREATE POLICY "auth_all" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON computers;
CREATE POLICY "auth_all" ON computers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON equipment;
CREATE POLICY "auth_all" ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON projects;
CREATE POLICY "auth_all" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON notes;
CREATE POLICY "auth_all" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================
-- TRIGGER updated_at
-- ============================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
