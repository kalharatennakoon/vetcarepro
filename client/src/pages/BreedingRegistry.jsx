import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBreedingRegistry } from '../services/petService';
import Layout from '../components/Layout';
import '../styles/BreedingRegistryModern.css';

const SPECIES_LIST = [
  'Dog', 'Cat', 'Bird', 'Rabbit', 'Guinea Pig', 'Hamster',
  'Parrot', 'Budgie', 'Pigeon', 'Hen',
  'Cow', 'Goat', 'Pig', 'Sheep',
  'Snake', 'Lizard', 'Turtle',
  'Exotic Animal', 'Monkey', 'Deer',
  'Rescue/Admitted Wildlife', 'Other',
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const BreedingRegistry = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ species: '', gender: '', breed: '' });
  const [contactModal, setContactModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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
    ? { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', label: 'Male' }
    : gender === 'female'
    ? { bg: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', label: 'Female' }
    : { bg: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', label: 'Unknown' };

  return (
    <Layout>
      <div className="breed-reg-container">
        {/* Page Header */}
        <div className="breed-reg-header-card">
          <div className="breed-reg-header-content">
            <div className="breed-reg-header-icon">
              <i className="fas fa-heart"></i>
            </div>
            <div>
              <h1 className="breed-reg-header-title">Breeding Registry</h1>
              <p className="breed-reg-header-subtitle">
                Pets listed with owner consent for breeding enquiries. All connections are free of charge.
              </p>
            </div>
          </div>
          <div className="breed-reg-count-box">
            <span className="breed-reg-count-num">{pets.length}</span>
            <span className="breed-reg-count-lbl">Available</span>
          </div>
        </div>

        {/* Filters */}
        <div className="breed-reg-filter-card">
          <select name="species" value={filters.species} onChange={handleFilter} className="breed-reg-filter-select">
            <option value="">All Species</option>
            {SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="gender" value={filters.gender} onChange={handleFilter} className="breed-reg-filter-select">
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
            className="breed-reg-filter-input"
          />
          {(filters.species || filters.gender || filters.breed) && (
            <button onClick={clearFilters} className="breed-reg-btn-clear">
              <i className="fas fa-times"></i> Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="breed-reg-empty-card">
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#ec4899' }}></div>
            <p style={{ color: '#64748b', margin: 0 }}>Loading registry...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="breed-reg-empty-card">
            <i className="fas fa-heart-crack" style={{ fontSize: '3rem', color: '#f9a8d4', marginBottom: '1rem' }}></i>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', margin: 0 }}>No pets match the current filters.</p>
          </div>
        ) : (
          <div className="breed-reg-grid">
            {pets.map(pet => {
              const g = genderColor(pet.gender);
              return (
                <div key={pet.pet_id} className="breed-reg-card">
                  {/* Pet image */}
                  <div className="breed-reg-image-wrap">
                    {pet.photo_url ? (
                      <img
                        src={`${API_URL.replace('/api', '')}/uploads/${pet.photo_url}`}
                        alt={pet.pet_name}
                        className="breed-reg-image"
                      />
                    ) : (
                      <div className="breed-reg-image-placeholder">
                        <i className="fas fa-paw"></i>
                      </div>
                    )}
                    <span
                      className="breed-reg-gender-badge"
                      style={{ backgroundColor: g.bg, color: g.color, border: g.border }}
                    >
                      <i className={`fas fa-${pet.gender === 'male' ? 'mars' : 'venus'}`}></i>
                      {g.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="breed-reg-card-body">
                    <h3 className="breed-reg-pet-name">{pet.pet_name}</h3>
                    <div className="breed-reg-tags-row">
                      <span className="breed-reg-tag">{pet.species}</span>
                      {pet.breed && <span className="breed-reg-tag">{pet.breed}</span>}
                      <span className="breed-reg-tag">{formatAge(pet.date_of_birth)}</span>
                      {pet.color && <span className="breed-reg-tag">{pet.color}</span>}
                    </div>
                    {pet.is_neutered && (
                      <p className="breed-reg-neutered-warning">
                        <i className="fas fa-circle-info"></i>
                        Neutered / Spayed
                      </p>
                    )}
                    {pet.breeding_notes && (
                      <div className="breed-reg-notes-box">
                        <i className="fas fa-quote-left" style={{ marginRight: '0.35rem', color: '#be185d' }}></i>
                        {pet.breeding_notes}
                      </div>
                    )}
                    <div className="breed-reg-location-row">
                      <i className="fas fa-location-dot" style={{ color: '#94a3b8' }}></i>
                      <span>{pet.owner_city || 'Location not specified'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="breed-reg-card-foot">
                    <button onClick={() => setContactModal(pet)} className="breed-reg-btn-contact">
                      <i className="fas fa-phone"></i>
                      Contact Owner
                    </button>
                    <button onClick={() => navigate(`/pets/${pet.pet_id}`)} className="breed-reg-btn-profile">
                      <i className="fas fa-paw"></i>
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
        <div className="breed-reg-modal-backdrop" onClick={() => setContactModal(null)}>
          <div className="breed-reg-modal-box" onClick={e => e.stopPropagation()}>
            <div className="breed-reg-modal-head">
              <h3 className="breed-reg-modal-title">
                <i className="fas fa-phone" style={{ color: '#10b981' }}></i>
                Contact Owner
              </h3>
              <button onClick={() => setContactModal(null)} className="breed-reg-modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                Owner contact details for <strong>{contactModal.pet_name}</strong>. Share these with the enquiring customer to connect both parties.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner</span>
                <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>{contactModal.owner_first_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <i className="fas fa-phone" style={{ marginRight: '0.35rem' }}></i>Phone
                </span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
                  {contactModal.owner_phone || 'Not available'}
                </span>
              </div>
              {contactModal.owner_city && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <i className="fas fa-location-dot" style={{ marginRight: '0.35rem' }}></i>City
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>{contactModal.owner_city}</span>
                </div>
              )}
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '12px', fontSize: '0.825rem', color: '#831843', lineHeight: 1.45 }}>
                <i className="fas fa-info-circle" style={{ marginRight: '0.35rem' }}></i>
                This service is provided free of charge. The clinic acts only as an introduction point.
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BreedingRegistry;
