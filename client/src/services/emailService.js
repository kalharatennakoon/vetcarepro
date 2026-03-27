import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const sendAppointmentConfirmationEmail = async (appointmentId, note = '') => {
  const res = await axios.post(`${API_URL}/email/appointment/${appointmentId}/confirm`, { note: note || null }, getAuthHeader());
  return res.data;
};

export const sendInvoiceEmail = async (billId, note = '') => {
  const res = await axios.post(`${API_URL}/email/billing/${billId}/send`, { note: note || null }, getAuthHeader());
  return res.data;
};

export const sendCustomerEmail = async ({ customerId, subject, message }) => {
  const res = await axios.post(`${API_URL}/email/send`, {
    customer_id: customerId,
    subject,
    message
  }, getAuthHeader());
  return res.data;
};
