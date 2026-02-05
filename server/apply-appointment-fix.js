#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vetcarepro',
  user: process.env.DB_USER || 'postgres',
};

if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

async function applyMigration() {
  console.log('🔧 Applying appointment deletion constraint fix...');
  
  const client = await pool.connect();
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '../database/migrations/007_fix_appointment_deletion_constraints.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    
    console.log('📝 Dropping old constraints...');
    
    // Drop old constraints
    await client.query(`
      ALTER TABLE medical_records 
      DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE billing 
      DROP CONSTRAINT IF EXISTS billing_appointment_id_fkey
    `);
    
    console.log('✅ Old constraints dropped');
    console.log('📝 Adding new constraints with SET NULL...');
    
    // Add new constraints with SET NULL
    await client.query(`
      ALTER TABLE medical_records 
      ADD CONSTRAINT medical_records_appointment_id_fkey 
      FOREIGN KEY (appointment_id) 
      REFERENCES appointments(appointment_id) 
      ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE billing 
      ADD CONSTRAINT billing_appointment_id_fkey 
      FOREIGN KEY (appointment_id) 
      REFERENCES appointments(appointment_id) 
      ON DELETE SET NULL
    `);
    
    console.log('✅ New constraints added');
    console.log('📋 Verifying constraints...');
    
    // Verify
    const result = await client.query(`
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        confrelid::regclass AS referenced_table,
        CASE confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS delete_action
      FROM pg_constraint
      WHERE confrelid = 'appointments'::regclass
      ORDER BY conrelid::regclass::text
    `);
    
    console.table(result.rows);
    
    await client.query('COMMIT');
    console.log('✅ Migration applied successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error applying migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);
