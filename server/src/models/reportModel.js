import pool from '../config/database.js';

class ReportModel {
  // Financial Reports

  /**
   * Get revenue summary for a date range
   */
  static async getRevenueSummary(startDate, endDate) {
    const query = `
      SELECT
        DATE(b.bill_date) as date,
        COUNT(DISTINCT b.bill_id) as total_invoices,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_paid,
        SUM(b.balance_amount) as total_outstanding,
        COUNT(CASE WHEN b.payment_status = 'fully_paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN b.payment_status = 'partially_paid' THEN 1 END) as partial_invoices,
        COUNT(CASE WHEN b.payment_status = 'unpaid' THEN 1 END) as unpaid_invoices,
        COUNT(CASE WHEN b.payment_status = 'overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN b.payment_status = 'refunded' THEN 1 END) as refunded_invoices
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY DATE(b.bill_date)
      ORDER BY date DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get payment summary by payment method (sourced from billing table)
   */
  static async getPaymentsByMethod(startDate, endDate) {
    const query = `
      SELECT
        COALESCE(b.payment_method, 'not_specified') as payment_method,
        COUNT(*) as transaction_count,
        SUM(b.paid_amount) as total_amount,
        ROUND(SUM(b.paid_amount) / NULLIF(SUM(SUM(b.paid_amount)) OVER (), 0) * 100, 2) as percentage
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
        AND b.paid_amount > 0
      GROUP BY b.payment_method
      ORDER BY total_amount DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get outstanding balances report for bills created within the date range
   */
  static async getOutstandingBalances(startDate, endDate) {
    const query = `
      SELECT
        b.bill_id,
        b.bill_date,
        b.due_date,
        c.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone,
        b.total_amount,
        b.paid_amount,
        b.balance_amount as outstanding_amount,
        b.payment_status,
        CASE
          WHEN b.due_date < CURRENT_DATE THEN 'OVERDUE'
          WHEN b.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'DUE_SOON'
          ELSE 'CURRENT'
        END as urgency
      FROM billing b
      JOIN customers c ON b.customer_id = c.customer_id
      WHERE b.payment_status != 'fully_paid'
        AND b.balance_amount > 0
        AND b.bill_date BETWEEN $1 AND $2
      ORDER BY b.due_date ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get revenue by service type
   */
  static async getRevenueByService(startDate, endDate) {
    const query = `
      SELECT 
        bi.item_type as service_type,
        COUNT(*) as service_count,
        SUM(bi.total_price) as total_revenue,
        AVG(bi.total_price) as average_amount
      FROM billing_items bi
      JOIN billing b ON bi.bill_id = b.bill_id
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY bi.item_type
      ORDER BY total_revenue DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  // Operational Reports

  /**
   * Get appointment statistics
   */
  static async getAppointmentStats(startDate, endDate) {
    const query = `
      SELECT 
        DATE(a.appointment_date) as date,
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows,
        ROUND(
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 2
        ) as completion_rate
      FROM appointments a
      WHERE a.appointment_date BETWEEN $1 AND $2
      GROUP BY DATE(a.appointment_date)
      ORDER BY date DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get appointment distribution by type
   */
  static async getAppointmentsByType(startDate, endDate) {
    const query = `
      SELECT 
        a.appointment_type,
        COUNT(*) as appointment_count,
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM appointments 
          WHERE appointment_date BETWEEN $1 AND $2) * 100, 2) as percentage
      FROM appointments a
      WHERE a.appointment_date BETWEEN $1 AND $2
      GROUP BY a.appointment_type
      ORDER BY appointment_count DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get patient visit statistics — per-pet breakdown for the date range
   */
  static async getPatientVisitStats(startDate, endDate) {
    const query = `
      SELECT
        p.pet_name,
        p.species,
        COALESCE(p.breed, '-') as breed,
        c.first_name || ' ' || c.last_name as owner_name,
        c.phone as owner_phone,
        COUNT(a.appointment_id) as total_visits,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_visits,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_visits,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows,
        MIN(a.appointment_date) as first_visit,
        MAX(a.appointment_date) as last_visit
      FROM appointments a
      JOIN pets p ON a.pet_id = p.pet_id
      JOIN customers c ON p.customer_id = c.customer_id
      WHERE a.appointment_date BETWEEN $1 AND $2
      GROUP BY p.pet_id, p.pet_name, p.species, p.breed, c.first_name, c.last_name, c.phone
      ORDER BY total_visits DESC, p.pet_name ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get inventory usage report grouped by category
   */
  static async getInventoryUsage(startDate, endDate) {
    const query = `
      SELECT
        i.category,
        COUNT(DISTINCT i.item_id) as total_items,
        COALESCE(SUM(usage.quantity_used), 0) as total_quantity_used,
        COALESCE(SUM(usage.quantity_used * i.selling_price), 0) as total_value_used,
        SUM(i.quantity) as total_current_stock,
        COALESCE(SUM(i.quantity * i.selling_price), 0) as total_stock_value,
        COUNT(CASE WHEN i.quantity <= i.reorder_level THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN i.quantity = 0 THEN 1 END) as out_of_stock_items
      FROM inventory i
      LEFT JOIN (
        SELECT
          bi.item_id,
          SUM(bi.quantity) as quantity_used
        FROM billing_items bi
        JOIN billing b ON bi.bill_id = b.bill_id
        WHERE bi.item_type = 'inventory_item'
          AND b.bill_date BETWEEN $1 AND $2
        GROUP BY bi.item_id
      ) usage ON i.item_id = usage.item_id
      GROUP BY i.category
      ORDER BY total_value_used DESC, i.category ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get top customers by revenue
   */
  static async getTopCustomers(startDate, endDate, limit = 10) {
    const query = `
      SELECT 
        c.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone,
        c.email,
        COUNT(DISTINCT b.bill_id) as total_invoices,
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        SUM(b.total_amount) as total_spent,
        SUM(b.paid_amount) as total_paid,
        ROUND(AVG(b.total_amount), 2) as avg_invoice_amount
      FROM customers c
      LEFT JOIN billing b ON c.customer_id = b.customer_id 
        AND b.bill_date BETWEEN $1 AND $2
      LEFT JOIN appointments a ON c.customer_id = a.customer_id 
        AND a.appointment_date BETWEEN $1 AND $2
      WHERE b.bill_id IS NOT NULL
      GROUP BY c.customer_id, c.first_name, c.last_name, c.phone, c.email
      ORDER BY total_spent DESC
      LIMIT $3
    `;
    const result = await pool.query(query, [startDate, endDate, limit]);
    return result.rows;
  }

  /**
   * Get dashboard summary statistics
   */
  static async getDashboardSummary(startDate, endDate) {
    try {
      // Break down the query into separate parts for better error handling
      const financialQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(paid_amount), 0) as total_collected,
          COALESCE(SUM(balance_amount), 0) as total_outstanding
        FROM billing 
        WHERE bill_date BETWEEN $1 AND $2
      `;

      const appointmentsQuery = `
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(DISTINCT pet_id) as unique_patients,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM appointments 
        WHERE appointment_date BETWEEN $1 AND $2
      `;

      const inventoryQuery = `
        SELECT 
          COUNT(CASE WHEN quantity <= reorder_level THEN 1 END) as low_stock_items,
          COALESCE(SUM(quantity * selling_price), 0) as total_inventory_value
        FROM inventory
      `;

      const [financialResult, appointmentsResult, inventoryResult] = await Promise.all([
        pool.query(financialQuery, [startDate, endDate]),
        pool.query(appointmentsQuery, [startDate, endDate]),
        pool.query(inventoryQuery)
      ]);

      return {
        ...financialResult.rows[0],
        ...appointmentsResult.rows[0],
        ...inventoryResult.rows[0]
      };
    } catch (error) {
      console.error('Error in getDashboardSummary:', error);
      throw error;
    }
  }

  /**
   * Get monthly revenue trend grouped by month for the given date range
   */
  static async getMonthlyRevenueTrend(startDate, endDate) {
    const query = `
      SELECT
        TO_CHAR(b.bill_date, 'YYYY-MM') as month,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(b.bill_date, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get annual income report grouped by year for the selected date range
   */
  static async getAnnualIncomeReport(startDate, endDate) {
    const query = `
      SELECT
        EXTRACT(YEAR FROM b.bill_date)::integer as year,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected,
        SUM(b.balance_amount) as total_outstanding,
        COUNT(DISTINCT b.customer_id) as unique_customers,
        ROUND(AVG(b.total_amount), 2) as avg_invoice_amount
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY EXTRACT(YEAR FROM b.bill_date)
      ORDER BY year ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get customer growth report
   */
  static async getCustomerGrowthReport(startDate, endDate) {
    const query = `
      SELECT 
        DATE(c.created_at) as registration_date,
        COUNT(*) as new_customers,
        SUM(COUNT(*)) OVER (ORDER BY DATE(c.created_at)) as cumulative_customers
      FROM customers c
      WHERE DATE(c.created_at) BETWEEN $1 AND $2
      GROUP BY DATE(c.created_at)
      ORDER BY registration_date ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get veterinarian performance report
   */
  static async getVeterinarianPerformance(startDate, endDate) {
    const query = `
      WITH vet_bills AS (
        SELECT DISTINCT ON (b.bill_id)
          b.bill_id,
          b.paid_amount,
          a.veterinarian_id
        FROM billing b
        JOIN appointments a ON (
          (b.appointment_id IS NOT NULL AND b.appointment_id = a.appointment_id)
          OR (b.appointment_id IS NULL AND b.customer_id = a.customer_id AND b.bill_date = a.appointment_date)
        )
        WHERE b.bill_date BETWEEN $1 AND $2
          AND a.appointment_date BETWEEN $1 AND $2
          AND a.veterinarian_id IS NOT NULL
        ORDER BY b.bill_id, a.appointment_id
      )
      SELECT
        u.user_id,
        u.first_name || ' ' || u.last_name as veterinarian_name,
        u.role,
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        ROUND(
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as completion_rate,
        COUNT(DISTINCT a.pet_id) as unique_patients,
        COUNT(DISTINCT mr.record_id) as medical_records_created,
        COALESCE(SUM(vb.paid_amount), 0) as total_revenue_generated
      FROM users u
      LEFT JOIN appointments a ON u.user_id = a.veterinarian_id
        AND a.appointment_date BETWEEN $1 AND $2
      LEFT JOIN medical_records mr ON u.user_id = mr.veterinarian_id
        AND mr.visit_date BETWEEN $1 AND $2
      LEFT JOIN vet_bills vb ON vb.veterinarian_id = u.user_id
      WHERE u.role = 'veterinarian'
      GROUP BY u.user_id, u.first_name, u.last_name, u.role
      ORDER BY total_appointments DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get monthly income breakdown for the selected date range
   */
  static async getMonthlyIncomeReport(startDate, endDate) {
    const query = `
      SELECT
        TO_CHAR(MIN(b.bill_date), 'Month YYYY') as month,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected,
        SUM(b.balance_amount) as total_due
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY TO_CHAR(b.bill_date, 'YYYY-MM')
      ORDER BY TO_CHAR(b.bill_date, 'YYYY-MM') ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);

    const summaryQuery = `
      SELECT
        COUNT(*) as total_invoices,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected,
        SUM(b.balance_amount) as total_outstanding,
        ROUND(AVG(b.total_amount), 2) as avg_invoice_amount
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
    `;
    const summaryResult = await pool.query(summaryQuery, [startDate, endDate]);

    return {
      dailyBreakdown: result.rows,
      summary: summaryResult.rows[0]
    };
  }
}

export default ReportModel;
