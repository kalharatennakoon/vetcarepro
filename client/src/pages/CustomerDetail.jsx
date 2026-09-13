import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { checkCustomerDeletability, inactivateCustomer, deleteCustomer } from '../services/customerService';
import { sendCustomerEmail } from '../services/emailService';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';
import '../styles/CustomerDetailModern.css';

const CustomerDetail = () => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [showEditForm, setShowEditForm] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletability, setDeletability] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateNote, setDeactivateNote] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [emailSending, setEmailSending] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(response.data.data.customer);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id, API_URL]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const openDeleteModal = async () => {
    try {
      const response = await checkCustomerDeletability(id);
      setDeletability(response.data);
      setDeactivateReason('');
      setDeactivateNote('');
      setShowDeleteModal(true);
    } catch {
      showError('Failed to check customer status');
    }
  };

  const handleDelete = async () => {
    if (!deactivateReason) {
      showWarning('Please select a reason for deletion');
      return;
    }
    setDeleting(true);
    try {
      await deleteCustomer(id);
      showSuccess(`${customer.first_name} ${customer.last_name} has been permanently deleted`);
      navigate('/customers');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const handleInactivate = async () => {
    if (!deactivateReason) {
      showWarning('Please select a reason for inactivation');
      return;
    }
    setDeleting(true);
    try {
      await inactivateCustomer(id, {
        reason: deactivateReason,
        additional_note: deactivateNote || undefined
      });
      showSuccess(`${customer.first_name} ${customer.last_name} has been inactivated`);
      setShowDeleteModal(false);
      fetchCustomer();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to inactivate customer');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchCustomer();
  };

  const formatWhatsAppNumber = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.startsWith('0') ? '94' + digits.slice(1) : digits;
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) return;
    setEmailSending(true);
    try {
      const res = await sendCustomerEmail({
        customerId: customer.customer_id,
        subject: emailForm.subject,
        message: emailForm.message,
      });
      showSuccess(res.message || 'Email sent successfully');
      setEmailModal(false);
      setEmailForm({ subject: '', message: '' });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #4f46e5', borderRadius: '50%', width: '42px', height: '42px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
          <p>Loading customer details...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div ref={errorRef} style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>Error</h2>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={() => navigate('/customers')} className="cust-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 1.5rem 0' }}>Customer Not Found</h2>
          <button onClick={() => navigate('/customers')} className="cust-detail-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  if (showEditForm) {
    return (
      <Layout>
        <div className="cust-detail-container">
          <CustomerForm
            customerId={id}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="cust-detail-container">
        {/* Top Navigation & Action Bar */}
        <div className="cust-detail-top-nav">
          <button onClick={() => navigate('/customers')} className="cust-detail-back-btn">
            <i className="fas fa-arrow-left"></i>
            <span>Back to Customers</span>
          </button>
          <div className="cust-detail-actions">
            <button onClick={() => setShowEditForm(true)} className="cust-btn-edit">
              <i className="fas fa-edit"></i>
              <span>Edit Customer</span>
            </button>
            {(customer.is_active || user?.role === 'admin') && (
              <button onClick={openDeleteModal} className="cust-btn-delete">
                <i className="fas fa-trash"></i>
                <span>{!customer.is_active ? 'Delete' : user?.role === 'admin' ? 'Delete / Inactivate' : 'Inactivate'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Main Profile Hero Card */}
        <div className="cust-profile-card">
          <div className="cust-profile-hero">
            <div className="cust-hero-left">
              <div className="cust-avatar-circle">
                {getInitials(customer.first_name, customer.last_name)}
              </div>
              <div className="cust-hero-details">
                <div className="cust-hero-name-row">
                  <h1 className="cust-hero-name">
                    {customer.first_name} {customer.last_name}
                  </h1>
                  <span className="cust-hero-id">ID: #{customer.customer_id}</span>
                </div>
                <div className="cust-hero-contact-row">
                  <span className="cust-hero-contact-item">
                    <i className="fas fa-phone"></i> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="cust-hero-contact-item">
                      <i className="fas fa-envelope"></i> {customer.email}
                    </span>
                  )}
                  {customer.city && (
                    <span className="cust-hero-contact-item">
                      <i className="fas fa-location-dot"></i> {customer.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`pet-badge ${customer.is_active ? 'pet-badge-active' : 'pet-badge-inactive'}`}>
                <i className={`fas fa-${customer.is_active ? 'check-circle' : 'ban'}`}></i>
                {customer.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Quick Contact Actions Bar */}
          {(customer.phone || customer.email) && (
            <div className="cust-quick-actions-bar">
              {customer.phone && (
                <button
                  onClick={() => window.open(`https://wa.me/${formatWhatsAppNumber(customer.phone)}`, '_blank')}
                  title={`WhatsApp ${customer.phone}`}
                  className="cust-whatsapp-btn"
                >
                  <i className="fab fa-whatsapp"></i> WhatsApp
                </button>
              )}
              {customer.email && (
                <button
                  onClick={() => { setEmailForm({ subject: '', message: '' }); setEmailModal(true); }}
                  title={`Email ${customer.email}`}
                  className="cust-email-btn"
                >
                  <i className="fas fa-envelope"></i> Email
                </button>
              )}
            </div>
          )}

          {/* Customer Body Content */}
          <div className="cust-body-content">
            {/* Contact Information */}
            <div className="cust-info-card">
              <h2 className="cust-card-title">
                <i className="fas fa-address-book"></i> Contact Information
              </h2>
              <div className="cust-info-grid">
                <div className="cust-info-item">
                  <span className="cust-info-label">Primary Phone</span>
                  <span className="cust-info-value" style={{ fontFamily: 'monospace' }}>{customer.phone}</span>
                </div>
                {customer.alternate_phone && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">Alternate Phone</span>
                    <span className="cust-info-value" style={{ fontFamily: 'monospace' }}>{customer.alternate_phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">Email Address</span>
                    <span className="cust-info-value">{customer.email}</span>
                  </div>
                )}
                <div className="cust-info-item">
                  <span className="cust-info-label">Preferred Contact</span>
                  <span className="cust-info-value">
                    {customer.preferred_contact_method?.toUpperCase() || 'PHONE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="cust-info-card">
              <h2 className="cust-card-title">
                <i className="fas fa-user-id"></i> Personal Information
              </h2>
              <div className="cust-info-grid">
                {customer.nic && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">NIC Number</span>
                    <span className="cust-info-value" style={{ fontFamily: 'monospace' }}>{customer.nic}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">Address</span>
                    <span className="cust-info-value">{customer.address}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">City</span>
                    <span className="cust-info-value">{customer.city}</span>
                  </div>
                )}
                {customer.postal_code && (
                  <div className="cust-info-item">
                    <span className="cust-info-label">Postal Code</span>
                    <span className="cust-info-value">{customer.postal_code}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {(customer.emergency_contact || customer.emergency_phone) && (
              <div className="cust-info-card">
                <h2 className="cust-card-title">
                  <i className="fas fa-phone-volume" style={{ color: '#ef4444' }}></i> Emergency Contact
                </h2>
                <div className="cust-info-grid">
                  {customer.emergency_contact && (
                    <div className="cust-info-item">
                      <span className="cust-info-label">Contact Name</span>
                      <span className="cust-info-value">{customer.emergency_contact}</span>
                    </div>
                  )}
                  {customer.emergency_phone && (
                    <div className="cust-info-item">
                      <span className="cust-info-label">Contact Phone</span>
                      <span className="cust-info-value" style={{ fontFamily: 'monospace' }}>{customer.emergency_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div className="cust-info-card">
                <h2 className="cust-card-title">
                  <i className="fas fa-sticky-note"></i> Customer Notes
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>{customer.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <span>Created: {new Date(customer.created_at).toLocaleDateString()}</span>
              {customer.updated_at && customer.updated_at !== customer.created_at && (
                <span>Updated: {new Date(customer.updated_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Registered Pets Section */}
        <div className="cust-pets-section">
          <div className="cust-pets-header">
            <h2 className="cust-card-title" style={{ border: 'none', padding: 0 }}>
              <i className="fas fa-paw" style={{ color: '#2563eb' }}></i>
              Registered Pets ({customer.pets?.length || 0})
            </h2>
            <button
              onClick={() => navigate(`/pets/new?customer_id=${customer.customer_id}`)}
              className="cust-btn-edit"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}
            >
              <span>+</span>
              <span>Add Pet</span>
            </button>
          </div>

          {customer.pets && customer.pets.length > 0 ? (
            <div className="cust-pets-grid">
              {customer.pets.map((pet) => (
                <div key={pet.pet_id} className="cust-pet-card">
                  <div className="cust-pet-header">
                    <h3 className="cust-pet-name">
                      <i className="fas fa-paw" style={{ color: '#3b82f6', fontSize: '0.95rem' }}></i>
                      {pet.pet_name}
                    </h3>
                    <span className="cust-pet-species-badge">{pet.species}</span>
                  </div>
                  <div className="cust-pet-details-list">
                    {pet.breed && (
                      <div><strong>Breed:</strong> {pet.breed}</div>
                    )}
                    {pet.gender && (
                      <div><strong>Gender:</strong> {pet.gender}</div>
                    )}
                    {pet.date_of_birth && (
                      <div>
                        <strong>Age:</strong>{' '}
                        {Math.floor(
                          (new Date() - new Date(pet.date_of_birth)) /
                          (365.25 * 24 * 60 * 60 * 1000)
                        )}{' '}
                        years
                      </div>
                    )}
                    {pet.weight_current && (
                      <div><strong>Weight:</strong> {pet.weight_current} kg</div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/pets/${pet.pet_id}`)}
                    className="cust-view-pet-btn"
                  >
                    <span>View Details</span>
                    <i className="fas fa-arrow-right" style={{ fontSize: '0.78rem' }}></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
              <i className="fas fa-paw" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No pets registered for this customer</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete / Inactivate Modal */}
      {showDeleteModal && deletability && (
        <div className="pet-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
                {deletability.activeAppointments > 0
                  ? `Cannot ${user?.role === 'admin' ? 'Delete or Inactivate' : 'Inactivate'} Customer`
                  : (!customer.is_active && deletability.hasRelatedData)
                  ? 'Cannot Delete Customer'
                  : (deletability.hasRelatedData || user?.role !== 'admin')
                  ? 'Inactivate Customer'
                  : 'Permanently Delete Customer'}
              </h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pet-modal-body">
              {deletability.activeAppointments > 0 ? (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                      <i className="fas fa-ban" style={{ marginRight: '0.5rem' }}></i>
                      {customer.first_name} {customer.last_name} has {deletability.activeAppointments} active appointment(s).
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                      Please cancel or complete all active appointments before {user?.role === 'admin' ? 'deleting or inactivating' : 'inactivating'} this customer from the system.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="cust-detail-back-btn">Close</button>
                  </div>
                </>
              ) : (!customer.is_active && deletability.hasRelatedData) ? (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      {customer.first_name} {customer.last_name} is already inactive and has existing records in the system.
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                      Permanent deletion is not possible. Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="cust-detail-back-btn">Close</button>
                  </div>
                </>
              ) : (deletability.hasRelatedData || user?.role !== 'admin') ? (
                <>
                  {deletability.hasRelatedData && user?.role === 'admin' && (
                    <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                      <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                        {customer.first_name} {customer.last_name} has existing records and cannot be permanently deleted.
                      </p>
                      <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                        Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                      </p>
                    </div>
                  )}

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div>
                    <label className="cust-info-label">Reason for inactivation <span style={{ color: '#dc2626' }}>*</span></label>
                    <select
                      value={deactivateReason}
                      onChange={e => setDeactivateReason(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="">Select reason...</option>
                      <option value="no_longer_customer">No longer a customer</option>
                      <option value="transferred">Transferred to another clinic</option>
                      <option value="incorrectly_created">Incorrectly created</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="cust-info-label">Additional note (optional)</label>
                    <textarea
                      value={deactivateNote}
                      onChange={e => setDeactivateNote(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="cust-detail-back-btn" disabled={deleting}>Cancel</button>
                    <button onClick={handleInactivate} className="cust-btn-delete" disabled={deleting}>
                      {deleting ? 'Inactivating...' : 'Inactivate Customer'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                      Permanently delete {customer.first_name} {customer.last_name}?
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                      This customer has no records. This action is irreversible and will also delete their associated pets.
                    </p>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.</p>
                  <div>
                    <label className="cust-info-label">Reason for deletion <span style={{ color: '#dc2626' }}>*</span></label>
                    <select
                      value={deactivateReason}
                      onChange={e => setDeactivateReason(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                    >
                      <option value="">Select reason...</option>
                      <option value="incorrectly_created">Incorrectly created</option>
                      <option value="no_longer_customer">No longer a customer</option>
                      <option value="transferred">Transferred to another clinic</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="cust-info-label">Additional note (optional)</label>
                    <textarea
                      value={deactivateNote}
                      onChange={e => setDeactivateNote(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setShowDeleteModal(false)} className="cust-detail-back-btn" disabled={deleting}>Cancel</button>
                    <button onClick={handleDelete} className="cust-btn-delete" disabled={deleting || !deactivateReason}>
                      {deleting ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="pet-modal-overlay" onClick={() => setEmailModal(false)}>
          <div className="pet-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="pet-modal-header">
              <h3 className="pet-modal-title">
                <i className="fas fa-envelope" style={{ color: '#4f46e5' }}></i>
                Send Email to {customer.first_name} {customer.last_name}
              </h3>
              <button onClick={() => setEmailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pet-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                <i className="fas fa-circle-info" style={{ marginRight: '0.4rem' }}></i>
                Sending to: <strong>{customer.email}</strong>
              </p>
              <div>
                <label className="cust-info-label" style={{ marginBottom: '0.35rem' }}>Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label className="cust-info-label" style={{ marginBottom: '0.35rem' }}>Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Type your message here..."
                  rows={5}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setEmailModal(false)} className="cust-detail-back-btn">
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailForm.subject.trim() || !emailForm.message.trim()}
                  className="cust-btn-edit"
                  style={{ opacity: (emailSending || !emailForm.subject.trim() || !emailForm.message.trim()) ? 0.5 : 1, cursor: (emailSending || !emailForm.subject.trim() || !emailForm.message.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  <i className={`fas fa-${emailSending ? 'spinner fa-spin' : 'paper-plane'}`}></i>
                  <span>{emailSending ? 'Sending...' : 'Send Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default CustomerDetail;
