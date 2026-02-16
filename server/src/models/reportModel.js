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
        COUNT(CASE WHEN b.payment_status = 'unpaid' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN b.payment_status = 'overdue' THEN 1 END) as overdue_invoices
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY DATE(b.bill_date)
      ORDER BY date DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get payment summary by payment method
   */
  static async getPaymentsByMethod(startDate, endDate) {
    const query = `
      SELECT 
        p.payment_method,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
      GROUP BY p.payment_method
      ORDER BY total_amount DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get outstanding balances report
   */
  static async getOutstandingBalances() {
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
      ORDER BY b.due_date ASC
    `;
    const result = await pool.query(query);
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
        COUNT(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled,
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
   * Get patient visit statistics
   */
  static async getPatientVisitStats(startDate, endDate) {
    const query = `
      SELECT 
        COUNT(DISTINCT p.pet_id) as total_patients,
        COUNT(DISTINCT a.appointment_id) as total_visits,
        COUNT(DISTINCT p.customer_id) as unique_customers,
        ROUND(COUNT(a.appointment_id)::numeric / NULLIF(COUNT(DISTINCT p.pet_id), 0), 2) as avg_visits_per_patient
      FROM appointments a
      JOIN pets p ON a.pet_id = p.pet_id
      WHERE a.appointment_date BETWEEN $1 AND $2
        AND a.status = 'completed'
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0];
  }

  /**
   * Get inventory usage report
   */
  static async getInventoryUsage(startDate, endDate) {
    const query = `
      SELECT 
        i.item_id as inventory_id,
        i.item_name,
        i.category,
        i.quantity as current_stock,
        i.reorder_level,
        i.selling_price as unit_price,
        COALESCE(usage.quantity_used, 0) as quantity_used,
        COALESCE(usage.quantity_used * i.selling_price, 0) as value_used,
        CASE 
          WHEN i.quantity <= i.reorder_level THEN 'LOW_STOCK'
          WHEN i.quantity <= i.reorder_level * 1.5 THEN 'REORDER_SOON'
          ELSE 'IN_STOCK'
        END as stock_status
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
      WHERE i.quantity IS NOT NULL
      ORDER BY value_used DESC
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
   * Get monthly revenue trend (for the last 12 months)
   */
  static async getMonthlyRevenueTrend() {
    const query = `
      SELECT 
        TO_CHAR(b.bill_date, 'YYYY-MM') as month,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected
      FROM billing b
      WHERE b.bill_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(b.bill_date, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get annual income report
   */
  static async getAnnualIncomeReport(year) {
    const query = `
      SELECT 
        TO_CHAR(b.bill_date, 'Month') as month,
        EXTRACT(MONTH FROM b.bill_date) as month_num,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.paid_amount) as total_collected,
        SUM(b.balance_amount) as total_outstanding,
        COUNT(DISTINCT b.customer_id) as unique_customers,
        ROUND(AVG(b.total_amount), 2) as avg_invoice_amount
      FROM billing b
      WHERE EXTRACT(YEAR FROM b.bill_date) = $1
      GROUP BY EXTRACT(MONTH FROM b.bill_date), TO_CHAR(b.bill_date, 'Month')
      ORDER BY month_num ASC
    `;
    const result = await pool.query(query, [year]);
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
        COALESCE(SUM(b.total_amount), 0) as total_revenue_generated
      FROM users u
      LEFT JOIN appointments a ON u.user_id = a.veterinarian_id 
        AND a.appointment_date BETWEEN $1 AND $2
      LEFT JOIN medical_records mr ON u.user_id = mr.created_by 
        AND mr.visit_date BETWEEN $1 AND $2
      LEFT JOIN billing b ON a.appointment_id = b.appointment_id
        AND b.bill_date BETWEEN $1 AND $2
      WHERE u.role = 'veterinarian'
      GROUP BY u.user_id, u.first_name, u.last_name, u.role
      ORDER BY total_appointments DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get monthly income report
   */
  static async getMonthlyIncomeReport(month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    const query = `
      SELECT 
        DATE(b.bill_date) as date,
        COUNT(*) as invoice_count,
        SUM(b.total_amount) as daily_revenue,
        SUM(b.paid_amount) as daily_collected
      FROM billing b
      WHERE b.bill_date BETWEEN $1 AND $2
      GROUP BY DATE(b.bill_date)
      ORDER BY date ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    
    // Also get summary totals
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
