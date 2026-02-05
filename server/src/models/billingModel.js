import pool from '../config/database.js';

/**
 * Billing Model
 * Database operations for billing and billing_items tables
 */

/**
 * Generate unique bill number with format: INV-YYYYMMDD-XXXXX
 */
const generateBillNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // Generate 5 random digits
  const randomSuffix = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  
  const billNumber = `INV-${datePrefix}-${randomSuffix}`;
  
  // Check if this number already exists (very unlikely but let's be safe)
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM billing WHERE bill_number = $1',
    [billNumber]
  );
  
  // If by chance it exists, generate a new one
  if (parseInt(result.rows[0].count) > 0) {
    return generateBillNumber(); // Recursively try again
  }
  
  return billNumber;
};

/**
 * Get all bills with optional filters
 */
export const getAllBills = async (filters = {}) => {
  let query = `
    SELECT b.*,
           c.first_name || ' ' || c.last_name as customer_name,
           c.phone as customer_phone,
           u.first_name || ' ' || u.last_name as created_by_name
    FROM billing b
    JOIN customers c ON b.customer_id = c.customer_id
    LEFT JOIN users u ON b.created_by = u.user_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;

  // Search by bill number, customer name, or phone
  if (filters.search) {
    query += ` AND (
      b.bill_number ILIKE $${paramCount} OR 
      c.first_name ILIKE $${paramCount} OR 
      c.last_name ILIKE $${paramCount} OR
      c.phone ILIKE $${paramCount}
    )`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  // Filter by payment status
  if (filters.payment_status) {
    query += ` AND b.payment_status = $${paramCount}`;
    params.push(filters.payment_status);
    paramCount++;
  }

  // Filter by customer
  if (filters.customer_id) {
    query += ` AND b.customer_id = $${paramCount}`;
    params.push(filters.customer_id);
    paramCount++;
  }

  // Filter by date range
  if (filters.from_date) {
    query += ` AND b.bill_date >= $${paramCount}`;
    params.push(filters.from_date);
    paramCount++;
  }

  if (filters.to_date) {
    query += ` AND b.bill_date <= $${paramCount}`;
    params.push(filters.to_date);
    paramCount++;
  }

  query += ` ORDER BY b.bill_date DESC, b.created_at DESC`;

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
 * Get bill by ID with items and payments
 */
export const getBillById = async (billId) => {
  const billQuery = `
    SELECT b.*,
           c.first_name || ' ' || c.last_name as customer_name,
           c.email as customer_email,
           c.phone as customer_phone,
           c.address as customer_address,
           u.first_name || ' ' || u.last_name as created_by_name
    FROM billing b
    JOIN customers c ON b.customer_id = c.customer_id
    LEFT JOIN users u ON b.created_by = u.user_id
    WHERE b.bill_id = $1
  `;
  
  const itemsQuery = `
    SELECT * FROM billing_items 
    WHERE bill_id = $1
    ORDER BY billing_item_id
  `;

  let paymentsResult = { rows: [] };
  
  // Try to fetch payments if table exists
  try {
    const paymentsQuery = `
      SELECT p.*,
             u.first_name || ' ' || u.last_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.user_id
      WHERE p.bill_id = $1
      ORDER BY p.payment_date DESC
    `;
    paymentsResult = await pool.query(paymentsQuery, [billId]);
  } catch (error) {
    // Payments table not found, skipping payment history
  }

  const [billResult, itemsResult] = await Promise.all([
    pool.query(billQuery, [billId]),
    pool.query(itemsQuery, [billId])
  ]);

  if (billResult.rows.length === 0) {
    return null;
  }

  return {
    ...billResult.rows[0],
    items: itemsResult.rows,
    payments: paymentsResult.rows
  };
};

/**
 * Create new bill with items
 */
export const createBill = async (billData, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate bill number
    const billNumber = await generateBillNumber();

    // Calculate totals
    const subtotal = billData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price - (item.discount || 0)), 0
    );
    
    const discountAmount = billData.discount_percentage 
      ? (subtotal * billData.discount_percentage / 100) 
      : (billData.discount_amount || 0);
    
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = billData.tax_percentage 
      ? (taxableAmount * billData.tax_percentage / 100) 
      : 0;
    
    const totalAmount = taxableAmount + taxAmount;
    const balanceAmount = totalAmount - (billData.paid_amount || 0);

    // Determine payment status
    let paymentStatus = 'unpaid';
    if (billData.paid_amount > 0) {
      if (billData.paid_amount >= totalAmount) {
        paymentStatus = 'fully_paid';
      } else {
        paymentStatus = 'partially_paid';
      }
    }

    // Insert bill
    const billQuery = `
      INSERT INTO billing (
        bill_number, customer_id, appointment_id, bill_date, due_date,
        subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount,
        total_amount, paid_amount, balance_amount, payment_status,
        payment_method, payment_reference, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const billValues = [
      billNumber,
      billData.customer_id,
      billData.appointment_id || null,
      billData.bill_date || new Date(),
      billData.due_date || null,
      subtotal,
      billData.discount_percentage || 0,
      discountAmount,
      billData.tax_percentage || 0,
      taxAmount,
      totalAmount,
      billData.paid_amount || 0,
      balanceAmount,
      paymentStatus,
      billData.payment_method || null,
      billData.payment_reference || null,
      billData.notes || null,
      userId
    ];

    const billResult = await client.query(billQuery, billValues);
    const newBill = billResult.rows[0];

    // Insert bill items
    for (const item of billData.items) {
      const itemTotal = item.quantity * item.unit_price - (item.discount || 0);
      
      const itemQuery = `
        INSERT INTO billing_items (
          bill_id, item_type, item_id, item_name, quantity, 
          unit_price, discount, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const itemValues = [
        newBill.bill_id,
        item.item_type,
        item.item_id || null,
        item.item_name,
        item.quantity,
        item.unit_price,
        item.discount || 0,
        itemTotal
      ];

      await client.query(itemQuery, itemValues);

      // If it's an inventory item, decrease stock
      if (item.item_type === 'inventory_item' && item.item_id) {
        await client.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE item_id = $2',
          [item.quantity, item.item_id]
        );
      }
    }

    // If paid amount > 0, create payment record
    if (billData.paid_amount > 0) {
      const paymentQuery = `
        INSERT INTO payments (
          bill_id, payment_date, amount, payment_method, 
          payment_reference, card_type, bank_name, notes, 
          received_by, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const paymentValues = [
        newBill.bill_id,
        new Date(),
        billData.paid_amount,
        billData.payment_method,
        billData.payment_reference || null,
        billData.card_type || null,
        billData.bank_name || null,
        billData.payment_notes || null,
        userId,
        userId
      ];

      await client.query(paymentQuery, paymentValues);
    }

    await client.query('COMMIT');
    return newBill;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update bill
 */
export const updateBill = async (billId, billData, userId) => {
  const query = `
    UPDATE billing SET
      due_date = $1,
      discount_percentage = $2,
      discount_amount = $3,
      tax_percentage = $4,
      notes = $5,
      updated_by = $6
    WHERE bill_id = $7
    RETURNING *
  `;

  const values = [
    billData.due_date || null,
    billData.discount_percentage || 0,
    billData.discount_amount || 0,
    billData.tax_percentage || 0,
    billData.notes || null,
    userId,
    billId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Record payment for a bill
 */
export const recordPayment = async (billId, paymentData, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get current bill status
    const billResult = await client.query(
      'SELECT * FROM billing WHERE bill_id = $1',
      [billId]
    );

    if (billResult.rows.length === 0) {
      throw new Error('Bill not found');
    }

    const bill = billResult.rows[0];
    
    // Validate payment amount
    if (paymentData.amount > bill.balance_amount) {
      throw new Error('Payment amount exceeds balance amount');
    }

    // Insert payment record
    const paymentQuery = `
      INSERT INTO payments (
        bill_id, payment_date, amount, payment_method, 
        payment_reference, card_type, bank_name, notes, 
        received_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const paymentValues = [
      billId,
      paymentData.payment_date || new Date(),
      paymentData.amount,
      paymentData.payment_method,
      paymentData.payment_reference || null,
      paymentData.card_type || null,
      paymentData.bank_name || null,
      paymentData.notes || null,
      userId,
      userId
    ];

    const paymentResult = await client.query(paymentQuery, paymentValues);

    // Update bill amounts and status
    const newPaidAmount = parseFloat(bill.paid_amount) + parseFloat(paymentData.amount);
    const newBalanceAmount = parseFloat(bill.total_amount) - newPaidAmount;
    
    let paymentStatus = 'partially_paid';
    if (newBalanceAmount <= 0.01) { // Account for floating point precision
      paymentStatus = 'fully_paid';
    }

    await client.query(
      `UPDATE billing SET 
        paid_amount = $1, 
        balance_amount = $2, 
        payment_status = $3,
        payment_method = $4,
        updated_by = $5
      WHERE bill_id = $6`,
      [newPaidAmount, newBalanceAmount, paymentStatus, paymentData.payment_method, userId, billId]
    );

    await client.query('COMMIT');
    return paymentResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get bill count
 */
export const getBillCount = async () => {
  const result = await pool.query('SELECT COUNT(*) as count FROM billing');
  return parseInt(result.rows[0].count);
};

/**
 * Get revenue statistics
 */
export const getRevenueStats = async (filters = {}) => {
  let query = `
    SELECT 
      COUNT(*) as total_bills,
      SUM(total_amount) as total_revenue,
      SUM(paid_amount) as total_paid,
      SUM(balance_amount) as total_pending,
      COUNT(CASE WHEN payment_status = 'fully_paid' THEN 1 END) as paid_bills,
      COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_bills,
      COUNT(CASE WHEN payment_status = 'partially_paid' THEN 1 END) as partially_paid_bills
    FROM billing
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (filters.from_date) {
    query += ` AND bill_date >= $${paramCount}`;
    params.push(filters.from_date);
    paramCount++;
  }

  if (filters.to_date) {
    query += ` AND bill_date <= $${paramCount}`;
    params.push(filters.to_date);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Get overdue bills
 */
export const getOverdueBills = async () => {
  const query = `
    SELECT b.*,
           c.first_name || ' ' || c.last_name as customer_name,
           c.phone as customer_phone
    FROM billing b
    JOIN customers c ON b.customer_id = c.customer_id
    WHERE b.payment_status IN ('unpaid', 'partially_paid')
      AND b.due_date < CURRENT_DATE
    ORDER BY b.due_date ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Delete bill (soft delete - mark as cancelled)
 */
export const deleteBill = async (billId, userId) => {
  // Note: This is a soft delete. We update the status rather than actually deleting
  const query = `
    UPDATE billing SET
      payment_status = 'cancelled',
      notes = CONCAT(COALESCE(notes, ''), ' [CANCELLED]'),
      updated_by = $1
    WHERE bill_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [userId, billId]);
  return result.rows[0];
};
