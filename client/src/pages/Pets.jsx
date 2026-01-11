import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPets, deletePet, getSpeciesList } from '../services/petService';
import { useAuth } from '../context/AuthContext';

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [speciesList, setSpeciesList] = useState([]);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchSpeciesList();
  }, []);

  useEffect(() => {
    fetchPets();
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPets();
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>🏥 VetCare Pro</h1>
          <p style={styles.headerSubtitle}>Pro Pet Animal Hospital</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.full_name}</span>
            <span style={styles.userRole}>{user?.role}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <a href="/dashboard" style={styles.navItem}>📊 Dashboard</a>
            <a href="/pets" style={{...styles.navItem, ...styles.navItemActive}}>🐾 Pets</a>
            <a href="/customers" style={styles.navItem}>👥 Customers</a>
            <a href="/appointments" style={styles.navItem}>📅 Appointments</a>
            {user?.role === 'admin' && (
              <a href="/users" style={styles.navItem}>👨‍⚕️ Staff</a>
            )}
          </nav>
        </aside>

        {/* Content Area */}
        <main style={styles.content}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.title}>Pets</h2>
          <p style={styles.subtitle}>Manage all pets in the clinic</p>
        </div>
        <button 
          onClick={() => navigate('/pets/new')}
          style={styles.addButton}
        >
          + Add Pet
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={styles.filterContainer}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by pet name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
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
          <button type="submit" style={styles.searchButton}>
            Search
          </button>
        </form>
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
          {/* Pet Count */}
          <div style={styles.countInfo}>
            Total Pets: <strong>{pets.length}</strong>
            {speciesFilter && ` (Filtered by ${speciesFilter})`}
          </div>

          {/* Pets Table */}
          <div style={styles.tableContainer}>
            {pets.length === 0 ? (
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
                    <th style={styles.th}>Pet Name</th>
                    <th style={styles.th}>Species</th>
                    <th style={styles.th}>Breed</th>
                    <th style={styles.th}>Age</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Gender</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet) => (
                    <tr key={pet.pet_id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={styles.petName}>
                          <span style={styles.emoji}>{getSpeciesEmoji(pet.species)}</span>
                          {pet.pet_name}
                        </div>
                      </td>
                      <td style={styles.td}>{pet.species || '-'}</td>
                      <td style={styles.td}>{pet.breed || '-'}</td>
                      <td style={styles.td}>{calculateAge(pet.date_of_birth)}</td>
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
                      <td style={styles.td}>
                        {pet.gender ? (
                          <span style={pet.gender === 'Male' ? styles.maleBadge : styles.femaleBadge}>
                            {pet.gender}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={pet.is_active ? styles.activeBadge : styles.inactiveBadge}>
                          {pet.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/pets/${pet.pet_id}`)}
                            style={styles.viewButton}
                            title="View Details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/pets/${pet.pet_id}/edit`)}
                            style={styles.editButton}
                            title="Edit Pet"
                          >
                            Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(pet.pet_id)}
                              style={styles.deleteButton}
                              title="Delete Pet"
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
        </>
      )}
        </main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2025 VetCare Pro - Pro Pet Animal Hospital, Mawathagama, Kurunegala
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1e40af',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '1.5rem 0',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
  },
  navItem: {
    padding: '0.75rem 1.5rem',
    textDecoration: 'none',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderLeft: '3px solid #2563eb',
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  filterContainer: {
    marginBottom: '1.5rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  searchInput: {
    flex: 2,
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  selectInput: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  searchButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
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
  countInfo: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '1rem',
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  petName: {
    fontWeight: '500',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  emoji: {
    fontSize: '1.25rem',
  },
  ownerLink: {
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: '500',
  },
  activeBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  inactiveBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  maleBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  femaleBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fce7f3',
    color: '#9f1239',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  editButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  deleteButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  footer: {
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
};

export default Pets;
