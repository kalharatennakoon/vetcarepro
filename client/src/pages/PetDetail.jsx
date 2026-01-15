import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPetById, deletePet, getPetMedicalHistory, getPetVaccinations } from '../services/petService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const PetDetail = () => {
  const [pet, setPet] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info'); // info, medical, vaccinations
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchPetDetails();
    fetchMedicalHistory();
    fetchVaccinations();
  }, [id]);

  const fetchPetDetails = async () => {
    try {
      setLoading(true);
      const response = await getPetById(id);
      setPet(response.data.pet);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pet details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      const response = await getPetMedicalHistory(id);
      setMedicalHistory(response.data.medicalHistory || []);
    } catch (err) {
      console.error('Failed to fetch medical history:', err);
    }
  };

  const fetchVaccinations = async () => {
    try {
      const response = await getPetVaccinations(id);
      setVaccinations(response.data.vaccinations || []);
    } catch (err) {
      console.error('Failed to fetch vaccinations:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this pet? This will also delete all associated medical records.')) {
      return;
    }

    try {
      await deletePet(id);
      navigate('/pets');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete pet');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + 
                        (today.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} ${ageInMonths === 1 ? 'month' : 'months'}`;
    }
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    if (months === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years}y ${months}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSpeciesEmoji = (species) => {
    const emojis = {
      'Dog': '🐕',
      'Cat': '🐈',
      'Bird': '🐦',
      'Rabbit': '🐰',
      'Hamster': '🐹',
      'Guinea Pig': '🐹',
      'Fish': '🐠',
      'Reptile': '🦎',
      'Other': '🐾'
    };
    return emojis[species] || '🐾';
  };

  if (loading) {
    return (
      <Layout>
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading pet details...</p>
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
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          Back to Pets
        </button>
      </div>
      </Layout>
    );
  }

  if (!pet) {
    return (
      <Layout>
      <div style={styles.errorContainer}>
        <h2>Pet Not Found</h2>
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          Back to Pets
        </button>
      </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/pets')} style={styles.backButton}>
          ← Back to Pets
        </button>
        <div style={styles.headerActions}>
          <button onClick={() => navigate(`/pets/${id}/edit`)} style={styles.editButton}>
            Edit Pet
          </button>
          {user?.role === 'admin' && (
            <button onClick={handleDelete} style={styles.deleteButton}>
              Delete Pet
            </button>
          )}
        </div>
      </div>

      {/* Pet Information Card */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div style={styles.titleSection}>
            <span style={styles.emoji}>{getSpeciesEmoji(pet.species)}</span>
            <div>
              <h1 style={styles.petName}>{pet.pet_name}</h1>
              <p style={styles.petId}>Pet ID: #{pet.pet_id}</p>
            </div>
          </div>
          <div style={styles.badges}>
            <span style={pet.is_active ? styles.activeBadge : styles.inactiveBadge}>
              {pet.is_active ? 'Active' : 'Inactive'}
            </span>
            {pet.gender && (
              <span style={pet.gender === 'Male' ? styles.maleBadge : styles.femaleBadge}>
                {pet.gender}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'info' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('info')}
          >
            📋 Information
          </button>
          <button
            style={activeTab === 'medical' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('medical')}
          >
            🏥 Medical History ({medicalHistory.length})
          </button>
          <button
            style={activeTab === 'vaccinations' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('vaccinations')}
          >
            💉 Vaccinations ({vaccinations.length})
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {activeTab === 'info' && (
            <>
              {/* Basic Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>🐾 Basic Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Species:</span>
                    <span style={styles.infoValue}>{pet.species || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Breed:</span>
                    <span style={styles.infoValue}>{pet.breed || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Date of Birth:</span>
                    <span style={styles.infoValue}>{formatDate(pet.date_of_birth)}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Age:</span>
                    <span style={styles.infoValue}>{calculateAge(pet.date_of_birth)}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Color:</span>
                    <span style={styles.infoValue}>{pet.color || '-'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Current Weight:</span>
                    <span style={styles.infoValue}>
                      {pet.weight_current ? `${pet.weight_current} kg` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>👤 Owner Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Owner:</span>
                    <span 
                      style={styles.ownerLink}
                      onClick={() => navigate(`/customers/${pet.customer_id}`)}
                    >
                      {pet.owner_first_name && pet.owner_last_name 
                        ? `${pet.owner_first_name} ${pet.owner_last_name}` 
                        : 'Unknown'}
                    </span>
                  </div>
                  {pet.owner_phone && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Phone:</span>
                      <span style={styles.infoValue}>{pet.owner_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>💊 Medical Information</h2>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Neutered/Spayed:</span>
                    <span style={styles.infoValue}>{pet.is_neutered ? 'Yes' : 'No'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Allergies:</span>
                    <span style={styles.infoValue}>{pet.allergies || 'None'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Special Needs:</span>
                    <span style={styles.infoValue}>{pet.special_needs || 'None'}</span>
                  </div>
                  {pet.insurance_provider && (
                    <>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Insurance Provider:</span>
                        <span style={styles.infoValue}>{pet.insurance_provider}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Policy Number:</span>
                        <span style={styles.infoValue}>{pet.insurance_policy_number || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
                {pet.notes && (
                  <div style={styles.notesSection}>
                    <span style={styles.infoLabel}>Notes:</span>
                    <p style={styles.notes}>{pet.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'medical' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🏥 Medical History</h2>
                {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                  <button 
                    onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                    style={styles.addRecordButton}
                  >
                    + New Medical Record
                  </button>
                )}
              </div>
              {medicalHistory.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No medical history records found</p>
                  {(user?.role === 'admin' || user?.role === 'veterinarian') && (
                    <button 
                      onClick={() => navigate(`/medical-records/new?petId=${id}`)} 
                      style={styles.emptyButton}
                    >
                      Create First Medical Record
                    </button>
                  )}
                </div>
              ) : (
                <div style={styles.historyList}>
                  {medicalHistory.map((record) => (
                    <div 
                      key={record.visit_id || record.record_id} 
                      style={styles.historyCard}
                      onClick={() => navigate(`/medical-records/${record.record_id || record.visit_id}`)}
                    >
                      <div style={styles.historyHeader}>
                        <span style={styles.historyDate}>{formatDate(record.visit_date)}</span>
                        <span style={styles.historyType}>{record.visit_type || 'Visit'}</span>
                      </div>
                      <div style={styles.historyContent}>
                        <p><strong>Reason:</strong> {record.reason_for_visit || record.chief_complaint || 'N/A'}</p>
                        {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
                        {record.treatment && <p><strong>Treatment:</strong> {record.treatment}</p>}
                        {record.vet_name && <p><strong>Vet:</strong> {record.vet_name}</p>}
                        {record.veterinarian_name && <p><strong>Vet:</strong> {record.veterinarian_name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vaccinations' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>💉 Vaccinations</h2>
              {vaccinations.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No vaccination records found</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.th}>Vaccine Name</th>
                        <th style={styles.th}>Date Given</th>
                        <th style={styles.th}>Next Due</th>
                        <th style={styles.th}>Batch Number</th>
                        <th style={styles.th}>Vet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaccinations.map((vacc) => (
                        <tr key={vacc.vaccination_id} style={styles.tableRow}>
                          <td style={styles.td}>{vacc.vaccine_name}</td>
                          <td style={styles.td}>{formatDate(vacc.date_given)}</td>
                          <td style={styles.td}>{formatDate(vacc.next_due_date)}</td>
                          <td style={styles.td}>{vacc.batch_number || '-'}</td>
                          <td style={styles.td}>{vacc.vet_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  emoji: {
    fontSize: '3rem',
  },
  petName: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  petId: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  badges: {
    display: 'flex',
    gap: '0.5rem',
  },
  activeBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  inactiveBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  maleBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  femaleBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#fce7f3',
    color: '#9f1239',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    padding: '0 2rem',
  },
  tab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '-2px',
    transition: 'all 0.2s',
  },
  activeTab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #2563eb',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2563eb',
    cursor: 'pointer',
    marginBottom: '-2px',
  },
  tabContent: {
    padding: '2rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addRecordButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
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
    fontWeight: '500',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#111827',
  },
  ownerLink: {
    fontSize: '1rem',
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: '500',
  },
  notesSection: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  notes: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.5',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  historyCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  historyDate: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  historyType: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  historyContent: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.5',
  },
  tableContainer: {
    overflow: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
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
    padding: '2rem',
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: '1rem',
  },
};

export default PetDetail;
