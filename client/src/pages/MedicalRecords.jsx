import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMedicalRecords } from '../services/medicalRecordService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/MedicalRecordsModern.css';

const MedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
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

  // Pagination calculations
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

  return (
    <Layout>
      <div className="med-records-container">
        {/* Page Header */}
        <div className="med-records-header-card">
          <div className="med-records-header-content">
            <div className="med-records-header-icon">
              <i className="fas fa-file-medical"></i>
            </div>
            <div>
              <h1 className="med-records-header-title">Medical Records</h1>
              <p className="med-records-header-subtitle">
                Track detailed medical visits and history
                <span className="med-records-count-badge">{totalRecords} total</span>
              </p>
            </div>
          </div>
          {isVetOrAdmin && (
            <button onClick={() => navigate('/medical-records/new')} className="med-records-btn-create">
              <i className="fas fa-plus"></i> New Medical Record
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div ref={errorRef} className="med-records-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="med-records-filters-card">
          <div className="med-records-search-box">
            <i className="fas fa-search med-records-search-icon"></i>
            <input
              type="text"
              placeholder="Search by pet name, diagnosis, complaint, veterinarian, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="med-records-search-input"
            />
          </div>

          <div className="med-records-filter-row">
            <div className="med-records-date-group">
              <label className="med-records-date-label">From</label>
              <input
                type="date"
                name="visit_date_from"
                value={filters.visit_date_from}
                onChange={handleFilterChange}
                className="med-records-input-select"
              />
            </div>

            <div className="med-records-date-group">
              <label className="med-records-date-label">To</label>
              <input
                type="date"
                name="visit_date_to"
                value={filters.visit_date_to}
                onChange={handleFilterChange}
                className="med-records-input-select"
              />
            </div>

            <div className="med-records-date-group">
              <label className="med-records-date-label">Follow-up</label>
              <select
                name="follow_up_required"
                value={filters.follow_up_required}
                onChange={handleFilterChange}
                className="med-records-input-select"
              >
                <option value="">All Records</option>
                <option value="true">Follow-up Required</option>
                <option value="false">No Follow-up</option>
              </select>
            </div>

            {(filters.visit_date_from || filters.visit_date_to || filters.follow_up_required || searchTerm) && (
              <button onClick={clearFilters} className="med-records-btn-clear">
                <i className="fas fa-times" style={{ marginRight: '0.35rem' }}></i> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="med-records-empty-card">
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            <p style={{ color: '#64748b', margin: 0 }}>Loading medical records...</p>
          </div>
        ) : (
          <>
            {/* Medical Records Table */}
            {filteredRecords.length === 0 ? (
              <div className="med-records-empty-card">
                <i className="fas fa-file-medical med-records-empty-icon"></i>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', margin: '0 0 1rem 0' }}>
                  {searchTerm || filters.visit_date_from || filters.visit_date_to || filters.follow_up_required
                    ? 'No medical records found matching your filters'
                    : 'No medical records yet'}
                </p>
                {isVetOrAdmin && (
                  <button onClick={() => navigate('/medical-records/new')} className="med-records-btn-create">
                    <i className="fas fa-plus"></i> Create First Medical Record
                  </button>
                )}
              </div>
            ) : (
              <div className="med-records-table-card">
                <div className="med-records-table-wrapper">
                  <table className="med-records-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Visit Date</th>
                        <th style={{ width: '25%' }}>Pet</th>
                        <th style={{ width: '25%' }}>Owner</th>
                        <th style={{ width: '20%' }}>Follow-up</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map((record) => (
                        <tr key={record.record_id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(record.visit_date)}</td>
                          <td>
                            <span
                              className="med-records-pet-link"
                              onClick={() => navigate(`/pets/${record.pet_id}`)}
                            >
                              {record.pet_name}
                            </span>
                            <div className="med-records-subtext">{record.species} - {record.breed}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {record.owner_first_name} {record.owner_last_name}
                            </div>
                            {record.veterinarian_name && (
                              <div className="med-records-subtext">Dr. {record.veterinarian_name}</div>
                            )}
                          </td>
                          <td>
                            {record.follow_up_required ? (
                              <div>
                                <span className="med-records-badge-required">Required</span>
                                {record.follow_up_date && (
                                  <div className="med-records-subtext">{formatDate(record.follow_up_date)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="med-records-badge-none">No</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/medical-records/${record.record_id}`)}
                              className="med-records-btn-view"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Results Summary */}
                {filteredRecords.length > 0 && (
                  <div className="med-records-summary-footer">
                    <div>
                      Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredRecords.length)}</strong> of <strong>{filteredRecords.length}</strong> records
                    </div>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="med-records-pagination-bar">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="med-records-pag-btn"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>

                    {getPageNumbers().map((pageNum, index) => (
                      <span key={index}>
                        {pageNum === '...' ? (
                          <span style={{ color: '#94a3b8', padding: '0.4rem', fontSize: '0.85rem' }}>...</span>
                        ) : (
                          <button
                            onClick={() => handlePageChange(pageNum)}
                            className={`med-records-pag-btn ${currentPage === pageNum ? 'is-active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        )}
                      </span>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="med-records-pag-btn"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default MedicalRecords;
