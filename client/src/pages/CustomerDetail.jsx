import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';

const CustomerDetail = () => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/customers');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchCustomer();
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
          {user?.role === 'admin' && (
            <button onClick={handleDelete} style={styles.deleteButton}>
              Delete Customer
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
          <div style={styles.statusBadge}>
            {customer.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Contact Information */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}><i className="fas fa-phone"></i> Contact Information</h2>
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
          <h2 style={styles.sectionTitle}><i className="fas fa-user"></i> Personal Information</h2>
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
            <h2 style={styles.sectionTitle}><i className="fas fa-exclamation-circle"></i> Emergency Contact</h2>
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
            <h2 style={styles.sectionTitle}><i className="fas fa-sticky-note"></i> Notes</h2>
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
          <h2 style={styles.sectionTitle}><i className="fas fa-paw"></i> Registered Pets ({customer.pets?.length || 0})</h2>
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
    transition: 'background-color 0.2s',
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  deleteButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
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
    backgroundColor: '#d1fae5',
    color: '#065f46',
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
    transition: 'background-color 0.2s',
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
    transition: 'transform 0.2s, box-shadow 0.2s',
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
    transition: 'background-color 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
};

export default CustomerDetail;
