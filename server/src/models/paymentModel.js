import pool from '../config/database.js';

/**
 * Payment Model
 * Database operations for payments table
 */

/**
 * Get all payments with optional filters
 */
export const getAllPayments = async (filters = {}) => {
  let query = `
    SELECT p.*,
           b.bill_number,
           b.total_amount as bill_total,
           c.first_name || ' ' || c.last_name as customer_name,
           u.first_name || ' ' || u.last_name as received_by_name
    FROM payments p
    JOIN billing b ON p.bill_id = b.bill_id
    JOIN customers c ON b.customer_id = c.customer_id
    LEFT JOIN users u ON p.received_by = u.user_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  // Filter by bill ID
  if (filters.bill_id) {
    query += ` AND p.bill_id = $${paramCount}`;
    params.push(filters.bill_id);
    paramCount++;
  }

  // Filter by payment method
  if (filters.payment_method) {
    query += ` AND p.payment_method = $${paramCount}`;
    params.push(filters.payment_method);
    paramCount++;
  }

  // Filter by date range
  if (filters.from_date) {
    query += ` AND p.payment_date >= $${paramCount}`;
    params.push(filters.from_date);
    paramCount++;
  }

  if (filters.to_date) {
    query += ` AND p.payment_date <= $${paramCount}`;
    params.push(filters.to_date);
    paramCount++;
  }

  // Filter by received by user
  if (filters.received_by) {
    query += ` AND p.received_by = $${paramCount}`;
    params.push(filters.received_by);
    paramCount++;
  }

  query += ` ORDER BY p.payment_date DESC`;

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
 * Get payment by ID
 */
export const getPaymentById = async (paymentId) => {
  const query = `
    SELECT p.*,
           b.bill_number,
           b.total_amount as bill_total,
           b.paid_amount as bill_paid,
           b.balance_amount as bill_balance,
           c.first_name || ' ' || c.last_name as customer_name,
           c.phone as customer_phone,
           u.first_name || ' ' || u.last_name as received_by_name
    FROM payments p
    JOIN billing b ON p.bill_id = b.bill_id
    JOIN customers c ON b.customer_id = c.customer_id
    LEFT JOIN users u ON p.received_by = u.user_id
    WHERE p.payment_id = $1
  `;

  const result = await pool.query(query, [paymentId]);
  return result.rows[0] || null;
};

/**
 * Get payments for a specific bill
 */
export const getPaymentsByBillId = async (billId) => {
  const query = `
    SELECT p.*,
           u.first_name || ' ' || u.last_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.user_id
    WHERE p.bill_id = $1
    ORDER BY p.payment_date DESC
  `;

  const result = await pool.query(query, [billId]);
  return result.rows;
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (filters = {}) => {
  let query = `
    SELECT 
      COUNT(*) as total_payments,
      SUM(amount) as total_amount,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count,
      SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
      COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_count,
      SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_amount,
      COUNT(CASE WHEN payment_method = 'bank_transfer' THEN 1 END) as bank_transfer_count,
      SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END) as bank_transfer_amount,
      COUNT(CASE WHEN payment_method = 'mobile_payment' THEN 1 END) as mobile_payment_count,
      SUM(CASE WHEN payment_method = 'mobile_payment' THEN amount ELSE 0 END) as mobile_payment_amount,
      COUNT(CASE WHEN payment_method = 'insurance' THEN 1 END) as insurance_count,
      SUM(CASE WHEN payment_method = 'insurance' THEN amount ELSE 0 END) as insurance_amount
    FROM payments
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (filters.from_date) {
    query += ` AND payment_date >= $${paramCount}`;
    params.push(filters.from_date);
    paramCount++;
  }

  if (filters.to_date) {
    query += ` AND payment_date <= $${paramCount}`;
    params.push(filters.to_date);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Update payment
 */
export const updatePayment = async (paymentId, paymentData, userId) => {
  const query = `
    UPDATE payments SET
      payment_date = $1,
      payment_method = $2,
      payment_reference = $3,
      card_type = $4,
      bank_name = $5,
      notes = $6,
      updated_by = $7
    WHERE payment_id = $8
    RETURNING *
  `;

  const values = [
    paymentData.payment_date,
    paymentData.payment_method,
    paymentData.payment_reference || null,
    paymentData.card_type || null,
    paymentData.bank_name || null,
    paymentData.notes || null,
    userId,
    paymentId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete payment (this should recalculate bill amounts)
 */
export const deletePayment = async (paymentId, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get payment details
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE payment_id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = paymentResult.rows[0];

    // Delete payment
    await client.query('DELETE FROM payments WHERE payment_id = $1', [paymentId]);

    // Get bill details
    const billResult = await client.query(
      'SELECT * FROM billing WHERE bill_id = $1',
      [payment.bill_id]
    );

    const bill = billResult.rows[0];

    // Recalculate bill amounts
    const newPaidAmount = parseFloat(bill.paid_amount) - parseFloat(payment.amount);
    const newBalanceAmount = parseFloat(bill.total_amount) - newPaidAmount;
    
    let paymentStatus = 'unpaid';
    if (newPaidAmount > 0) {
      paymentStatus = newBalanceAmount > 0.01 ? 'partially_paid' : 'fully_paid';
    }

    // Update bill
    await client.query(
      `UPDATE billing SET 
        paid_amount = $1, 
        balance_amount = $2, 
        payment_status = $3,
        updated_by = $4
      WHERE bill_id = $5`,
      [newPaidAmount, newBalanceAmount, paymentStatus, userId, payment.bill_id]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Payment deleted successfully' };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get payment count
 */
export const getPaymentCount = async () => {
  const result = await pool.query('SELECT COUNT(*) as count FROM payments');
  return parseInt(result.rows[0].count);
};
