import pool from '../config/database.js';

/**
 * Pet Model
 * Database operations for pets table
 */

/**
 * Get all pets with owner info
 */
export const getAllPets = async (filters = {}) => {
  let query = `
    SELECT 
      p.*,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age_years
    FROM pets p
    INNER JOIN customers c ON p.customer_id = c.customer_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  // Search by pet name or owner name
  if (filters.search) {
    query += ` AND (
      p.pet_name ILIKE $${paramCount} OR 
      c.first_name ILIKE $${paramCount} OR 
      c.last_name ILIKE $${paramCount}
    )`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  // Filter by species
  if (filters.species) {
    query += ` AND p.species = $${paramCount}`;
    params.push(filters.species);
    paramCount++;
  }

  // Filter by customer
  if (filters.customer_id) {
    query += ` AND p.customer_id = $${paramCount}`;
    params.push(filters.customer_id);
    paramCount++;
  }

  // Filter by active status
  if (filters.is_active !== undefined) {
    query += ` AND p.is_active = $${paramCount}`;
    params.push(filters.is_active);
    paramCount++;
  }

  query += ` ORDER BY p.created_at DESC`;

  // Pagination
  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
    paramCount++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get pet by ID with full details
 */
export const getPetById = async (petId) => {
  const query = `
    SELECT 
      p.*,
      c.first_name as owner_first_name,
      c.last_name as owner_last_name,
      c.phone as owner_phone,
      c.email as owner_email,
      c.address as owner_address,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age_years
    FROM pets p
    INNER JOIN customers c ON p.customer_id = c.customer_id
    WHERE p.pet_id = $1
  `;

  const result = await pool.query(query, [petId]);
  return result.rows[0] || null;
};

/**
 * Create new pet
 */
export const createPet = async (petData, createdBy) => {
  const query = `
    INSERT INTO pets (
      customer_id, pet_name, photo_url, species, breed, gender,
      date_of_birth, color, weight_current,
      insurance_provider, insurance_policy_number, is_neutered,
      allergies, special_needs, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;

  const values = [
    petData.customer_id,
    petData.pet_name,
    petData.photo_url || null,
    petData.species,
    petData.breed || null,
    petData.gender || null,
    petData.date_of_birth || null,
    petData.color || null,
    petData.weight_current || null,
    petData.insurance_provider || null,
    petData.insurance_policy_number || null,
    petData.is_neutered || false,
    petData.allergies || null,
    petData.special_needs || null,
    petData.notes || null,
    createdBy
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update pet
 */
export const updatePet = async (petId, petData, updatedBy) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (petData.pet_name) {
    fields.push(`pet_name = $${paramCount}`);
    values.push(petData.pet_name);
    paramCount++;
  }
  if (petData.photo_url !== undefined) {
    fields.push(`photo_url = $${paramCount}`);
    values.push(petData.photo_url);
    paramCount++;
  }
  if (petData.species) {
    fields.push(`species = $${paramCount}`);
    values.push(petData.species);
    paramCount++;
  }
  if (petData.breed !== undefined) {
    fields.push(`breed = $${paramCount}`);
    values.push(petData.breed);
    paramCount++;
  }
  if (petData.gender !== undefined) {
    fields.push(`gender = $${paramCount}`);
    values.push(petData.gender);
    paramCount++;
  }
  if (petData.date_of_birth !== undefined) {
    fields.push(`date_of_birth = $${paramCount}`);
    values.push(petData.date_of_birth);
    paramCount++;
  }
  if (petData.color !== undefined) {
    fields.push(`color = $${paramCount}`);
    values.push(petData.color);
    paramCount++;
  }
  if (petData.weight_current !== undefined) {
    fields.push(`weight_current = $${paramCount}`);
    values.push(petData.weight_current);
    paramCount++;
  }
  if (petData.insurance_provider !== undefined) {
    fields.push(`insurance_provider = $${paramCount}`);
    values.push(petData.insurance_provider);
    paramCount++;
  }
  if (petData.insurance_policy_number !== undefined) {
    fields.push(`insurance_policy_number = $${paramCount}`);
    values.push(petData.insurance_policy_number);
    paramCount++;
  }
  if (petData.is_neutered !== undefined) {
    fields.push(`is_neutered = $${paramCount}`);
    values.push(petData.is_neutered);
    paramCount++;
  }
  if (petData.allergies !== undefined) {
    fields.push(`allergies = $${paramCount}`);
    values.push(petData.allergies);
    paramCount++;
  }
  if (petData.special_needs !== undefined) {
    fields.push(`special_needs = $${paramCount}`);
    values.push(petData.special_needs);
    paramCount++;
  }
  if (petData.notes !== undefined) {
    fields.push(`notes = $${paramCount}`);
    values.push(petData.notes);
    paramCount++;
  }
  if (petData.is_active !== undefined) {
    fields.push(`is_active = $${paramCount}`);
    values.push(petData.is_active);
    paramCount++;
  }
  if (petData.deceased_date !== undefined) {
    fields.push(`deceased_date = $${paramCount}`);
    values.push(petData.deceased_date);
    paramCount++;
  }
  if (petData.image !== undefined) {
    fields.push(`image = $${paramCount}`);
    values.push(petData.image);
    paramCount++;
  }

  fields.push(`updated_by = $${paramCount}`);
  values.push(updatedBy);
  paramCount++;

  values.push(petId);

  const query = `
    UPDATE pets 
    SET ${fields.join(', ')}
    WHERE pet_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete pet (soft delete)
 */
export const deletePet = async (petId) => {
  const query = 'UPDATE pets SET is_active = false WHERE pet_id = $1';
  const result = await pool.query(query, [petId]);
  return result.rowCount > 0;
};

/**
 * Get pet's medical history
 */
export const getPetMedicalHistory = async (petId) => {
  const query = `
    SELECT 
      mr.*,
      CONCAT(u.first_name, ' ', u.last_name) as veterinarian_name
    FROM medical_records mr
    LEFT JOIN users u ON mr.veterinarian_id = u.user_id
    WHERE mr.pet_id = $1
    ORDER BY mr.visit_date DESC
  `;

  const result = await pool.query(query, [petId]);
  return result.rows;
};

/**
 * Get pet's vaccination history
 */
export const getPetVaccinations = async (petId) => {
  const query = `
    SELECT 
      v.*,
      CONCAT(u.first_name, ' ', u.last_name) as administered_by_name
    FROM vaccinations v
    LEFT JOIN users u ON v.administered_by = u.user_id
    WHERE v.pet_id = $1
    ORDER BY v.vaccination_date DESC
  `;

  const result = await pool.query(query, [petId]);
  return result.rows;
};

/**
 * Get pet count
 */
export const getPetCount = async () => {
  const query = 'SELECT COUNT(*) as count FROM pets WHERE is_active = true';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

/**
 * Get species list (for dropdowns)
 */
export const getSpeciesList = async () => {
  const query = `
    SELECT DISTINCT species, COUNT(*) as count
    FROM pets
    WHERE is_active = true
    GROUP BY species
    ORDER BY count DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};