import pool from '../config/database.js';

/**
 * @route   GET /api/search?q=query
 * @desc    Universal search — role-gated results
 *   All roles:              customers, pets, appointments
 *   Admin + Receptionist:  billing, inventory
 *   Admin + Vet:           medical records
 * @access  Private
 */
export const universalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(200).json({
        status: 'success',
        data: { customers: [], pets: [], appointments: [], billing: [], inventory: [], medicalRecords: [], diseaseCases: [], staff: [], suppliers: [] }
      });
    }

    const pattern = `%${q}%`;
    const role = req.user.role;
    const canAccessBillingInventory = role === 'admin' || role === 'receptionist';
    const canAccessMedicalRecords   = role === 'admin' || role === 'veterinarian';
    const canAccessDiseaseCases     = role === 'admin' || role === 'veterinarian';
    const canAccessStaff            = role === 'admin';

    const [customers, pets, appointments, billing, inventory, medicalRecords, diseaseCases, staff, suppliers] = await Promise.all([
      // Customers — all roles
      pool.query(`
        SELECT customer_id, first_name, last_name, phone, email
        FROM customers
        WHERE is_active = true AND (
          first_name ILIKE $1 OR last_name ILIKE $1 OR
          CONCAT(first_name, ' ', last_name) ILIKE $1
        )
        ORDER BY first_name, last_name
        LIMIT 5
      `, [pattern]),

      // Pets — all roles
      pool.query(`
        SELECT p.pet_id, p.pet_name, p.species, p.breed,
               c.first_name || ' ' || c.last_name AS owner_name
        FROM pets p
        LEFT JOIN customers c ON p.customer_id = c.customer_id
        WHERE p.is_active = true AND p.pet_name ILIKE $1
        ORDER BY p.pet_name
        LIMIT 5
      `, [pattern]),

      // Appointments — all roles
      pool.query(`
        SELECT a.appointment_id, a.appointment_date, a.appointment_time,
               a.status, a.appointment_type,
               p.pet_name,
               c.first_name || ' ' || c.last_name AS customer_name
        FROM appointments a
        LEFT JOIN pets p ON a.pet_id = p.pet_id
        LEFT JOIN customers c ON a.customer_id = c.customer_id
        WHERE (
          p.pet_name ILIKE $1 OR
          c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $1 OR
          a.appointment_type ILIKE $1
        )
        ORDER BY a.appointment_date DESC
        LIMIT 5
      `, [pattern]),

      // Billing — admin/receptionist only
      canAccessBillingInventory
        ? pool.query(`
            SELECT b.bill_id, b.bill_number, b.total_amount, b.payment_status, b.bill_date,
                   c.first_name || ' ' || c.last_name AS customer_name
            FROM billing b
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE (
              b.bill_number ILIKE $1 OR
              c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR
              CONCAT(c.first_name, ' ', c.last_name) ILIKE $1
            )
            ORDER BY b.bill_date DESC
            LIMIT 5
          `, [pattern])
        : { rows: [] },

      // Inventory — admin/receptionist only
      canAccessBillingInventory
        ? pool.query(`
            SELECT item_id, item_name, item_code, category, quantity, unit
            FROM inventory
            WHERE is_active = true AND (
              item_name ILIKE $1 OR item_code ILIKE $1 OR category ILIKE $1
            )
            ORDER BY item_name
            LIMIT 5
          `, [pattern])
        : { rows: [] },

      // Medical Records — admin/vet only
      canAccessMedicalRecords
        ? pool.query(`
            SELECT mr.record_id, mr.diagnosis, mr.visit_date, mr.chief_complaint,
                   p.pet_name,
                   c.first_name || ' ' || c.last_name AS owner_name
            FROM medical_records mr
            LEFT JOIN pets p ON mr.pet_id = p.pet_id
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            WHERE (
              p.pet_name ILIKE $1 OR
              mr.diagnosis ILIKE $1 OR
              mr.chief_complaint ILIKE $1
            )
            ORDER BY mr.visit_date DESC
            LIMIT 5
          `, [pattern])
        : { rows: [] },

      // Disease Cases — admin/vet only
      canAccessDiseaseCases
        ? pool.query(`
            SELECT dc.case_id, dc.disease_name, dc.disease_category, dc.outcome, dc.diagnosis_date,
                   p.pet_name,
                   c.first_name || ' ' || c.last_name AS owner_name
            FROM disease_cases dc
            LEFT JOIN pets p ON dc.pet_id = p.pet_id
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            WHERE (
              dc.disease_name ILIKE $1 OR
              dc.disease_category ILIKE $1 OR
              p.pet_name ILIKE $1 OR
              c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR
              CONCAT(c.first_name, ' ', c.last_name) ILIKE $1
            )
            ORDER BY dc.diagnosis_date DESC
            LIMIT 5
          `, [pattern])
        : { rows: [] },

      // Staff — admin only
      canAccessStaff
        ? pool.query(`
            SELECT user_id, first_name, last_name, email, phone, role, specialization
            FROM users
            WHERE is_active = true AND (
              first_name ILIKE $1 OR last_name ILIKE $1 OR
              CONCAT(first_name, ' ', last_name) ILIKE $1 OR
              email ILIKE $1 OR role ILIKE $1 OR
              specialization ILIKE $1
            )
            ORDER BY first_name, last_name
            LIMIT 5
          `, [pattern])
        : { rows: [] },

      // Suppliers — admin only
      canAccessStaff
        ? pool.query(`
            SELECT supplier, supplier_contact,
                   COUNT(*) AS item_count,
                   STRING_AGG(item_name, ', ' ORDER BY item_name) AS items
            FROM inventory
            WHERE is_active = true AND supplier IS NOT NULL AND supplier ILIKE $1
            GROUP BY supplier, supplier_contact
            ORDER BY supplier
            LIMIT 5
          `, [pattern])
        : { rows: [] }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        customers: customers.rows,
        pets: pets.rows,
        appointments: appointments.rows,
        billing: billing.rows,
        inventory: inventory.rows,
        medicalRecords: medicalRecords.rows,
        diseaseCases: diseaseCases.rows,
        staff: staff.rows,
        suppliers: suppliers.rows
      }
    });
  } catch (error) {
    console.error('Universal search error:', error);
    res.status(500).json({ status: 'error', message: 'Search failed' });
  }
};
