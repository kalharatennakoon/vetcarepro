#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

// PostgreSQL connection configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vetcarepro',
  user: process.env.DB_USER || 'postgres',
};

// Only add password if it's defined
if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDuplicates() {
  log('\n🔍 Checking for duplicate customer records...', 'cyan');
  
  try {
    // Check for duplicates by phone
    const phoneQuery = `
      SELECT 
        phone,
        COUNT(*) as duplicate_count,
        STRING_AGG(customer_id::text, ', ' ORDER BY customer_id) as customer_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ' ORDER BY customer_id) as customer_names
      FROM customers
      WHERE phone IS NOT NULL AND TRIM(phone) != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY phone;
    `;
    
    const phoneResult = await pool.query(phoneQuery);
    
    // Check for duplicates by email
    const emailQuery = `
      SELECT 
        email,
        COUNT(*) as duplicate_count,
        STRING_AGG(customer_id::text, ', ' ORDER BY customer_id) as customer_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ' ORDER BY customer_id) as customer_names
      FROM customers
      WHERE email IS NOT NULL AND TRIM(email) != ''
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY email;
    `;
    
    const emailResult = await pool.query(emailQuery);
    
    const hasDuplicates = phoneResult.rows.length > 0 || emailResult.rows.length > 0;
    
    if (!hasDuplicates) {
      log('✅ No duplicate customer records found!', 'green');
      return false;
    }
    
    if (phoneResult.rows.length > 0) {
      log(`\n⚠️  Found ${phoneResult.rows.length} duplicate phone numbers:`, 'yellow');
      console.table(phoneResult.rows);
    }
    
    if (emailResult.rows.length > 0) {
      log(`\n⚠️  Found ${emailResult.rows.length} duplicate email addresses:`, 'yellow');
      console.table(emailResult.rows);
    }
    
    return true;
  } catch (error) {
    log(`❌ Error checking duplicates: ${error.message}`, 'red');
    throw error;
  }
}

async function showDuplicateDetails() {
  log('\n📋 Detailed view of duplicate customer records...', 'cyan');
  
  const query = `
    SELECT DISTINCT
      c1.customer_id,
      c1.first_name,
      c1.last_name,
      c1.email,
      c1.phone,
      c1.created_at::date,
      (SELECT COUNT(*) FROM pets WHERE customer_id = c1.customer_id) as pet_count,
      (SELECT COUNT(*) FROM appointments WHERE customer_id = c1.customer_id) as appointment_count
    FROM customers c1
    WHERE EXISTS (
      SELECT 1 
      FROM customers c2 
      WHERE c1.customer_id != c2.customer_id
      AND (
        (c1.phone IS NOT NULL AND c1.phone = c2.phone)
        OR (c1.email IS NOT NULL AND c1.email = c2.email)
      )
    )
    ORDER BY c1.phone, c1.email, c1.customer_id;
  `;
  
  const result = await pool.query(query);
  console.table(result.rows);
}

async function removeDuplicates() {
  log('\n🔧 Starting duplicate customer removal process...', 'cyan');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    log('📝 Identifying customers to keep and merge...', 'blue');
    
    // Create temp table for customers to keep (by phone)
    await client.query(`
      CREATE TEMP TABLE customers_to_keep_by_phone AS
      SELECT DISTINCT ON (phone)
        customer_id as keep_customer_id,
        phone
      FROM customers
      WHERE phone IS NOT NULL AND TRIM(phone) != ''
      ORDER BY phone, customer_id ASC;
    `);
    
    // Create temp table for customers to keep (by email)
    await client.query(`
      CREATE TEMP TABLE customers_to_keep_by_email AS
      SELECT DISTINCT ON (email)
        customer_id as keep_customer_id,
        email
      FROM customers
      WHERE email IS NOT NULL AND TRIM(email) != ''
        AND customer_id NOT IN (SELECT keep_customer_id FROM customers_to_keep_by_phone)
      ORDER BY email, customer_id ASC;
    `);
    
    // Create comprehensive list of customers to delete (duplicates by phone)
    await client.query(`
      CREATE TEMP TABLE customers_to_delete AS
      SELECT 
        c.customer_id as delete_customer_id, 
        ctkp.keep_customer_id
      FROM customers c
      INNER JOIN customers_to_keep_by_phone ctkp ON c.phone = ctkp.phone
      WHERE c.customer_id != ctkp.keep_customer_id
      UNION
      SELECT 
        c.customer_id as delete_customer_id, 
        ctke.keep_customer_id
      FROM customers c
      INNER JOIN customers_to_keep_by_email ctke ON c.email = ctke.email
      WHERE c.customer_id != ctke.keep_customer_id
        AND c.customer_id NOT IN (
          SELECT delete_customer_id FROM (
            SELECT c2.customer_id as delete_customer_id
            FROM customers c2
            INNER JOIN customers_to_keep_by_phone ctkp2 ON c2.phone = ctkp2.phone
            WHERE c2.customer_id != ctkp2.keep_customer_id
          ) phone_dupes
        );
    `);
    
    // Show what will be merged
    const mergeInfo = await client.query(`
      SELECT 
        ctd.delete_customer_id as "Customer ID to Delete",
        ctd.keep_customer_id as "Will be Merged Into",
        c1.first_name || ' ' || c1.last_name as "Customer Name",
        c1.phone as "Phone",
        c1.email as "Email",
        (SELECT COUNT(*) FROM pets WHERE customer_id = ctd.delete_customer_id) as "Pets",
        (SELECT COUNT(*) FROM appointments WHERE customer_id = ctd.delete_customer_id) as "Appointments"
      FROM customers_to_delete ctd
      INNER JOIN customers c1 ON ctd.delete_customer_id = c1.customer_id
      ORDER BY c1.first_name, c1.last_name
    `);
    
    if (mergeInfo.rows.length === 0) {
      log('\n✅ No duplicate customers to merge!', 'green');
      await client.query('ROLLBACK');
      return;
    }
    
    log('\n📋 Merging the following customer records:', 'yellow');
    console.table(mergeInfo.rows);
    
    log('\n🔄 Updating related records...', 'blue');
    
    // Update pets
    const petResult = await client.query(`
      UPDATE pets p
      SET customer_id = ctd.keep_customer_id,
          updated_at = CURRENT_TIMESTAMP
      FROM customers_to_delete ctd
      WHERE p.customer_id = ctd.delete_customer_id
    `);
    log(`  ✓ Updated ${petResult.rowCount} pets`, 'green');
    
    // Update appointments
    const aptResult = await client.query(`
      UPDATE appointments a
      SET customer_id = ctd.keep_customer_id,
          updated_at = CURRENT_TIMESTAMP
      FROM customers_to_delete ctd
      WHERE a.customer_id = ctd.delete_customer_id
    `);
    log(`  ✓ Updated ${aptResult.rowCount} appointments`, 'green');
    
    // Update billing records if they exist
    const billingExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing'
      )
    `);
    
    if (billingExists.rows[0].exists) {
      const billResult = await client.query(`
        UPDATE billing b
        SET customer_id = ctd.keep_customer_id,
            updated_at = CURRENT_TIMESTAMP
        FROM customers_to_delete ctd
        WHERE b.customer_id = ctd.delete_customer_id
      `);
      log(`  ✓ Updated ${billResult.rowCount} billing records`, 'green');
    }
    
    log('\n🗑️  Deleting duplicate customer records...', 'blue');
    
    // Delete duplicate customers
    const deleteResult = await client.query(`
      DELETE FROM customers
      WHERE customer_id IN (SELECT delete_customer_id FROM customers_to_delete)
    `);
    
    log(`  ✓ Deleted ${deleteResult.rowCount} duplicate customer records`, 'green');
    
    await client.query('COMMIT');
    log('\n✅ Duplicate customers removed successfully!', 'green');
    
  } catch (error) {
    await client.query('ROLLBACK');
    log(`❌ Error removing duplicates: ${error.message}`, 'red');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  try {
    await pool.query('SELECT NOW()'); // Test connection
    
    switch (command) {
      case 'check':
        const hasDuplicates = await checkDuplicates();
        if (hasDuplicates) {
          await showDuplicateDetails();
          log('\n💡 Run "npm run remove-duplicate-customers" to remove duplicates', 'yellow');
        }
        break;
        
      case 'remove':
        const duplicatesExist = await checkDuplicates();
        if (!duplicatesExist) {
          log('Nothing to remove!', 'green');
          break;
        }
        
        await showDuplicateDetails();
        log('\n⚠️  This will remove duplicate customers and merge their records.', 'yellow');
        log('The oldest customer record will be kept for each duplicate group.', 'yellow');
        
        await removeDuplicates();
        await checkDuplicates(); // Verify removal
        break;
        
      default:
        log('Usage: node remove-duplicate-customers.js [check|remove]', 'yellow');
        log('  check  - Check for duplicate customers (default)', 'yellow');
        log('  remove - Remove duplicate customers', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
