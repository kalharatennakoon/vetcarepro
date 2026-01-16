import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Billing Service
 * API calls for billing and payment management
 */

/**
 * Get all bills
 */
export const getBills = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.payment_status) params.append('payment_status', filters.payment_status);
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(`${API_URL}/billing?${params.toString()}`);
  return response.data;
};

/**
 * Get bill by ID
 */
export const getBillById = async (id) => {
  const response = await axios.get(`${API_URL}/billing/${id}`);
  return response.data;
};

/**
 * Create new bill
 */
export const createBill = async (billData) => {
  const response = await axios.post(`${API_URL}/billing`, billData);
  return response.data;
};

/**
 * Update bill
 */
export const updateBill = async (id, billData) => {
  const response = await axios.put(`${API_URL}/billing/${id}`, billData);
  return response.data;
};

/**
 * Record payment for a bill
 */
export const recordPayment = async (billId, paymentData) => {
  const response = await axios.post(`${API_URL}/billing/${billId}/payments`, paymentData);
  return response.data;
};

/**
 * Get revenue statistics
 */
export const getRevenueStats = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);

  const response = await axios.get(`${API_URL}/billing/stats/revenue?${params.toString()}`);
  return response.data;
};

/**
 * Get overdue bills
 */
export const getOverdueBills = async () => {
  const response = await axios.get(`${API_URL}/billing/overdue`);
  return response.data;
};

/**
 * Delete bill
 */
export const deleteBill = async (id) => {
  const response = await axios.delete(`${API_URL}/billing/${id}`);
  return response.data;
};

/**
 * Get all payments
 */
export const getPayments = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.bill_id) params.append('bill_id', filters.bill_id);
  if (filters.payment_method) params.append('payment_method', filters.payment_method);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.received_by) params.append('received_by', filters.received_by);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await axios.get(`${API_URL}/payments?${params.toString()}`);
  return response.data;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (id) => {
  const response = await axios.get(`${API_URL}/payments/${id}`);
  return response.data;
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);

  const response = await axios.get(`${API_URL}/payments/stats/summary?${params.toString()}`);
  return response.data;
};
