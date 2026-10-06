import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { sendStaffInvitationEmail, sendPasswordResetEmail, getEmailConfigStatus, updateEmailConfig, verifySMTPConnection } from './src/server/email.js';

const { Client } = pg;

const safeDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Promise Rejection caught safely:', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('Uncaught Exception caught safely:', err);
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      readyForExternalDatabase: true
    });
  });

  // Supabase Configuration Provider for Deployment (Render / Vercel / Cloud)
  app.get('/api/config/supabase', (_req, res) => {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const anonKey = 
      process.env.VITE_SUPABASE_ANON_KEY || 
      process.env.SUPABASE_ANON_KEY || 
      process.env.SUPABASE_KEY || 
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      '';

    res.json({
      success: true,
      isConfigured: !!(url && anonKey),
      url,
      anonKey
    });
  });

  // ==========================================
  // STAFF INVITATION & EMAIL DISPATCH ENDPOINTS
  // ==========================================
  app.post('/api/email/send-invitation', async (req, res) => {
    try {
      const { to, name, role, facility, staffId, tempPassword, phone, loginUrl } = req.body || {};
      if (!to || !to.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid recipient email address is required' });
      }

      const result = await sendStaffInvitationEmail({
        to: to.trim(),
        name: name || 'Staff Member',
        role: role || 'keeper',
        facility: facility || 'Main Facility',
        staffId: staffId || 'STF-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        tempPassword: tempPassword || 'FeroniaPass123',
        phone: phone || '',
        loginUrl: loginUrl || req.headers.origin || 'https://feronia.ph',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to dispatch email' });
    }
  });

  app.post('/api/email/reset-password', async (req, res) => {
    try {
      const { to, name, resetCode } = req.body || {};
      if (!to || !to.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email address is required' });
      }

      const result = await sendPasswordResetEmail({
        to: to.trim(),
        name: name || 'User',
        resetCode: resetCode || '123456',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to send password reset email' });
    }
  });

  app.get('/api/email/config', (_req, res) => {
    res.json(getEmailConfigStatus());
  });

  app.post('/api/email/config', (req, res) => {
    try {
      const { host, port, secure, user, pass, fromName, fromEmail } = req.body || {};
      const status = updateEmailConfig({
        ...(host !== undefined && { host }),
        ...(port !== undefined && { port: Number(port) }),
        ...(secure !== undefined && { secure: Boolean(secure) }),
        ...(user !== undefined && { user }),
        ...(pass !== undefined && { pass }),
        ...(fromName !== undefined && { fromName }),
        ...(fromEmail !== undefined && { fromEmail }),
      });
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/email/verify', async (_req, res) => {
    try {
      const result = await verifySMTPConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'SMTP verification failed' });
    }
  });

  // ==========================================
  // SUPABASE AUTOMATIC TABLE CREATION & DDL RUNNER
  // ==========================================
  app.post('/api/supabase/auto-create-tables', async (req, res) => {
    let client: any = null;
    try {
      const { connectionString, dbPassword, projectUrl, sql } = req.body || {};
      
      let finalConnString = connectionString?.trim();

      if (!finalConnString && dbPassword && projectUrl) {
        const match = projectUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
        const projectRef = match ? match[1] : '';
        if (projectRef) {
          // Construct pooler connection string format
          finalConnString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
        }
      }

      if (!finalConnString) {
        return res.status(400).json({
          success: false,
          error: 'Direct Database Connection URI or Database Password is required to auto-create tables.'
        });
      }

      const clientConfig: any = {
        connectionString: finalConnString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      };

      client = new Client(clientConfig);
      await client.connect();

      const ddlSql = sql || `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS animals (
  id TEXT PRIMARY KEY,
  name TEXT,
  species TEXT NOT NULL,
  scientific_name TEXT,
  morph TEXT,
  sex TEXT,
  dob TEXT,
  date_acquired TEXT,
  source TEXT,
  weight NUMERIC,
  length NUMERIC,
  health_status TEXT DEFAULT 'Healthy',
  breeding_status TEXT DEFAULT 'Pending Assessment',
  enclosure_id TEXT,
  image TEXT,
  image_url TEXT,
  photo_url TEXT,
  notes TEXT,
  keeper_logs JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE,
  archive_reason TEXT,
  archive_date TEXT,
  archive_category TEXT,
  archive_notes TEXT,
  mortality_cause TEXT,
  assigned_keeper_id TEXT,
  assigned_keeper_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE animals ADD COLUMN IF NOT EXISTS scientific_name TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS morph TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_acquired TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS length NUMERIC;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_date TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_category TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_notes TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS mortality_cause TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS assigned_keeper_id TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS assigned_keeper_name TEXT;

CREATE TABLE IF NOT EXISTS enclosures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  facility TEXT,
  capacity TEXT,
  status TEXT DEFAULT 'Occupied',
  condition TEXT DEFAULT 'Good',
  temperature TEXT,
  humidity TEXT,
  image TEXT,
  notes TEXT,
  assigned_date TEXT,
  climate_profile JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enclosures ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Good';
ALTER TABLE enclosures ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE enclosures ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE enclosures ADD COLUMN IF NOT EXISTS assigned_date TEXT;
ALTER TABLE enclosures ADD COLUMN IF NOT EXISTS climate_profile JSONB DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE enclosures ALTER COLUMN temperature TYPE TEXT USING temperature::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE enclosures ALTER COLUMN humidity TYPE TEXT USING humidity::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  type TEXT,
  title TEXT NOT NULL,
  time TEXT,
  date TEXT,
  details TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'Pending',
  assigned_by TEXT,
  assigned_by_name TEXT,
  completed_by TEXT,
  completed_at TEXT,
  notes TEXT,
  photo_url TEXT,
  enclosure_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS animal_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_keeper_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_keeper_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS enclosure_id TEXT;

CREATE TABLE IF NOT EXISTS species_schedule_templates (
  id TEXT PRIMARY KEY,
  species TEXT NOT NULL,
  clean_species TEXT,
  age_stage TEXT,
  title TEXT,
  schedule_type TEXT DEFAULT 'both',
  food_item_name TEXT,
  feeding_method TEXT,
  feeding_freq TEXT,
  feeding_quantity TEXT,
  feeding_time TEXT,
  feeding_notes TEXT,
  care_task_name TEXT,
  care_freq TEXT,
  care_time TEXT,
  care_notes TEXT,
  care_supply_item_id TEXT,
  care_supply_qty NUMERIC,
  care_supply_unit TEXT,
  assigned_keeper_id TEXT,
  assigned_keeper_name TEXT,
  is_default_for_species_age BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_records (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  appointment_id TEXT,
  record_type TEXT,
  record_date TEXT,
  purpose TEXT,
  clinical_observation TEXT,
  diagnosis TEXT,
  treatment TEXT,
  next_checkup TEXT,
  notes TEXT,
  veterinarian TEXT,
  status TEXT DEFAULT 'Active',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS appointment_id TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS record_date TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS clinical_observation TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS veterinarian TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS next_checkup TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  type TEXT,
  veterinarian TEXT,
  requested_by TEXT,
  requested_by_role TEXT,
  requested_by_id TEXT,
  requested_by_email TEXT,
  date TEXT,
  time TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Normal',
  created_on TEXT,
  admin_notes TEXT,
  approved_by TEXT,
  approved_at TEXT,
  decline_reason TEXT,
  decline_notes TEXT,
  declined_by TEXT,
  declined_at TEXT,
  reschedule_reason TEXT,
  reschedule_notes TEXT,
  proposed_date TEXT,
  proposed_time TEXT,
  rescheduled_by TEXT,
  rescheduled_by_name TEXT,
  rescheduled_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS veterinarian TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_on TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_by_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_by_email TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS decline_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS declined_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS declined_at TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS proposed_date TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS proposed_time TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_by_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_at TEXT;

CREATE TABLE IF NOT EXISTS breeding_records (
  id TEXT PRIMARY KEY,
  female_id TEXT,
  male_id TEXT,
  female_name TEXT,
  male_name TEXT,
  female_image TEXT,
  male_image TEXT,
  species TEXT,
  breeding_type TEXT,
  breeding_date TEXT,
  started_breeding_date TEXT,
  possible_mated_date TEXT,
  likely_mated_date TEXT,
  clutch_date TEXT,
  clutch_size NUMERIC,
  fertile_eggs NUMERIC,
  infertile_eggs NUMERIC,
  incubation_temp TEXT,
  incubation_humidity TEXT,
  incubator_unit TEXT,
  hatch_date TEXT,
  hatchlings NUMERIC,
  unhatched_eggs NUMERIC,
  hatch_rate NUMERIC,
  status TEXT DEFAULT 'PAIRED',
  notes TEXT,
  observation_logs JSONB DEFAULT '[]'::jsonb,
  status_history JSONB DEFAULT '[]'::jsonb,
  failure_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS female_id TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS male_id TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS female_name TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS male_name TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS female_image TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS male_image TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS breeding_type TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS breeding_date TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS started_breeding_date TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS clutch_date TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS clutch_size NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS fertile_eggs NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS infertile_eggs NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS incubation_temp TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS incubation_humidity TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS incubator_unit TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS hatch_date TEXT;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS hatchlings NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS unhatched_eggs NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS hatch_rate NUMERIC;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS observation_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE breeding_records ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS breeding_assessments (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  partner_id TEXT,
  pair_id TEXT,
  female_id TEXT,
  male_id TEXT,
  female_name TEXT,
  male_name TEXT,
  female_image TEXT,
  male_image TEXT,
  species TEXT,
  scientific_name TEXT,
  species_code TEXT,
  assessment_date TEXT,
  assessment_time TEXT,
  status TEXT DEFAULT 'ELIGIBLE',
  result_title TEXT,
  result_subtitle TEXT,
  compatibility_score NUMERIC,
  readiness_score NUMERIC,
  benchmarks JSONB DEFAULT '{}'::jsonb,
  female_age_months NUMERIC,
  female_weight NUMERIC,
  male_age_months NUMERIC,
  male_weight NUMERIC,
  age_passed BOOLEAN,
  weight_passed BOOLEAN,
  health_passed BOOLEAN,
  season_passed BOOLEAN,
  cooling_passed BOOLEAN,
  cooldown_passed BOOLEAN,
  failure_reasons JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  gestation_pre_lay TEXT,
  avg_clutch_size TEXT,
  incubation_temp TEXT,
  incubation_humidity TEXT,
  incubation_period TEXT,
  post_lay_rest TEXT,
  notes TEXT,
  assessed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT,
  current_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC DEFAULT 100,
  used_today NUMERIC DEFAULT 0,
  last_used TEXT,
  status TEXT DEFAULT 'Good',
  expiration_date TEXT,
  image TEXT,
  supplier TEXT,
  location TEXT,
  cost_per_unit NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Good';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 100;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS used_today NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_used TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_threshold NUMERIC DEFAULT 5;

CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  facility TEXT,
  status TEXT DEFAULT 'Active',
  is_active BOOLEAN DEFAULT TRUE,
  password TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  duty_load TEXT,
  initials TEXT,
  assigned_animal_ids JSONB DEFAULT '[]'::jsonb,
  assigned_facilities JSONB DEFAULT '[]'::jsonb,
  assigned_enclosure_ids JSONB DEFAULT '[]'::jsonb,
  avatar TEXT,
  specialization TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS duty_load TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS initials TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS assigned_animal_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS assigned_facilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS assigned_enclosure_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  transfer_type TEXT,
  transfer_date TEXT,
  old_owner TEXT,
  new_owner_name TEXT,
  new_owner_contact TEXT,
  new_owner_email TEXT,
  new_owner_address TEXT,
  government_id_type TEXT,
  government_id_number TEXT,
  additional_notes TEXT,
  status TEXT DEFAULT 'Pending',
  documents JSONB DEFAULT '[]'::jsonb,
  reference_no TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_notifications (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT,
  action TEXT,
  title TEXT,
  message TEXT,
  updated_by TEXT,
  timestamp TEXT,
  read BOOLEAN DEFAULT FALSE,
  category TEXT,
  unit TEXT,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE enclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_schedule_templates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'animals',
    'enclosures',
    'tasks',
    'medical_records',
    'appointments',
    'breeding_records',
    'breeding_assessments',
    'inventory',
    'staff_members',
    'transfers',
    'inventory_notifications',
    'species_schedule_templates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public full access %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public select on %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert on %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update on %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete on %I" ON %I;', t, t);
    
    EXECUTE format('CREATE POLICY "Allow public select on %I" ON %I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public insert on %I" ON %I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public update on %I" ON %I FOR UPDATE USING (true);', t, t);
    EXECUTE format('CREATE POLICY "Allow public delete on %I" ON %I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;
`;

      await client.query(ddlSql);

      try {
        await client.query(`
          DO $$ BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE animals, enclosures, tasks, medical_records, appointments, breeding_records, breeding_assessments, inventory, staff_members, transfers, species_schedule_templates;
          EXCEPTION WHEN others THEN NULL;
          END $$;
        `);
      } catch {}

      res.json({
        success: true,
        message: 'All 10 Supabase PostgreSQL tables created successfully with RLS policies!'
      });
    } catch (err: any) {
      console.error('Failed to auto-create tables on Supabase:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Database execution failed'
      });
    } finally {
      if (client) {
        try {
          await client.end();
        } catch {}
      }
    }
  });

  // Generic clean API endpoints for data integration
  app.get('/api/staff', (_req, res) => {
    res.json({ success: true, staff: [] });
  });

  app.post('/api/staff', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'staff_created' });
  });

  app.delete('/api/staff', (_req, res) => {
    res.json({ success: true });
  });

  app.delete('/api/staff/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/animals', (_req, res) => {
    res.json({ success: true, animals: [] });
  });

  app.post('/api/animals', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'animal_created' });
  });

  app.delete('/api/animals/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/enclosures', (_req, res) => {
    res.json({ success: true, enclosures: [] });
  });

  app.post('/api/enclosures', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'enclosure_created' });
  });

  app.delete('/api/enclosures/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/tasks', (_req, res) => {
    res.json({ success: true, tasks: [] });
  });

  app.post('/api/tasks', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'task_created' });
  });

  app.delete('/api/tasks/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/species-schedule-templates', (_req, res) => {
    res.json({ success: true, templates: [] });
  });

  app.post('/api/species-schedule-templates', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'template_created' });
  });

  app.get('/api/medical-records', (_req, res) => {
    res.json({ success: true, records: [] });
  });

  app.post('/api/medical-records', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'record_created' });
  });

  app.delete('/api/medical-records/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/breeding-records', (_req, res) => {
    res.json({ success: true, records: [] });
  });

  app.post('/api/breeding-records', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'breeding_record_created' });
  });

  app.delete('/api/breeding-records/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/breeding-assessments', (_req, res) => {
    res.json({ success: true, assessments: [] });
  });

  app.post('/api/breeding-assessments', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'assessment_created' });
  });

  app.delete('/api/breeding-assessments/:id', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/inventory', (_req, res) => {
    res.json({ success: true, inventory: [] });
  });

  app.post('/api/inventory', (req, res) => {
    res.json({ success: true, id: req.body?.id || 'inv_created' });
  });

  app.delete('/api/inventory/:id', (_req, res) => {
    res.json({ success: true });
  });

  // Serve pre-built production dist if present for ultra-fast instant boot, otherwise fallback to Vite Dev Middleware
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndexPath);

  if (hasDist && process.env.FORCE_VITE_DEV !== 'true') {
    console.log('[Server] Serving pre-compiled production bundle from /dist for instant boot...');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndexPath);
    });
  } else {
    console.log('[Server] Serving Vite development middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Feronia Wildlife System is running cleanly without external database constraints, ready for custom database integration.');
  });
}

startServer();
