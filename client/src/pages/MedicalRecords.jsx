import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMedicalRecords, deleteMedicalRecord } from '../services/medicalRecordService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const MedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    visit_date_from: '',
    visit_date_to: '',
    diagnosis: '',
    follow_up_required: ''
  });
  const [totalRecords, setTotalRecords] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const isVetOrAdmin = user?.role === 'admin' || user?.role === 'veterinarian';

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await getMedicalRecords(filters);
      setRecords(response.data.records);
      setTotalRecords(response.total);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMedicalRecord(id);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medical record');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      visit_date_from: '',
      visit_date_to: '',
      diagnosis: '',
      follow_up_required: ''
    });
    setSearchTerm('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.pet_name?.toLowerCase().includes(search) ||
      record.diagnosis?.toLowerCase().includes(search) ||
      record.chief_complaint?.toLowerCase().includes(search) ||
      record.veterinarian_name?.toLowerCase().includes(search) ||
      record.owner_first_name?.toLowerCase().includes(search) ||
      record.owner_last_name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading medical records...</div>
      </div>
    );
  }

  return (
    <Layout>
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Medical Records</h1>
          <p style={styles.subtitle}>Track detailed medical visits and history ({totalRecords} total records)</p>
        </div>
        {isVetOrAdmin && (
          <button onClick={() => navigate('/medical-records/new')} style={styles.primaryButton}>
            + New Medical Record
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Search and Filters */}
      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="Search by pet name, diagnosis, complaint, veterinarian, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.filterRow}>
          <input
            type="date"
            name="visit_date_from"
            value={filters.visit_date_from}
            onChange={handleFilterChange}
            placeholder="Visit date from"
            style={styles.filterInput}
          />

          <input
            type="date"
            name="visit_date_to"
            value={filters.visit_date_to}
            onChange={handleFilterChange}
            placeholder="Visit date to"
            style={styles.filterInput}
          />

          <select
            name="follow_up_required"
            value={filters.follow_up_required}
            onChange={handleFilterChange}
            style={styles.filterInput}
          >
            <option value="">All Records</option>
            <option value="true">Follow-up Required</option>
            <option value="false">No Follow-up</option>
          </select>

          {(filters.visit_date_from || filters.visit_date_to || filters.follow_up_required) && (
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Medical Records Table */}
      {filteredRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>
            {searchTerm || filters.visit_date_from || filters.visit_date_to || filters.follow_up_required
              ? 'No medical records found matching your filters'
              : 'No medical records yet'}
          </p>
          {isVetOrAdmin && (
            <button onClick={() => navigate('/medical-records/new')} style={styles.primaryButton}>
              Create First Medical Record
            </button>
          )}
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Visit Date</th>
                <th style={styles.th}>Pet</th>
                <th style={styles.th}>Owner</th>
                <th style={styles.th}>Veterinarian</th>
                <th style={styles.th}>Chief Complaint</th>
                <th style={styles.th}>Diagnosis</th>
                <th style={styles.th}>Follow-up</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.record_id} style={styles.tr}>
                  <td style={styles.td}>{formatDate(record.visit_date)}</td>
                  <td style={styles.td}>
                    <span
                      style={styles.link}
                      onClick={() => navigate(`/pets/${record.pet_id}`)}
                    >
                      {record.pet_name}
                    </span>
                    <div style={styles.subText}>{record.species} - {record.breed}</div>
                  </td>
                  <td style={styles.td}>
                    {record.owner_first_name} {record.owner_last_name}
                  </td>
                  <td style={styles.td}>{record.veterinarian_name}</td>
                  <td style={styles.td}>
                    {record.chief_complaint ? (
                      <span style={styles.truncate}>{record.chief_complaint}</span>
                    ) : (
                      <span style={styles.noData}>-</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {record.diagnosis ? (
                      <span style={styles.truncate}>{record.diagnosis}</span>
                    ) : (
                      <span style={styles.noData}>-</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {record.follow_up_required ? (
                      <div>
                        <span style={styles.followUpBadge}>Required</span>
                        {record.follow_up_date && (
                          <div style={styles.subText}>{formatDate(record.follow_up_date)}</div>
                        )}
                      </div>
                    ) : (
                      <span style={styles.noFollowUpBadge}>No</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => navigate(`/medical-records/${record.record_id}`)}
                        style={styles.viewButton}
                        title="View Details"
                      >
                        View
                      </button>
                      {isVetOrAdmin && (
                        <>
                          <button
                            onClick={() => navigate(`/medical-records/${record.record_id}/edit`)}
                            style={styles.editButton}
                            title="Edit Record"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.record_id)}
                            style={styles.deleteButton}
                            title="Delete Record"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.1rem',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    marginBottom: '1rem',
  },
  filterRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  filterInput: {
    flex: '1',
    minWidth: '200px',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyStateText: {
    fontSize: '1.1rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#1f2937',
  },
  link: {
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: '500',
  },
  subText: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  truncate: {
    display: 'block',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  followUpBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  noFollowUpBadge: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  editButton: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default MedicalRecords;
