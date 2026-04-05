-- Authoritative schema for the PDP backend.
-- `initDb()` loads this file directly to initialize and validate the current database.

CREATE TABLE IF NOT EXISTS resources (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  group_id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  chef integer,
  override_capacity boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS cities (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  mult_eau numeric NOT NULL DEFAULT 1,
  mult_nrt numeric NOT NULL DEFAULT 1,
  mult_med numeric NOT NULL DEFAULT 1,
  mult_mat numeric NOT NULL DEFAULT 1,
  current_lune integer NOT NULL DEFAULT 1,
  constructions jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS city_resources (
  city_id integer REFERENCES cities(id) ON DELETE CASCADE,
  resource_id integer REFERENCES resources(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (city_id, resource_id)
);

CREATE TABLE IF NOT EXISTS persos (
  id integer PRIMARY KEY,
  nom text NOT NULL,
  present boolean NOT NULL DEFAULT true,
  pvmax numeric NOT NULL DEFAULT 0,
  pv numeric NOT NULL DEFAULT 0,
  poidsmax numeric NOT NULL DEFAULT 20,
  capEau numeric NOT NULL,
  capNrt numeric NOT NULL,
  capMed numeric NOT NULL,
  capMat numeric NOT NULL,
  capart numeric NOT NULL DEFAULT 0,
  cmd numeric NOT NULL DEFAULT 0,
  combat numeric NOT NULL DEFAULT 0,
  group_id integer,
  esclave boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS perso_resources (
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  resource_id integer REFERENCES resources(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (perso_id, resource_id)
);

CREATE TABLE IF NOT EXISTS armes (
  id integer PRIMARY KEY,
  name text NOT NULL,
  att numeric NOT NULL DEFAULT 1,
  degats numeric NOT NULL DEFAULT 0,
  fiabilite numeric NOT NULL DEFAULT 100,
  pv numeric NOT NULL DEFAULT 0,
  pvm numeric NOT NULL DEFAULT 0,
  poids numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS perso_armes (
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  arme_id integer REFERENCES armes(id) ON DELETE CASCADE,
  equipee boolean NOT NULL DEFAULT false,
  PRIMARY KEY (perso_id, arme_id)
);

CREATE TABLE IF NOT EXISTS outils (
  id integer PRIMARY KEY,
  name text NOT NULL,
  specialite text NOT NULL DEFAULT 'eau',
  bonus numeric NOT NULL DEFAULT 1,
  pv numeric NOT NULL DEFAULT 0,
  pvmax numeric NOT NULL DEFAULT 0,
  poids numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS perso_outils (
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  outil_id integer REFERENCES outils(id) ON DELETE CASCADE,
  PRIMARY KEY (perso_id, outil_id)
);

CREATE TABLE IF NOT EXISTS sacs (
  id integer PRIMARY KEY,
  name text NOT NULL,
  pv numeric NOT NULL DEFAULT 0,
  pvmax numeric NOT NULL DEFAULT 0,
  poids numeric NOT NULL DEFAULT 0,
  capacite numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS perso_sacs (
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  sac_id integer REFERENCES sacs(id) ON DELETE CASCADE,
  equipe boolean NOT NULL DEFAULT false,
  PRIMARY KEY (perso_id, sac_id)
);

CREATE TABLE IF NOT EXISTS lunes (
  id bigint PRIMARY KEY,
  meteo numeric NOT NULL DEFAULT 1,
  meteo_eau numeric NOT NULL DEFAULT 1,
  meteo_nrt numeric NOT NULL DEFAULT 1,
  meteo_med numeric NOT NULL DEFAULT 1,
  meteo_mat numeric NOT NULL DEFAULT 1,
  constructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_assignments jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rations (
  lune_id bigint REFERENCES lunes(id) ON DELETE CASCADE,
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  eau boolean NOT NULL,
  nrt boolean NOT NULL,
  med boolean NOT NULL,
  tache text NOT NULL,
  drogue text,
  construction_id text,
  PRIMARY KEY (lune_id, perso_id)
);

CREATE TABLE IF NOT EXISTS overrides (
  lune_id bigint REFERENCES lunes(id) ON DELETE CASCADE,
  perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  PRIMARY KEY (lune_id, perso_id)
);

-- Compatibility migrations for already-initialized databases.
-- `CREATE TABLE IF NOT EXISTS` does not add new columns to existing tables,
-- so recent additions still need explicit idempotent ALTERs here.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS override_capacity boolean;

UPDATE groups
SET override_capacity = COALESCE(override_capacity, false)
WHERE override_capacity IS NULL;

ALTER TABLE groups
  ALTER COLUMN override_capacity SET DEFAULT false,
  ALTER COLUMN override_capacity SET NOT NULL;

ALTER TABLE persos
  ADD COLUMN IF NOT EXISTS esclave boolean;

UPDATE persos
SET esclave = COALESCE(esclave, false)
WHERE esclave IS NULL;

ALTER TABLE persos
  ALTER COLUMN esclave SET DEFAULT false,
  ALTER COLUMN esclave SET NOT NULL;

ALTER TABLE lunes
  ADD COLUMN IF NOT EXISTS tool_assignments jsonb;

UPDATE lunes
SET tool_assignments = COALESCE(tool_assignments, '{}'::jsonb)
WHERE tool_assignments IS NULL;

ALTER TABLE lunes
  ALTER COLUMN tool_assignments SET DEFAULT '{}'::jsonb,
  ALTER COLUMN tool_assignments SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'persos_pvmax_check'
      AND conrelid = 'persos'::regclass
  ) THEN
    ALTER TABLE persos
      ADD CONSTRAINT persos_pvmax_check CHECK (pvmax >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'persos_pv_check'
      AND conrelid = 'persos'::regclass
  ) THEN
    ALTER TABLE persos
      ADD CONSTRAINT persos_pv_check CHECK (pv >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'persos_poidsmax_check'
      AND conrelid = 'persos'::regclass
  ) THEN
    ALTER TABLE persos
      ADD CONSTRAINT persos_poidsmax_check CHECK (poidsmax >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'persos_group_id_id_key'
      AND conrelid = 'persos'::regclass
  ) THEN
    ALTER TABLE persos
      ADD CONSTRAINT persos_group_id_id_key UNIQUE (group_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'armes_quantity_check'
      AND conrelid = 'armes'::regclass
  ) THEN
    ALTER TABLE armes
      ADD CONSTRAINT armes_quantity_check CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'outils_quantity_check'
      AND conrelid = 'outils'::regclass
  ) THEN
    ALTER TABLE outils
      ADD CONSTRAINT outils_quantity_check CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sacs_quantity_check'
      AND conrelid = 'sacs'::regclass
  ) THEN
    ALTER TABLE sacs
      ADD CONSTRAINT sacs_quantity_check CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'persos_group_id_fkey'
      AND conrelid = 'persos'::regclass
  ) THEN
    ALTER TABLE persos
      ADD CONSTRAINT persos_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(group_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'groups_group_id_chef_fkey'
      AND conrelid = 'groups'::regclass
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_group_id_chef_fkey
      FOREIGN KEY (group_id, chef) REFERENCES persos(group_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS perso_une_arme_equipee_idx
  ON perso_armes (perso_id) WHERE equipee = true;

CREATE UNIQUE INDEX IF NOT EXISTS perso_un_sac_equipe_idx
  ON perso_sacs (perso_id) WHERE equipe = true;
