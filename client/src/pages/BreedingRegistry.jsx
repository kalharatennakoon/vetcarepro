import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBreedingRegistry, getSpeciesList } from '../services/petService';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const BreedingRegistry = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [speciesList, setSpeciesList] = useState([]);
  const [filters, setFilters] = useState({ species: '', gender: '', breed: '' });
  const [contactModal, setContactModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSpeciesList().then(res => setSpeciesList(res.data.species?.map(s => s.species) || [])).catch(() => {});
    fetchPets();
  }, []);

  const fetchPets = async (f = filters) => {
    try {
      setLoading(true);
      const res = await getBreedingRegistry(f);
      setPets(res.data.pets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    const updated = { ...filters, [e.target.name]: e.target.value };
    setFilters(updated);
    fetchPets(updated);
  };

  const clearFilters = () => {
    const reset = { species: '', gender: '', breed: '' };
    setFilters(reset);
    fetchPets(reset);
  };

  const formatAge = (dob) => {
    if (!dob) return 'Unknown age';
    const years = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
    if (years < 1) {
      const months = Math.floor((new Date() - new Date(dob)) / (30.44 * 24 * 60 * 60 * 1000));
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const genderColor = (gender) => gender === 'male'
    ? { bg: '#eff6ff', color: '#1d4ed8', label: 'Male' }
    : gender === 'female'
    ? { bg: '#fdf2f8', color: '#be185d', label: 'Female' }
    : { bg: '#f3f4f6', color: '#6b7280', label: 'Unknown' };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fas fa-heart" style={{ marginRight: '0.5rem', color: '#ec4899' }}></i>
              Breeding Registry
            </h1>
            <p style={styles.subtitle}>Pets listed with owner consent for breeding enquiries. All connections are free of charge.</p>
          </div>
          <div style={styles.countBadge}>
            <span style={styles.countNumber}>{pets.length}</span>
            <span style={styles.countLabel}>Available</span>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <select name="species" value={filters.species} onChange={handleFilter} style={styles.filterSelect}>
            <option value="">All Species</option>
            {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="gender" value={filters.gender} onChange={handleFilter} style={styles.filterSelect}>
            <option value="">Any Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <input
            type="text"
            name="breed"
            value={filters.breed}
            onChange={handleFilter}
            placeholder="Search breed..."
            style={styles.filterInput}
          />
          {(filters.species || filters.gender || filters.breed) && (
            <button onClick={clearFilters} style={styles.clearBtn}>
              <i className="fas fa-times" style={{ marginRight: '0.3rem' }}></i>Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={styles.centerMsg}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '1.75rem', color: '#ec4899' }}></i>
            <p>Loading registry...</p>
          </div>
        ) : pets.length === 0 ? (
          <div style={styles.centerMsg}>
            <i className="fas fa-heart-crack" style={{ fontSize: '2.5rem', color: '#f9a8d4' }}></i>
            <p style={{ color: '#6b7280', marginTop: '0.75rem' }}>No pets match the current filters.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {pets.map(pet => {
              const g = genderColor(pet.gender);
              return (
                <div key={pet.pet_id} style={styles.card}>
                  {/* Pet image */}
                  <div style={styles.cardImageWrap}>
                    {pet.photo_url ? (
                      <img
                        src={`${API_URL.replace('/api', '')}/uploads/${pet.photo_url}`}
                        alt={pet.pet_name}
                        style={styles.cardImage}
                      />
                    ) : (
                      <div style={styles.cardImagePlaceholder}>
                        <i className="fas fa-paw" style={{ fontSize: '2rem', color: '#d1d5db' }}></i>
                      </div>
                    )}
                    <span style={{ ...styles.genderBadge, backgroundColor: g.bg, color: g.color }}>
                      <i className={`fas fa-${pet.gender === 'male' ? 'mars' : 'venus'}`} style={{ marginRight: '0.25rem' }}></i>
                      {g.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={styles.cardBody}>
                    <h3 style={styles.petName}>{pet.pet_name}</h3>
                    <div style={styles.tagRow}>
                      <span style={styles.tag}>{pet.species}</span>
                      {pet.breed && <span style={styles.tag}>{pet.breed}</span>}
                      <span style={styles.tag}>{formatAge(pet.date_of_birth)}</span>
                      {pet.color && <span style={styles.tag}>{pet.color}</span>}
                    </div>
                    {pet.is_neutered && (
                      <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: '0.4rem 0 0' }}>
                        <i className="fas fa-circle-info" style={{ marginRight: '0.3rem' }}></i>
                        Neutered / Spayed
                      </p>
                    )}
                    {pet.breeding_notes && (
                      <p style={styles.breedingNotes}>
                        <i className="fas fa-quote-left" style={{ marginRight: '0.3rem', color: '#ec4899' }}></i>
                        {pet.breeding_notes}
                      </p>
                    )}
                    <div style={styles.ownerRow}>
                      <i className="fas fa-location-dot" style={{ color: '#9ca3af', fontSize: '0.8rem' }}></i>
                      <span style={styles.ownerCity}>{pet.owner_city || 'Location not specified'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={styles.cardFooter}>
                    <button onClick={() => setContactModal(pet)} style={styles.contactBtn}>
                      <i className="fas fa-phone" style={{ marginRight: '0.4rem' }}></i>
                      Contact Owner
                    </button>
                    <button onClick={() => navigate(`/pets/${pet.pet_id}`)} style={styles.profileBtn}>
                      <i className="fas fa-paw" style={{ marginRight: '0.4rem' }}></i>
                      Pet Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Owner Modal */}
      {contactModal && (
        <div style={styles.modalOverlay} onClick={() => setContactModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <i className="fas fa-phone" style={{ marginRight: '0.5rem', color: '#16a34a' }}></i>
                Contact Owner
              </h3>
              <button onClick={() => setContactModal(null)} style={styles.modalClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                Owner contact details for <strong>{contactModal.pet_name}</strong>. Share these with the enquiring customer to connect both parties.
              </p>
              <div style={styles.contactRow}>
                <span style={styles.contactLabel}>Owner</span>
                <span style={styles.contactValue}>{contactModal.owner_first_name}</span>
              </div>
              <div style={styles.contactRow}>
                <span style={styles.contactLabel}>
                  <i className="fas fa-phone" style={{ marginRight: '0.3rem' }}></i>Phone
                </span>
                <span style={{ ...styles.contactValue, fontWeight: '700', color: '#111827', fontSize: '1rem' }}>
                  {contactModal.owner_phone || 'Not available'}
                </span>
              </div>
              {contactModal.owner_city && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>
                    <i className="fas fa-location-dot" style={{ marginRight: '0.3rem' }}></i>City
                  </span>
                  <span style={styles.contactValue}>{contactModal.owner_city}</span>
                </div>
              )}
              <div style={{ marginTop: '1.25rem', padding: '0.85rem', backgroundColor: '#fdf2f8', borderRadius: '8px', fontSize: '0.8rem', color: '#9d174d' }}>
                <i className="fas fa-circle-info" style={{ marginRight: '0.35rem' }}></i>
                This service is provided free of charge. The clinic acts only as an introduction point.
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const styles = {
  container: { fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: '0 0 0.35rem 0' },
  subtitle: { fontSize: '0.9rem', color: '#6b7280', margin: 0 },
  countBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fdf2f8', border: '2px solid #f9a8d4', borderRadius: '12px', padding: '0.75rem 1.25rem', minWidth: '80px' },
  countNumber: { fontSize: '1.75rem', fontWeight: '700', color: '#be185d', lineHeight: 1 },
  countLabel: { fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginTop: '0.2rem' },
  filterBar: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem', alignItems: 'center' },
  filterSelect: { padding: '0.55rem 0.85rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', color: '#374151', backgroundColor: 'white', outline: 'none', minWidth: '150px' },
  filterInput: { padding: '0.55rem 0.85rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', color: '#374151', outline: 'none', minWidth: '180px' },
  clearBtn: { padding: '0.55rem 1rem', backgroundColor: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  centerMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#9ca3af' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 8px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardImageWrap: { position: 'relative', height: '160px', backgroundColor: '#f9fafb' },
  cardImage: { width: '100%', height: '100%', objectFit: 'contain' },
  cardImagePlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  genderBadge: { position: 'absolute', top: '0.6rem', right: '0.6rem', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'flex', alignItems: 'center' },
  cardBody: { padding: '1rem 1.1rem', flex: 1 },
  petName: { fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' },
  tag: { fontSize: '0.72rem', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#374151', padding: '0.15rem 0.5rem', borderRadius: '9999px' },
  breedingNotes: { fontSize: '0.82rem', color: '#374151', margin: '0.5rem 0 0', fontStyle: 'italic', lineHeight: '1.5' },
  ownerRow: { display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.6rem' },
  ownerCity: { fontSize: '0.8rem', color: '#6b7280' },
  cardFooter: { padding: '0.85rem 1.1rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.5rem' },
  contactBtn: { flex: 1, padding: '0.5rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '7px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileBtn: { flex: 1, padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '7px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '380px', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' },
  modalTitle: { margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' },
  modalClose: { background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.1rem', cursor: 'pointer' },
  modalBody: { padding: '1.25rem 1.5rem' },
  contactRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f3f4f6' },
  contactLabel: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  contactValue: { fontSize: '0.9rem', color: '#374151', fontWeight: '500' },
};

export default BreedingRegistry;
