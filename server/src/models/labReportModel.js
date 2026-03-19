import pool from '../config/database.js';

export const getLabReportsByPet = async (petId) => {
  const query = `
    SELECT
      lr.report_id,
      lr.pet_id,
      lr.report_name,
      lr.report_type,
      lr.file_path,
      lr.file_type,
      lr.notes,
      lr.related_case_id,
      lr.created_at,
      u.first_name || ' ' || u.last_name AS uploaded_by_name,
      dc.disease_name AS related_disease_name
    FROM lab_reports lr
    LEFT JOIN users u ON lr.uploaded_by = u.user_id
    LEFT JOIN disease_cases dc ON lr.related_case_id = dc.case_id
    WHERE lr.pet_id = $1
    ORDER BY lr.created_at DESC
  `;
  const result = await pool.query(query, [petId]);
  return result.rows;
};

export const getLabReportById = async (reportId) => {
  const query = `
    SELECT
      lr.*,
      u.first_name || ' ' || u.last_name AS uploaded_by_name,
      dc.disease_name AS related_disease_name
    FROM lab_reports lr
    LEFT JOIN users u ON lr.uploaded_by = u.user_id
    LEFT JOIN disease_cases dc ON lr.related_case_id = dc.case_id
    WHERE lr.report_id = $1
  `;
  const result = await pool.query(query, [reportId]);
  return result.rows[0] || null;
};

export const createLabReport = async ({ petId, reportName, reportType, filePath, fileType, notes, relatedCaseId, uploadedBy }) => {
  const query = `
    INSERT INTO lab_reports (pet_id, report_name, report_type, file_path, file_type, notes, related_case_id, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await pool.query(query, [
    petId, reportName, reportType, filePath, fileType,
    notes || null, relatedCaseId || null, uploadedBy
  ]);
  return result.rows[0];
};

export const deleteLabReport = async (reportId) => {
  const query = `DELETE FROM lab_reports WHERE report_id = $1 RETURNING file_path`;
  const result = await pool.query(query, [reportId]);
  return result.rows[0] || null;
};
