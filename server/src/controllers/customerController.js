import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  checkCustomerDeletability,
  inactivateCustomer,
  hardDeleteCustomer,
  phoneExists,
  getCustomerCount
} from '../models/customerModel.js';
import { logAuditEntry } from '../models/diseaseCaseModel.js';

/**
 * Customer Controller
 * Handles CRUD operations for customers
 */

/**
 * @route   GET /api/customers
 * @desc    Get all customers with filters
 * @access  Private
 */
export const getCustomers = async (req, res) => {
  try {
    const { search, is_active, city, limit, offset } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (city) filters.city = city;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const customers = await getAllCustomers(filters);
    const totalCount = await getCustomerCount();

    res.status(200).json({
      status: 'success',
      results: customers.length,
      total: totalCount,
      data: {
        customers
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching customers'
    });
  }
};

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID with pets
 * @access  Private
 */
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        customer
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching customer'
    });
  }
};

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
export const createNewCustomer = async (req, res) => {
  try {
    const customerData = req.body;

    // Check if phone already exists
    if (await phoneExists(customerData.phone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number already exists'
      });
    }

    const newCustomer = await createCustomer(customerData, req.user.user_id);

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'CREATE',
      tableName: 'customers',
      recordId: newCustomer.customer_id,
      oldValues: null,
      newValues: { first_name: newCustomer.first_name, last_name: newCustomer.last_name, phone: newCustomer.phone, email: newCustomer.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: {
        customer: newCustomer
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating customer'
    });
  }
};

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
export const updateCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = req.body;

    // Check if customer exists
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Check if phone is being changed and if it already exists
    if (customerData.phone && customerData.phone !== existingCustomer.phone) {
      if (await phoneExists(customerData.phone, id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number already exists'
        });
      }
    }

    const updatedCustomer = await updateCustomer(
      id,
      customerData,
      req.user.user_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Customer updated successfully',
      data: {
        customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating customer'
    });
  }
};

/**
 * @route   DELETE /api/customers/:id
 * @desc    Hard delete customer (admin only, no related data)
 * @access  Private (Admin only)
 */
export const deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }

    const data = await checkCustomerDeletability(id);

    if (data.active_appointments > 0) {
      return res.status(409).json({
        status: 'error',
        message: `Cannot delete customer with ${data.active_appointments} active appointment(s). Please cancel or complete them first.`
      });
    }

    const hasRelatedData = data.total_appointments > 0 || data.medical_records > 0 || data.vaccinations > 0 || data.billing_records > 0;
    if (hasRelatedData) {
      return res.status(409).json({
        status: 'error',
        message: 'Customer has related records and cannot be permanently deleted. Use inactivation instead.'
      });
    }

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'DELETE',
      tableName: 'customers',
      recordId: parseInt(id),
      oldValues: existingCustomer,
      newValues: null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await hardDeleteCustomer(id);
    res.status(200).json({ status: 'success', message: 'Customer permanently deleted' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting customer' });
  }
};

export const getCustomerDeletabilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    const data = await checkCustomerDeletability(id);
    const hasRelatedData = data.total_appointments > 0 || data.medical_records > 0 || data.vaccinations > 0 || data.billing_records > 0;
    res.status(200).json({
      status: 'success',
      data: {
        activeAppointments: data.active_appointments,
        hasRelatedData,
        counts: {
          appointments: data.total_appointments,
          medicalRecords: data.medical_records,
          vaccinations: data.vaccinations,
          billingRecords: data.billing_records,
          pets: data.total_pets
        }
      }
    });
  } catch (error) {
    console.error('Check customer deletability error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred' });
  }
};

export const inactivateCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, additional_note } = req.body;

    if (!reason) {
      return res.status(400).json({ status: 'error', message: 'Reason is required' });
    }

    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }

    const data = await checkCustomerDeletability(id);
    if (data.active_appointments > 0) {
      return res.status(409).json({
        status: 'error',
        message: `Cannot inactivate customer with ${data.active_appointments} active appointment(s). Please cancel or complete them first.`
      });
    }

    const updatedCustomer = await inactivateCustomer(id, { reason, additionalNote: additional_note }, req.user.user_id);

    await logAuditEntry({
      userId: req.user.user_id,
      action: 'INACTIVATE',
      tableName: 'customers',
      recordId: parseInt(id),
      oldValues: { is_active: true },
      newValues: { is_active: false, reason, additional_note: additional_note || null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      status: 'success',
      message: 'Customer inactivated successfully',
      data: { customer: updatedCustomer }
    });
  } catch (error) {
    console.error('Inactivate customer error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while inactivating customer' });
  }
};