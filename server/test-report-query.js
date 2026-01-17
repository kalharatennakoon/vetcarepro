import pool from './src/config/database.js';

const startDate = '2025-12-17';
const endDate = '2026-01-17';

const query = `
  SELECT 
    -- Financial metrics
    (SELECT COUNT(*) FROM billing WHERE bill_date BETWEEN $1 AND $2) as total_invoices,
    (SELECT COALESCE(SUM(total_amount), 0) FROM billing WHERE bill_date BETWEEN $1 AND $2) as total_revenue,
    (SELECT COALESCE(SUM(paid_amount), 0) FROM billing WHERE bill_date BETWEEN $1 AND $2) as total_collected,
    (SELECT COALESCE(SUM(balance_amount), 0) FROM billing 
      WHERE payment_status IN ('unpaid', 'partially_paid', 'overdue') AND bill_date BETWEEN $1 AND $2) as total_outstanding,
    
    -- Operational metrics
    (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN $1 AND $2) as total_appointments,
    (SELECT COUNT(*) FROM appointments 
      WHERE status = 'completed' AND appointment_date BETWEEN $1 AND $2) as completed_appointments,
    (SELECT COUNT(DISTINCT pet_id) FROM appointments 
      WHERE appointment_date BETWEEN $1 AND $2) as unique_patients,
    (SELECT COUNT(DISTINCT customer_id) FROM appointments 
      WHERE appointment_date BETWEEN $1 AND $2) as unique_customers,
    
    -- Inventory metrics
    (SELECT COUNT(*) FROM inventory WHERE stock_quantity <= reorder_level) as low_stock_items,
    (SELECT COALESCE(SUM(stock_quantity * unit_price), 0) FROM inventory) as total_inventory_value
`;

pool.query(query, [startDate, endDate])
  .then(result => {
    console.log('Query successful:', result.rows[0]);
    process.exit(0);
  })
  .catch(error => {
    console.error('Query error:', error);
    process.exit(1);
  });
