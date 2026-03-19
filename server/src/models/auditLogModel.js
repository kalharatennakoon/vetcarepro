import pool from '../config/database.js';

export const getAuditLogs = async (filters = {}) => {
  let query = `
    SELECT
      al.log_id,
      al.action,
      al.table_name,
      al.record_id,
      al.old_values,
      al.new_values,
      al.ip_address,
      al.user_agent,
      al.timestamp,
      CONCAT(u.first_name, ' ', u.last_name) AS performed_by,
      u.role AS performed_by_role,
      u.email AS performed_by_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE 1=1
  `;

  const params = [];
  let p = 1;

  if (filters.action) {
    query += ` AND al.action = $${p}`;
    params.push(filters.action);
    p++;
  }

  if (filters.table_name) {
    query += ` AND al.table_name = $${p}`;
    params.push(filters.table_name);
    p++;
  }

  if (filters.user_id) {
    query += ` AND al.user_id = $${p}`;
    params.push(filters.user_id);
    p++;
  }

  if (filters.date_from) {
    query += ` AND al.timestamp >= $${p}`;
    params.push(filters.date_from);
    p++;
  }

  if (filters.date_to) {
    query += ` AND al.timestamp <= $${p}`;
    params.push(filters.date_to + ' 23:59:59');
    p++;
  }

  if (filters.search) {
    query += ` AND (
      al.table_name ILIKE $${p} OR
      al.action ILIKE $${p} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${p}
    )`;
    params.push(`%${filters.search}%`);
    p++;
  }

  query += ` ORDER BY al.timestamp DESC`;

  const countQuery = `SELECT COUNT(*) as total FROM (${query}) sub`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  if (filters.limit) {
    query += ` LIMIT $${p}`;
    params.push(parseInt(filters.limit));
    p++;
  }

  if (filters.offset) {
    query += ` OFFSET $${p}`;
    params.push(parseInt(filters.offset));
    p++;
  }

  const result = await pool.query(query, params);
  return { logs: result.rows, total };
};

export const getDistinctActions = async () => {
  const result = await pool.query(`SELECT DISTINCT action FROM audit_logs ORDER BY action`);
  return result.rows.map(r => r.action);
};

export const getDistinctTables = async () => {
  const result = await pool.query(`SELECT DISTINCT table_name FROM audit_logs ORDER BY table_name`);
  return result.rows.map(r => r.table_name);
};
