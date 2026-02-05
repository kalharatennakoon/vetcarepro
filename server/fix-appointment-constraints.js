#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vetcarepro',
  user: process.env.DB_USER || 'vetcarepro_admin',
};

if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

async function fixConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing appointment deletion constraints...\n');
    
    await client.query('BEGIN');
    
    console.log('📝 Updating medical_records constraint...');
    await client.query(`
      ALTER TABLE medical_records 
      DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey CASCADE
    `);
    
    await client.query(`
      ALTER TABLE medical_records 
      ADD CONSTRAINT medical_records_appointment_id_fkey 
      FOREIGN KEY (appointment_id) 
      REFERENCES appointments(appointment_id) 
      ON DELETE SET NULL
    `);
    console.log('   ✅ medical_records constraint updated');
    
    console.log('📝 Updating billing constraint...');
    await client.query(`
      ALTER TABLE billing 
      DROP CONSTRAINT IF EXISTS billing_appointment_id_fkey CASCADE
    `);
    
    await client.query(`
      ALTER TABLE billing 
      ADD CONSTRAINT billing_appointment_id_fkey 
      FOREIGN KEY (appointment_id) 
      REFERENCES appointments(appointment_id) 
      ON DELETE SET NULL
    `);
    console.log('   ✅ billing constraint updated');
    
    await client.query('COMMIT');
    
    console.log('\n📋 Verifying constraints...');
    const result = await client.query(`
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        CASE confdeltype
          WHEN 'n' THEN '✅ SET NULL'
          WHEN 'a' THEN '❌ NO ACTION'
          WHEN 'r' THEN '❌ RESTRICT'
          WHEN 'c' THEN 'CASCADE'
        END AS delete_action
      FROM pg_constraint
      WHERE confrelid = 'appointments'::regclass
        AND conrelid::regclass IN ('medical_records'::regclass, 'billing'::regclass)
    `);
    
    console.table(result.rows);
    console.log('\n✅ Appointment deletion constraints fixed successfully!');
    console.log('   You can now delete appointments from the UI.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('must be owner') || error.message.includes('permission denied')) {
      console.log('\n⚠️  Permission error detected.');
      console.log('   Please run the SQL script manually:');
      console.log('   psql -h localhost -U vetcarepro_admin -d vetcarepro -f ../database/SIMPLE-FIX-appointment-deletion.sql\n');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraints();
