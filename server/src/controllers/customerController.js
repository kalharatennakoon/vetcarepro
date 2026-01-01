import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  phoneExists,
  getCustomerCount
} from '../models/customerModel.js';

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
      if (await phoneExists(customerData.phone, parseInt(id))) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number already exists'
        });
      }
    }

    const updatedCustomer = await updateCustomer(
      parseInt(id),
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
 * @desc    Delete customer (soft delete)
 * @access  Private
 */
export const deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    await deleteCustomer(parseInt(id));

    res.status(200).json({
      status: 'success',
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting customer'
    });
  }
};