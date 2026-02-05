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
  user: process.env.DB_USER || 'vetcarepro_adminuser',
};

if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function clearAllData() {
  const client = await pool.connect();
  
  try {
    log('\n🗑️  Starting database cleanup...', 'cyan');
    log('⚠️  This will delete ALL data except users!', 'yellow');
    
    await client.query('BEGIN');
    log('📌 Transaction started\n', 'cyan');
    
    // Delete in order respecting foreign key constraints
    const tables = [
      { name: 'billing_items', desc: 'Billing line items' },
      { name: 'billing', desc: 'Billing records' },
      { name: 'payments', desc: 'Payment records' },
      { name: 'disease_cases', desc: 'Disease case records' },
      { name: 'vaccinations', desc: 'Vaccination records' },
      { name: 'medical_records', desc: 'Medical records' },
      { name: 'appointments', desc: 'Appointments' },
      { name: 'pets', desc: 'Pet records' },
      { name: 'customers', desc: 'Customer records' },
      { name: 'inventory', desc: 'Inventory items' },
      { name: 'daily_sales_summary', desc: 'Sales summaries' },
      { name: 'audit_logs', desc: 'Audit logs' },
      { name: 'system_settings', desc: 'System settings' },
    ];
    
    log('\n📊 Current record counts:', 'cyan');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table.name}`);
        console.log(`   ${table.desc.padEnd(30)} ${result.rows[0].count} records`);
      } catch (err) {
        // Table might not exist
        console.log(`   ${table.desc.padEnd(30)} (table not found)`);
      }
    }
    
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    log(`   ${'Users (WILL BE KEPT)'.padEnd(30)} ${usersResult.rows[0].count} records`, 'green');
    
    log('\n🗑️  Deleting records...', 'yellow');
    
    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table.name}`);
        log(`   ✓ Deleted ${result.rowCount} records from ${table.name}`, 'green');
      } catch (err) {
        // If we get a constraint error, the transaction is aborted
        if (err.code === '23503') {
          log(`   ✗ Foreign key constraint error on ${table.name}`, 'red');
          log(`      ${err.message}`, 'red');
          throw new Error(`Cannot delete from ${table.name} due to foreign key constraint. Transaction aborted.`);
        } else if (!err.message.includes('does not exist')) {
          log(`   ✗ Error deleting from ${table.name}: ${err.message}`, 'red');
          throw err;
        }
      }
    }
    
    // Reset sequences to start fresh with IDs
    log('\n🔄 Resetting ID sequences...', 'cyan');
    const sequences = [
      'customers_customer_id_seq',
      'pets_pet_id_seq',
      'appointments_appointment_id_seq',
      'medical_records_record_id_seq',
      'vaccinations_vaccination_id_seq',
      'disease_cases_case_id_seq',
      'inventory_item_id_seq',
      'billing_bill_id_seq',
      'billing_items_billing_item_id_seq',
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`SELECT setval('${seq}', 1, false)`);
        log(`   ✓ Reset ${seq}`, 'green');
      } catch (err) {
        // Sequence might not exist, skip it
        if (!err.message.includes('does not exist')) {
          log(`   ⚠ ${seq}: ${err.message}`, 'yellow');
        }
      }
    }
    
    await client.query('COMMIT');
    log('\n✅ Transaction committed!', 'green');
    
    log('\n✅ Database cleanup completed!', 'green');
    log('   All data deleted except users', 'green');
    log('   Table structures preserved', 'green');
    log('   ID sequences reset to 1\n', 'green');
    
    // Show final counts
    log('📊 Final record counts:', 'cyan');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table.name}`);
        console.log(`   ${table.desc.padEnd(30)} ${result.rows[0].count} records`);
      } catch (err) {
        // Ignore
      }
    }
    
    const finalUsers = await client.query('SELECT COUNT(*) FROM users');
    log(`   ${'Users (KEPT)'.padEnd(30)} ${finalUsers.rows[0].count} records\n`, 'green');
    
  } catch (error) {
    await client.query('ROLLBACK');
    log(`\n❌ Error: ${error.message}`, 'red');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Confirmation check
const args = process.argv.slice(2);
if (args[0] !== '--confirm') {
  log('\n⚠️  WARNING: This will delete ALL data except users!', 'yellow');
  log('   To proceed, run: node clear-database.js --confirm\n', 'yellow');
  process.exit(0);
}

clearAllData().catch(console.error);
