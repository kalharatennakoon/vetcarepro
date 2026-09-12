import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPets } from '../services/petService';

const SPECIES_LIST = [
  'Dog', 'Cat', 'Bird', 'Rabbit', 'Guinea Pig', 'Hamster',
  'Parrot', 'Budgie', 'Pigeon', 'Hen',
  'Cow', 'Goat', 'Pig', 'Sheep',
  'Snake', 'Lizard', 'Turtle',
  'Exotic Animal', 'Monkey', 'Deer',
  'Rescue/Admitted Wildlife', 'Other',
];
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/ManagementPages.css';

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();
  useAuth();


  useEffect(() => {
    fetchPets();
    setCurrentPage(1);
  }, [search, speciesFilter]);


  const fetchPets = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (search) filters.search = search;
      if (speciesFilter) filters.species = speciesFilter;
      const response = await getPets(filters);
      setPets(response.data.pets || []);
      setError('');
    } catch (err) {
      setError('Failed to load pets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = pets.filter(p => p.is_active !== false).length;
  const inactiveCount = pets.filter(p => p.is_active === false).length;

  const filteredPets = pets.filter(p => {
    if (statusFilter === 'active') return p.is_active !== false;
    if (statusFilter === 'inactive') return p.is_active === false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPets = filteredPets.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const statusTabs = [
    { key: 'all', label: 'All', count: pets.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
  ];

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

  return (
    <Layout>
      <div className="mgmt-page-container">
        {/* Page Header */}
        <div className="mgmt-header-card">
          <div className="mgmt-header-left">
            <div className="mgmt-header-icon-box mgmt-header-icon-pets">
              <i className="fas fa-paw"></i>
            </div>
            <div className="mgmt-header-text">
              <h2 className="mgmt-title">Pet Management</h2>
              <p className="mgmt-subtitle">Manage all pets in the clinic</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/pets/new')}
            className="mgmt-add-btn"
          >
            <span>+</span>
            <span>Add Pet</span>
          </button>
        </div>

        {/* Search and Filter Control Card */}
        <div className="mgmt-control-card">
          <div className="mgmt-search-row">
            <div className="mgmt-search-wrapper">
              <i className="fas fa-search mgmt-search-icon"></i>
              <input
                type="text"
                placeholder="Search by pet name or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mgmt-search-input"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mgmt-search-clear-btn"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="mgmt-select-input"
            >
              <option value="">All Species</option>
              {SPECIES_LIST.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          <div className="mgmt-stats-grid">
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Total Pets</span>
              <span className="mgmt-stat-value">{pets.length}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Active</span>
              <span className="mgmt-stat-value active-color">{activeCount}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Inactive</span>
              <span className="mgmt-stat-value inactive-color">{inactiveCount}</span>
            </div>
            <div className="mgmt-stat-card">
              <span className="mgmt-stat-label">Showing</span>
              <span className="mgmt-stat-value">
                {filteredPets.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredPets.length)}` : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div ref={errorRef} style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mgmt-status-tabs">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
              className={`mgmt-status-tab ${statusFilter === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              <span className="mgmt-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading pets...</p>
          </div>
        ) : (
          <>
            {/* Pets Table Card */}
            <div className="mgmt-table-card">
              {currentPets.length === 0 ? (
                <div className="mgmt-empty-card">
                  <i className="fas fa-paw mgmt-empty-icon"></i>
                  <p className="mgmt-empty-text">
                    {search || speciesFilter ? 'No pets found matching your criteria' : 'No pets registered yet'}
                  </p>
                  {!search && !speciesFilter && (
                    <button 
                      onClick={() => navigate('/pets/new')}
                      className="mgmt-add-btn"
                    >
                      Register Your First Pet
                    </button>
                  )}
                </div>
              ) : (
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th className="mgmt-th" style={{ width: '25%' }}>Pet</th>
                      <th className="mgmt-th" style={{ width: '15%' }}>Species</th>
                      <th className="mgmt-th" style={{ width: '13%' }}>Age</th>
                      <th className="mgmt-th" style={{ width: '23%' }}>Owner</th>
                      <th className="mgmt-th" style={{ width: '12%', textAlign: 'center' }}>Gender</th>
                      <th className="mgmt-th" style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPets.map((pet) => (
                      <tr key={pet.pet_id} className="mgmt-tr">
                        <td className="mgmt-td">
                          <div className="mgmt-item-cell">
                            {pet.photo_url ? (
                              <img 
                                src={`http://localhost:3000/uploads/${pet.photo_url}`} 
                                alt={pet.pet_name}
                                className="mgmt-avatar-circle"
                              />
                            ) : (
                              <div className="mgmt-avatar-icon">
                                <i className="fas fa-paw"></i>
                              </div>
                            )}
                            <div className="mgmt-item-info">
                              <div className="mgmt-item-name">
                                <span>{pet.pet_name}</span>
                                {pet.is_active === false && <span className="mgmt-badge-inactive">Inactive</span>}
                              </div>
                              <span className="mgmt-item-subtext">{pet.breed || 'Mixed Breed'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="mgmt-td">
                          <span>{pet.species || '-'}</span>
                        </td>
                        <td className="mgmt-td">
                          <span>{calculateAge(pet.date_of_birth)}</span>
                        </td>
                        <td className="mgmt-td">
                          <span 
                            className="mgmt-owner-link"
                            onClick={() => navigate(`/customers/${pet.customer_id}`)}
                          >
                            {pet.owner_first_name && pet.owner_last_name 
                              ? `${pet.owner_first_name} ${pet.owner_last_name}` 
                              : 'Unknown'}
                          </span>
                        </td>
                        <td className="mgmt-td" style={{ textAlign: 'center' }}>
                          {pet.gender ? (
                            <span className="mgmt-gender-badge">{pet.gender}</span>
                          ) : '-'}
                        </td>
                        <td className="mgmt-td" style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/pets/${pet.pet_id}`)}
                            className="mgmt-view-btn"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredPets.length > itemsPerPage && (
              <div className="mgmt-pagination-container">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredPets.length)} of {filteredPets.length} entries
                </span>
                <div className="mgmt-pagination-btns">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="mgmt-page-btn"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} style={{ padding: '0 0.25rem', color: '#94a3b8' }}>...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`mgmt-page-btn ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="mgmt-page-btn"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: '1.5rem',
    color: 'white',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.2',
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
  },
  addButtonHover: {
    backgroundColor: '#1d4ed8',
  },
  buttonIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  searchRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIconSpan: {
    position: 'absolute',
    left: '1rem',
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 3rem 0.75rem 2.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#f8fafc',
  },
  clearButton: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
  },
  selectInput: {
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#f8fafc',
    minWidth: '150px',
  },
  statsBar: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    minWidth: '100px',
    border: '1px solid #e5e7eb',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    maxHeight: 'calc(100vh - 340px)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    minWidth: '900px',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  petCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e5e7eb',
    flexShrink: 0,
  },
  avatarIcon: {
    fontSize: '1rem',
    color: 'white',
  },
  petInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  petName: {
    fontWeight: '600',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '0.875rem',
  },
  petBreed: {
    fontSize: '0.75rem',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  speciesText: {
    color: '#1f2937',
  },
  ageText: {
    color: '#1f2937',
  },
  ownerLink: {
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  genderBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  viewButtonHover: {
    backgroundColor: '#2563eb',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  editButtonHover: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  deleteButtonHover: {
    backgroundColor: '#475569',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #E5E7EB',
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
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#6b7280',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '1rem',
    marginBottom: '1rem',
  },
  emptyButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  statusTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    padding: '0 0.375rem',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  inactiveBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
};

export default Pets;
