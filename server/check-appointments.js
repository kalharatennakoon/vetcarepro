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

async function checkAppointments() {
  try {
    console.log('🔍 Checking appointments and their related records...\n');
    
    const query = `
      SELECT 
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        c.first_name || ' ' || c.last_name as customer_name,
        p.pet_name,
        a.status,
        (SELECT COUNT(*) FROM medical_records WHERE appointment_id = a.appointment_id) as medical_records_count,
        (SELECT COUNT(*) FROM billing WHERE appointment_id = a.appointment_id) as billing_count
      FROM appointments a
      JOIN customers c ON a.customer_id = c.customer_id
      JOIN pets p ON a.pet_id = p.pet_id
      ORDER BY a.appointment_id;
    `;
    
    const result = await pool.query(query);
    
    console.log('📋 All Appointments:\n');
    console.table(result.rows);
    
    const withRecords = result.rows.filter(r => r.medical_records_count > 0 || r.billing_count > 0);
    
    if (withRecords.length > 0) {
      console.log('\n⚠️  Appointments with related records (will fail to delete without constraint fix):\n');
      console.table(withRecords);
      console.log('\n💡 Run the SQL fix as postgres superuser:');
      console.log('   psql -h localhost -U postgres -d vetcarepro -f ../database/fix-appointment-deletion.sql\n');
    } else {
      console.log('\n✅ No appointments have related medical records or billing.');
      console.log('   All appointments should be deletable!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAppointments();
