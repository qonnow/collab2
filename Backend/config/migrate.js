/**
 * รันครั้งเดียวเพื่อสร้างตารางใน Supabase
 * วิธีใช้: node config/migrate.js
 *
 * ถ้ารันไม่สำเร็จ ให้คัดลอก SQL ไปวางใน
 * Supabase Dashboard → SQL Editor
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
-- ตาราง packets (แพ็กเก็ตเครือข่าย)
CREATE TABLE IF NOT EXISTS packets (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  packet_id          text NOT NULL UNIQUE,
  user_id            uuid REFERENCES users(id) ON DELETE CASCADE,
  protocol           text NOT NULL,
  source_ip          text NOT NULL,
  source_port        integer,
  destination_ip     text NOT NULL,
  destination_port   integer,
  payload            text DEFAULT '',
  encrypted_payload  text DEFAULT '',
  is_encrypted       boolean DEFAULT false,
  encryption_method  text DEFAULT 'NONE',
  cipher_suite       text,
  certificate        jsonb,
  size               integer NOT NULL,
  ttl                integer DEFAULT 64,
  flags              text[] DEFAULT '{}',
  is_suspicious      boolean DEFAULT false,
  threat_level       text DEFAULT 'NONE',
  threat_description text DEFAULT '',
  captured_at        timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packets_captured_at ON packets (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_packets_protocol ON packets (protocol);
CREATE INDEX IF NOT EXISTS idx_packets_is_encrypted ON packets (is_encrypted);
CREATE INDEX IF NOT EXISTS idx_packets_is_suspicious ON packets (is_suspicious);
CREATE INDEX IF NOT EXISTS idx_packets_source_ip ON packets (source_ip);
CREATE INDEX IF NOT EXISTS idx_packets_user_id ON packets (user_id);

-- ตาราง users (ผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS users (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username    text NOT NULL UNIQUE,
  email       text NOT NULL UNIQUE,
  password    text NOT NULL,
  role        text DEFAULT 'user',
  is_active   boolean DEFAULT true,
  last_login  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ตาราง audit_logs (บันทึกการตรวจสอบ)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  details     text DEFAULT '',
  ip_address  text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
`;

async function migrate() {
  console.log('='.repeat(60));
  console.log('  SUPABASE MIGRATION — copy the SQL below');
  console.log('  into Supabase Dashboard > SQL Editor > New Query > Run');
  console.log('='.repeat(60));
  console.log(SQL);
  console.log('='.repeat(60));
  console.log('Dashboard: https://supabase.com/dashboard → SQL Editor');
}

migrate().catch(console.error);
