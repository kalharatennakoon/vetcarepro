import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { checkCustomerDeletability, inactivateCustomer, deleteCustomer } from '../services/customerService';
import { sendCustomerEmail } from '../services/emailService';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';

const CustomerDetail = () => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
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
  };

  const openDeleteModal = async () => {
    try {
      const response = await checkCustomerDeletability(id);
      setDeletability(response.data);
      setDeactivateReason('');
      setDeactivateNote('');
      setShowDeleteModal(true);
    } catch (err) {
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading customer details...</p>
      </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
      <div style={styles.errorContainer}>
        <h2>Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate('/customers')} style={styles.backButton}>
          Back to Customers
        </button>
      </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
      <div style={styles.errorContainer}>
        <h2>Customer Not Found</h2>
        <button onClick={() => navigate('/customers')} style={styles.backButton}>
          Back to Customers
        </button>
      </div>
      </Layout>
    );
  }

  if (showEditForm) {
    return (
      <Layout>
      <div style={styles.container}>
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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/customers')} style={styles.backButton}>
          ← Back to Customers
        </button>
        <div style={styles.headerActions}>
          <button onClick={() => setShowEditForm(true)} style={styles.editButton}>
            Edit Customer
          </button>
          {(customer.is_active || user?.role === 'admin') && (
            <button onClick={openDeleteModal} style={styles.deleteButton}>
              <i className="fas fa-trash" style={{ marginRight: '0.4rem' }}></i>
              {!customer.is_active ? 'Delete' : user?.role === 'admin' ? 'Delete / Inactivate' : 'Inactivate'}
            </button>
          )}
        </div>
      </div>

      {/* Customer Information Card */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div>
            <h1 style={styles.customerName}>
              {customer.first_name} {customer.last_name}
            </h1>
            <p style={styles.customerId}>Customer ID: #{customer.customer_id}</p>
          </div>
          <div style={{
            ...styles.statusBadge,
            backgroundColor: customer.is_active ? '#d1fae5' : '#fee2e2',
            color: customer.is_active ? '#065f46' : '#991b1b'
          }}>
            {customer.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Quick Contact Actions */}
        {(customer.phone || customer.email) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            {customer.phone && (
              <button
                onClick={() => window.open(`https://wa.me/${formatWhatsAppNumber(customer.phone)}`, '_blank')}
                title={`WhatsApp ${customer.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.75rem', backgroundColor: '#25d366', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer' }}
              >
                <i className="fab fa-whatsapp"></i> WhatsApp
              </button>
            )}
            {customer.email && (
              <button
                onClick={() => { setEmailForm({ subject: '', message: '' }); setEmailModal(true); }}
                title={`Email ${customer.email}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer' }}
              >
                <i className="fas fa-envelope"></i> Email
              </button>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Phone:</span>
              <span style={styles.infoValue}>{customer.phone}</span>
            </div>
            {customer.alternate_phone && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Alternate Phone:</span>
                <span style={styles.infoValue}>{customer.alternate_phone}</span>
              </div>
            )}
            {customer.email && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Email:</span>
                <span style={styles.infoValue}>{customer.email}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Preferred Contact:</span>
              <span style={styles.infoValue}>
                {customer.preferred_contact_method?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Personal Information</h2>
          <div style={styles.infoGrid}>
            {customer.nic && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>NIC Number:</span>
                <span style={styles.infoValue}>{customer.nic}</span>
              </div>
            )}
            {customer.address && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Address:</span>
                <span style={styles.infoValue}>{customer.address}</span>
              </div>
            )}
            {customer.city && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>City:</span>
                <span style={styles.infoValue}>{customer.city}</span>
              </div>
            )}
            {customer.postal_code && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Postal Code:</span>
                <span style={styles.infoValue}>{customer.postal_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        {(customer.emergency_contact || customer.emergency_phone) && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Emergency Contact</h2>
            <div style={styles.infoGrid}>
              {customer.emergency_contact && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Contact Name:</span>
                  <span style={styles.infoValue}>{customer.emergency_contact}</span>
                </div>
              )}
              {customer.emergency_phone && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Contact Phone:</span>
                  <span style={styles.infoValue}>{customer.emergency_phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {customer.notes && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Notes</h2>
            <p style={styles.notesText}>{customer.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div style={styles.metadata}>
          <span style={styles.metadataItem}>
            Created: {new Date(customer.created_at).toLocaleDateString()}
          </span>
          {customer.updated_at && customer.updated_at !== customer.created_at && (
            <span style={styles.metadataItem}>
              Updated: {new Date(customer.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Pets Section */}
      <div style={styles.petsSection}>
        <div style={styles.petsSectionHeader}>
          <h2 style={styles.sectionTitle}>Registered Pets ({customer.pets?.length || 0})</h2>
          <button
            onClick={() => navigate(`/pets/new?customer_id=${customer.customer_id}`)}
            style={styles.addPetButton}
          >
            + Add Pet
          </button>
        </div>

        {customer.pets && customer.pets.length > 0 ? (
          <div style={styles.petsGrid}>
            {customer.pets.map((pet) => (
              <div key={pet.pet_id} style={styles.petCard}>
                <div style={styles.petCardHeader}>
                  <h3 style={styles.petName}>{pet.pet_name}</h3>
                  <span style={styles.petSpecies}>{pet.species}</span>
                </div>
                <div style={styles.petInfo}>
                  {pet.breed && (
                    <p style={styles.petDetail}>
                      <strong>Breed:</strong> {pet.breed}
                    </p>
                  )}
                  {pet.gender && (
                    <p style={styles.petDetail}>
                      <strong>Gender:</strong> {pet.gender}
                    </p>
                  )}
                  {pet.date_of_birth && (
                    <p style={styles.petDetail}>
                      <strong>Age:</strong>{' '}
                      {Math.floor(
                        (new Date() - new Date(pet.date_of_birth)) /
                        (365.25 * 24 * 60 * 60 * 1000)
                      )}{' '}
                      years
                    </p>
                  )}
                  {pet.weight_current && (
                    <p style={styles.petDetail}>
                      <strong>Weight:</strong> {pet.weight_current} kg
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/pets/${pet.pet_id}`)}
                  style={styles.viewPetButton}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No pets registered for this customer</p>
          </div>
        )}
      </div>
    </div>

    {/* Delete / Inactivate Modal */}
    {showDeleteModal && deletability && (
      <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>
              {deletability.activeAppointments > 0
                ? `Cannot ${user?.role === 'admin' ? 'Delete or Inactivate' : 'Inactivate'} Customer`
                : (!customer.is_active && deletability.hasRelatedData)
                ? 'Cannot Delete Customer'
                : (deletability.hasRelatedData || user?.role !== 'admin')
                ? 'Inactivate Customer'
                : 'Permanently Delete Customer'}
            </h3>
            <button onClick={() => setShowDeleteModal(false)} style={styles.modalCloseButton}>×</button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {deletability.activeAppointments > 0 ? (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                    <i className="fas fa-ban" style={{ marginRight: '0.5rem' }}></i>
                    {customer.first_name} {customer.last_name} has {deletability.activeAppointments} active appointment(s).
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                    Please cancel or complete all active appointments before {user?.role === 'admin' ? 'deleting or inactivating' : 'inactivating'} this customer from the system.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal}>Close</button>
                </div>
              </>
            ) : (!customer.is_active && deletability.hasRelatedData) ? (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                    {customer.first_name} {customer.last_name} is already inactive and has existing records in the system.
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                    Permanent deletion is not possible. Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal}>Close</button>
                </div>
              </>
            ) : (deletability.hasRelatedData || user?.role !== 'admin') ? (
              <>
                {deletability.hasRelatedData && user?.role === 'admin' && (
                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                      {customer.first_name} {customer.last_name} has existing records and cannot be permanently deleted.
                    </p>
                    <p style={{ margin: '0.5rem 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                      Records: {deletability.counts.appointments} appointment(s), {deletability.counts.medicalRecords} medical record(s), {deletability.counts.vaccinations} vaccination(s), {deletability.counts.billingRecords} billing record(s).
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.modalLabel}>Reason for inactivation <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    value={deactivateReason}
                    onChange={e => setDeactivateReason(e.target.value)}
                    style={styles.modalInput}
                  >
                    <option value="">Select reason...</option>
                    <option value="no_longer_customer">No longer a customer</option>
                    <option value="transferred">Transferred to another clinic</option>
                    <option value="incorrectly_created">Incorrectly created</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.modalLabel}>Additional note (optional)</label>
                  <textarea
                    value={deactivateNote}
                    onChange={e => setDeactivateNote(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    style={{ ...styles.modalInput, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal} disabled={deleting}>Cancel</button>
                  <button onClick={handleInactivate} style={styles.inactivateBtn} disabled={deleting}>
                    {deleting ? 'Inactivating...' : 'Inactivate Customer'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, color: '#991b1b', fontWeight: '600' }}>
                    Permanently delete {customer.first_name} {customer.last_name}?
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: '#7f1d1d', fontSize: '0.875rem' }}>
                    This customer has no records. This action is irreversible and will also delete their associated pets.
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.modalLabel}>Reason for deletion <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    value={deactivateReason}
                    onChange={e => setDeactivateReason(e.target.value)}
                    style={styles.modalInput}
                  >
                    <option value="">Select reason...</option>
                    <option value="incorrectly_created">Incorrectly created</option>
                    <option value="no_longer_customer">No longer a customer</option>
                    <option value="transferred">Transferred to another clinic</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.modalLabel}>Additional note (optional)</label>
                  <textarea
                    value={deactivateNote}
                    onChange={e => setDeactivateNote(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    style={{ ...styles.modalInput, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => setShowDeleteModal(false)} style={styles.cancelBtnModal} disabled={deleting}>Cancel</button>
                  <button onClick={handleDelete} style={styles.deleteConfirmBtn} disabled={deleting || !deactivateReason}>
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
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        onClick={() => setEmailModal(false)}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '2rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937' }}>
              <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#2563eb' }}></i>
              Send Email to {customer.first_name} {customer.last_name}
            </h3>
            <button onClick={() => setEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <i className="fas fa-circle-info" style={{ marginRight: '0.4rem' }}></i>
            Sending to: <strong>{customer.email}</strong>
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Email subject"
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Message</label>
            <textarea
              value={emailForm.message}
              onChange={(e) => setEmailForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your message here..."
              rows={6}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setEmailModal(false)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailForm.subject.trim() || !emailForm.message.trim()}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: emailSending ? '#9ca3af' : '#2563eb', color: '#fff', cursor: emailSending ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              {emailSending
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.4rem' }}></i>Sending...</>
                : <><i className="fas fa-paper-plane" style={{ marginRight: '0.4rem' }}></i>Send Email</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '2rem',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    marginBottom: '2rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  customerName: {
    margin: '0 0 0.5rem 0',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  customerId: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#374151',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#111827',
  },
  notesText: {
    margin: 0,
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    color: '#374151',
    lineHeight: '1.6',
  },
  metadata: {
    display: 'flex',
    gap: '1.5rem',
    paddingTop: '1.5rem',
    marginTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  metadataItem: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  petsSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
  },
  petsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  addPetButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  petsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  petCard: {
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  petCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  petName: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
  },
  petSpecies: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  petInfo: {
    marginBottom: '1rem',
  },
  petDetail: {
    margin: '0.5rem 0',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  viewPetButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  modalInput: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  cancelBtnModal: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  inactivateBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#f59e0b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default CustomerDetail;
