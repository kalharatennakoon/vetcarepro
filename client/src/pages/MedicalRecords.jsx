import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMedicalRecords } from '../services/medicalRecordService';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();
  const { user } = useAuth();
  const isVetOrAdmin = user?.role === 'admin' || user?.role === 'veterinarian';

  useEffect(() => {
    fetchRecords();
    setCurrentPage(1);
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

  // Pagination calculations (AFTER filteredRecords definition)
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Helper functions for pagination
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
        <div style={styles.pageHeader}>
          <i className="fas fa-file-medical" style={styles.headerIcon}></i>
          <div>
            <h1 style={styles.title}>Medical Records</h1>
            <p style={styles.subtitle}>Track detailed medical visits and history ({totalRecords} total records)</p>
          </div>
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
          <div style={styles.dateRangeContainer}>
            <label style={styles.dateLabel}>From</label>
            <input
              type="date"
              name="visit_date_from"
              value={filters.visit_date_from}
              onChange={handleFilterChange}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.dateRangeContainer}>
            <label style={styles.dateLabel}>To</label>
            <input
              type="date"
              name="visit_date_to"
              value={filters.visit_date_to}
              onChange={handleFilterChange}
              style={styles.filterInput}
            />
          </div>

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
                <th style={styles.th}>Follow-up</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((record) => (
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
                    <button
                      onClick={() => navigate(`/medical-records/${record.record_id}`)}
                      style={styles.viewButton}
                      title="View Details"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={styles.paginationContainer}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              {getPageNumbers().map((pageNum, index) => (
                <span key={index}>
                  {pageNum === '...' ? (
                    <span style={styles.paginationEllipsis}>...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(pageNum)}
                      style={currentPage === pageNum ? styles.paginationButtonActive : styles.paginationButton}
                    >
                      {pageNum}
                    </button>
                  )}
                </span>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={currentPage === totalPages ? styles.paginationButtonDisabled : styles.paginationButton}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
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
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '0 0 0.5rem 0',
    color: '#111827',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '14px',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '0.75rem',
    border: '1px solid #fecaca',
    fontSize: '12px',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    border: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  filterRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  dateRangeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: '0 1 auto',
  },
  dateLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterInput: {
    flex: '1',
    minWidth: '180px',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
  clearButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #D1D5DB',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyStateText: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '1rem',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto',
    maxHeight: 'calc(100vh - 340px)',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  link: {
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: '500',
  },
  subText: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '1px',
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  truncate: {
    display: 'block',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  followUpBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  noFollowUpBadge: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationButtonActive: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: '1px solid #3B82F6',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#D1D5DB',
    border: '1px solid #D1D5DB',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    color: '#9ca3af',
    padding: '0.5rem',
    fontSize: '0.875rem',
  },
};

export default MedicalRecords;
