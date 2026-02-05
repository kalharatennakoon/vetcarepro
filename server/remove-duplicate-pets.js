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
  log('\n🔍 Checking for duplicate pet records...', 'cyan');
  
  try {
    const query = `
      SELECT 
        c.customer_id,
        c.first_name || ' ' || c.last_name as owner_name,
        LOWER(TRIM(p.pet_name)) as pet_name,
        COUNT(*) as duplicate_count,
        STRING_AGG(p.pet_id::text, ', ' ORDER BY p.pet_id) as pet_ids
      FROM pets p
      INNER JOIN customers c ON p.customer_id = c.customer_id
      WHERE EXISTS (
        SELECT 1 
        FROM pets p2 
        WHERE p.customer_id = p2.customer_id 
        AND LOWER(TRIM(p.pet_name)) = LOWER(TRIM(p2.pet_name))
        AND p.pet_id != p2.pet_id
      )
      GROUP BY c.customer_id, c.first_name, c.last_name, LOWER(TRIM(p.pet_name))
      ORDER BY c.customer_id, pet_name;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log('✅ No duplicate pet records found!', 'green');
      return false;
    }
    
    log(`⚠️  Found ${result.rows.length} sets of duplicate pets:`, 'yellow');
    console.table(result.rows);
    
    return true;
  } catch (error) {
    log(`❌ Error checking duplicates: ${error.message}`, 'red');
    throw error;
  }
}

async function showDuplicateDetails() {
  log('\n📋 Detailed view of duplicate records...', 'cyan');
  
  const query = `
    SELECT 
      p.pet_id,
      p.customer_id,
      c.first_name || ' ' || c.last_name as owner_name,
      p.pet_name,
      p.species,
      p.breed,
      p.created_at::date,
      (SELECT COUNT(*) FROM appointments WHERE pet_id = p.pet_id) as appointments,
      (SELECT COUNT(*) FROM medical_records WHERE pet_id = p.pet_id) as medical_records,
      (SELECT COUNT(*) FROM vaccinations WHERE pet_id = p.pet_id) as vaccinations
    FROM pets p
    INNER JOIN customers c ON p.customer_id = c.customer_id
    WHERE EXISTS (
      SELECT 1 
      FROM pets p2 
      WHERE p.customer_id = p2.customer_id 
      AND LOWER(TRIM(p.pet_name)) = LOWER(TRIM(p2.pet_name))
      AND p.pet_id != p2.pet_id
    )
    ORDER BY owner_name, p.pet_name, p.created_at;
  `;
  
  const result = await pool.query(query);
  console.table(result.rows);
}

async function removeDuplicates() {
  log('\n🔧 Starting duplicate removal process...', 'cyan');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    log('📝 Creating temporary tables...', 'blue');
    
    // Create temp table for pets to keep
    await client.query(`
      CREATE TEMP TABLE pets_to_keep AS
      SELECT DISTINCT ON (customer_id, LOWER(TRIM(pet_name)))
        pet_id as keep_pet_id,
        customer_id,
        LOWER(TRIM(pet_name)) as normalized_name
      FROM pets
      ORDER BY customer_id, LOWER(TRIM(pet_name)), pet_id ASC
    `);
    
    // Create temp table for pets to delete
    await client.query(`
      CREATE TEMP TABLE pets_to_delete AS
      SELECT p.pet_id as delete_pet_id, ptk.keep_pet_id
      FROM pets p
      INNER JOIN pets_to_keep ptk 
        ON p.customer_id = ptk.customer_id 
        AND LOWER(TRIM(p.pet_name)) = ptk.normalized_name
      WHERE p.pet_id != ptk.keep_pet_id
    `);
    
    // Show what will be merged
    const mergeInfo = await client.query(`
      SELECT 
        ptd.delete_pet_id as "Pet ID to Delete",
        ptd.keep_pet_id as "Will be Merged Into",
        p1.pet_name as "Pet Name",
        c.first_name || ' ' || c.last_name as "Owner"
      FROM pets_to_delete ptd
      INNER JOIN pets p1 ON ptd.delete_pet_id = p1.pet_id
      INNER JOIN customers c ON p1.customer_id = c.customer_id
      ORDER BY c.first_name, c.last_name, p1.pet_name
    `);
    
    if (mergeInfo.rows.length > 0) {
      log('\n📋 Merging the following records:', 'yellow');
      console.table(mergeInfo.rows);
    }
    
    log('\n🔄 Updating related records...', 'blue');
    
    // Update appointments
    const aptResult = await client.query(`
      UPDATE appointments a
      SET pet_id = ptd.keep_pet_id,
          updated_at = CURRENT_TIMESTAMP
      FROM pets_to_delete ptd
      WHERE a.pet_id = ptd.delete_pet_id
    `);
    log(`  ✓ Updated ${aptResult.rowCount} appointments`, 'green');
    
    // Update medical records
    const mrResult = await client.query(`
      UPDATE medical_records mr
      SET pet_id = ptd.keep_pet_id,
          updated_at = CURRENT_TIMESTAMP
      FROM pets_to_delete ptd
      WHERE mr.pet_id = ptd.delete_pet_id
    `);
    log(`  ✓ Updated ${mrResult.rowCount} medical records`, 'green');
    
    // Update vaccinations
    const vacResult = await client.query(`
      UPDATE vaccinations v
      SET pet_id = ptd.keep_pet_id,
          updated_at = CURRENT_TIMESTAMP
      FROM pets_to_delete ptd
      WHERE v.pet_id = ptd.delete_pet_id
    `);
    log(`  ✓ Updated ${vacResult.rowCount} vaccinations`, 'green');
    
    // Update disease cases
    const dcResult = await client.query(`
      UPDATE disease_cases dc
      SET pet_id = ptd.keep_pet_id,
          updated_at = CURRENT_TIMESTAMP
      FROM pets_to_delete ptd
      WHERE dc.pet_id = ptd.delete_pet_id
    `);
    log(`  ✓ Updated ${dcResult.rowCount} disease cases`, 'green');
    
    // Note: Billing table doesn't have pet_id, it references appointments which we already updated
    
    log('\n🗑️  Deleting duplicate pet records...', 'blue');
    
    // Delete duplicate pets
    const deleteResult = await client.query(`
      DELETE FROM pets
      WHERE pet_id IN (SELECT delete_pet_id FROM pets_to_delete)
    `);
    
    log(`  ✓ Deleted ${deleteResult.rowCount} duplicate pet records`, 'green');
    
    await client.query('COMMIT');
    log('\n✅ Duplicate pets removed successfully!', 'green');
    
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
          log('\n💡 Run "npm run remove-duplicates" to remove duplicates', 'yellow');
        }
        break;
        
      case 'remove':
        const duplicatesExist = await checkDuplicates();
        if (!duplicatesExist) {
          log('Nothing to remove!', 'green');
          break;
        }
        
        await showDuplicateDetails();
        log('\n⚠️  This will remove duplicate pets and merge their records.', 'yellow');
        log('The oldest pet record will be kept for each duplicate group.', 'yellow');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For automation, we'll proceed directly
        await removeDuplicates();
        await checkDuplicates(); // Verify removal
        break;
        
      default:
        log('Usage: node remove-duplicate-pets.js [check|remove]', 'yellow');
        log('  check  - Check for duplicate pets (default)', 'yellow');
        log('  remove - Remove duplicate pets', 'yellow');
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
