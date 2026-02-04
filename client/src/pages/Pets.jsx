import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPets, deletePet, getSpeciesList } from '../services/petService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [speciesList, setSpeciesList] = useState([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchSpeciesList();
  }, []);

  useEffect(() => {
    fetchPets();
    setCurrentPage(1);
  }, [search, speciesFilter]);

  const fetchSpeciesList = async () => {
    try {
      const response = await getSpeciesList();
      // Extract just the species names from the response
      const speciesNames = response.data.species?.map(s => s.species) || [];
      setSpeciesList(speciesNames);
    } catch (err) {
      console.error('Failed to fetch species list:', err);
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pet? This will also delete all associated medical records.')) {
      return;
    }

    try {
      await deletePet(id);
      fetchPets();
    } catch (err) {
      alert('Failed to delete pet');
      console.error(err);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  // Pagination calculations
  const totalPages = Math.ceil(pets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPets = pets.slice(startIndex, endIndex);

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

  const getSpeciesIcon = (species) => {
    const icons = {
      'Dog': 'fa-dog',
      'Cat': 'fa-cat',
      'Bird': 'fa-dove',
      'Rabbit': 'fa-rabbit',
      'Hamster': 'fa-hamster',
      'Guinea Pig': 'fa-hamster',
      'Fish': 'fa-fish',
      'Reptile': 'fa-dragon',
      'Other': 'fa-paw'
    };
    return icons[species] || 'fa-paw';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div style={styles.headerInfo}>
          <div style={styles.headerIconWrapper}>
            <i className="fas fa-paw" style={styles.headerIcon}></i>
          </div>
          <div>
            <h2 style={styles.title}>Pet Management</h2>
            <p style={styles.subtitle}>Manage all pets in the clinic</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/pets/new')}
          style={styles.addButton}
          onMouseOver={(e) => e.target.style.backgroundColor = styles.addButtonHover.backgroundColor}
          onMouseOut={(e) => e.target.style.backgroundColor = styles.addButton.backgroundColor}
        >
          <span style={styles.buttonIcon}>+</span>
          <span>Add Pet</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={styles.searchContainer}>
        <div style={styles.searchRow}>
          <div style={styles.searchWrapper}>
            <i className="fas fa-search" style={styles.searchIconSpan}></i>
            <input
              type="text"
              placeholder="Search by pet name or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={styles.clearButton}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">All Species</option>
            {speciesList.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Pets</span>
            <span style={styles.statValue}>{pets.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Showing</span>
            <span style={styles.statValue}>
              {pets.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, pets.length)}` : '0'}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Active</span>
            <span style={styles.statValue}>{pets.filter(p => p.is_active !== false).length}</span>
          </div>
          {speciesFilter && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Species</span>
              <span style={styles.statValue}>{speciesFilter}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading pets...</p>
        </div>
      ) : (
        <>
          {/* Pets Table */}
          <div style={styles.tableContainer}>
            {currentPets.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>
                  {search || speciesFilter ? 'No pets found matching your criteria' : 'No pets registered yet'}
                </p>
                {!search && !speciesFilter && (
                  <button 
                    onClick={() => navigate('/pets/new')}
                    style={styles.emptyButton}
                  >
                    Register Your First Pet
                  </button>
                )}
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{...styles.th, width: '22%'}}>Pet</th>
                    <th style={{...styles.th, width: '13%'}}>Species</th>
                    <th style={{...styles.th, width: '13%'}}>Age</th>
                    <th style={{...styles.th, width: '22%'}}>Owner</th>
                    <th style={{...styles.th, width: '12%', textAlign: 'center'}}>Gender</th>
                    <th style={{...styles.th, width: '18%', textAlign: 'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPets.map((pet) => (
                    <tr 
                      key={pet.pet_id} 
                      style={styles.tableRow}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={styles.petCell}>
                          {pet.image ? (
                            <img 
                              src={`http://localhost:5001/uploads/${pet.image}`} 
                              alt={pet.pet_name}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <div style={styles.avatar}>
                              <i className="fas fa-paw" style={styles.avatarIcon}></i>
                            </div>
                          )}
                          <div style={styles.petInfo}>
                            <div style={styles.petName}>{pet.pet_name}</div>
                            <div style={styles.petBreed}>{pet.breed || 'Mixed Breed'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.speciesText}>{pet.species || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.ageText}>{calculateAge(pet.date_of_birth)}</span>
                      </td>
                      <td style={styles.td}>
                        <div 
                          style={styles.ownerLink}
                          onClick={() => navigate(`/customers/${pet.customer_id}`)}
                        >
                          {pet.owner_first_name && pet.owner_last_name 
                            ? `${pet.owner_first_name} ${pet.owner_last_name}` 
                            : 'Unknown'}
                        </div>
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        {pet.gender ? (
                          <span style={styles.genderBadge}>
                            {pet.gender}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{...styles.td, textAlign: 'right'}}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/pets/${pet.pet_id}`)}
                            style={styles.viewButton}
                            onMouseOver={(e) => e.target.style.backgroundColor = styles.viewButtonHover.backgroundColor}
                            onMouseOut={(e) => e.target.style.backgroundColor = styles.viewButton.backgroundColor}
                          >
                            View
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(pet.pet_id)}
                              style={styles.deleteButton}
                              onMouseOver={(e) => e.target.style.backgroundColor = styles.deleteButtonHover.backgroundColor}
                              onMouseOut={(e) => e.target.style.backgroundColor = styles.deleteButton.backgroundColor}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pets.length > itemsPerPage && (
            <div style={styles.paginationContainer}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} style={styles.paginationEllipsis}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === page ? styles.paginationButtonActive : {})
                    }}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
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
    borderTop: '1px solid #f3f4f6',
    backgroundColor: 'white',
    position: 'sticky',
    bottom: 0,
  },
  paginationButton: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
    minWidth: '40px',
    transition: 'all 0.2s',
  },
  paginationButtonActive: {
    backgroundColor: '#3B82F6',
    color: 'white',
    borderColor: '#3B82F6',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    padding: '0.5rem',
    color: '#9ca3af',
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
};

export default Pets;
