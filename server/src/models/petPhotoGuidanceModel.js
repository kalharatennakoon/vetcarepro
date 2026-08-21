import pool from '../config/database.js';

export const createJob = async ({ petId, customerId, photoPath, ownerNote }) => {
  const query = `
    INSERT INTO pet_photo_guidance (pet_id, customer_id, photo_path, owner_note)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [petId, customerId, photoPath, ownerNote || null]);
  return result.rows[0];
};

// Ownership-scoped: a job that doesn't belong to this customer simply isn't
// found, rather than needing a separate check after the fact.
export const getJobForCustomer = async (jobId, customerId) => {
  const query = `
    SELECT *
    FROM pet_photo_guidance
    WHERE job_id = $1 AND customer_id = $2
  `;
  const result = await pool.query(query, [jobId, customerId]);
  return result.rows[0] || null;
};

export const listJobsForCustomerPet = async (petId, customerId) => {
  const query = `
    SELECT *
    FROM pet_photo_guidance
    WHERE pet_id = $1 AND customer_id = $2
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [petId, customerId]);
  return result.rows;
};
