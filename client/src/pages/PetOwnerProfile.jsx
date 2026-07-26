import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { getMyPets } from '../services/customerPortalService';
import '../styles/PetOwnerProfile.css';

const speciesIcon = (species) => {
  switch ((species || '').toLowerCase()) {
    case 'dog': return 'fa-dog';
    case 'cat': return 'fa-cat';
    case 'rabbit': return 'fa-carrot';
    case 'bird': return 'fa-dove';
    default: return 'fa-paw';
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const PetOwnerProfile = () => {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState('');

  useEffect(() => {
    const loadPets = async () => {
      try {
        const result = await getMyPets();
        setPets(result.data.pets || []);
      } catch (err) {
        setPetsError(
          err.response?.data?.message || 'Unable to load your pets right now.'
        );
      } finally {
        setPetsLoading(false);
      }
    };

    loadPets();
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItem = (path, icon, label) => (
    <a
      href={path}
      className={`po-profile-nav-item ${location.pathname === path ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); navigate(path); }}
    >
      <i className={`fas ${icon}`}></i> {label}
    </a>
  );

  const initials = customer ? `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}` : '';
  const memberSince = customer?.created_at ? new Date(customer.created_at).getFullYear() : null;

  return (
    <div className="po-profile-page">
      <header className="po-ai-header">
        <div className="po-ai-header-left">
          <div className="po-ai-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="po-ai-logo-title">VetCare Pro</h2>
            <span className="po-ai-mode-badge">Pet Owner</span>
          </div>
        </div>
        <div className="po-ai-header-right">
          {customer && <span className="po-ai-user-name">{customer.first_name} {customer.last_name}</span>}
          <button type="button" className="po-ai-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="po-profile-body">
        {/* Left panel */}
        <aside className="po-profile-sidebar">
          <div className="po-profile-avatar">{initials}</div>
          <h3 className="po-profile-sidebar-name">{customer?.first_name} {customer?.last_name}</h3>
          {memberSince && <p className="po-profile-sidebar-meta">Member since {memberSince}</p>}

          <div className="po-profile-sidebar-contact">
            <p><i className="fas fa-envelope"></i> {customer?.email || '—'}</p>
            <p><i className="fas fa-phone"></i> {customer?.phone || '—'}</p>
          </div>

          <nav className="po-profile-nav">
            {navItem('/pet-owner/profile', 'fa-user-circle', 'My Profile')}
            {navItem('/pet-owner/ai-assistant', 'fa-robot', 'AI Assistant')}
            {navItem('/pet-owner/change-password', 'fa-lock', 'Change Password')}
          </nav>

          <button type="button" className="po-profile-signout" onClick={handleSignOut}>
            <i className="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </aside>

        {/* Main content */}
        <main className="po-profile-main">
          <section className="po-profile-card">
            <h2 className="po-profile-section-title"><i className="fas fa-id-card"></i> My Details</h2>
            <div className="po-profile-details-grid">
              <div><label>Full Name</label><p>{customer?.first_name} {customer?.last_name}</p></div>
              <div><label>Email</label><p>{customer?.email || '—'}</p></div>
              <div><label>Phone</label><p>{customer?.phone || '—'}</p></div>
              <div><label>Alternate Phone</label><p>{customer?.alternate_phone || '—'}</p></div>
              <div><label>Address</label><p>{customer?.address || '—'}</p></div>
              <div><label>City</label><p>{customer?.city || '—'}</p></div>
              <div><label>NIC</label><p>{customer?.nic || '—'}</p></div>
              <div><label>Preferred Contact</label><p style={{ textTransform: 'capitalize' }}>{customer?.preferred_contact_method || '—'}</p></div>
              <div><label>Emergency Contact</label><p>{customer?.emergency_contact || '—'}</p></div>
              <div><label>Emergency Phone</label><p>{customer?.emergency_phone || '—'}</p></div>
            </div>
          </section>

          <section className="po-profile-card">
            <h2 className="po-profile-section-title"><i className="fas fa-paw"></i> My Pets</h2>

            {petsLoading && <p className="po-profile-muted">Loading your pets...</p>}
            {petsError && <p className="po-profile-error">{petsError}</p>}
            {!petsLoading && !petsError && pets.length === 0 && (
              <p className="po-profile-muted">You don&rsquo;t have any pets on file yet.</p>
            )}

            <div className="po-profile-pets-grid">
              {pets.map((pet) => (
                <div key={pet.pet_id} className="po-pet-card">
                  <div className="po-pet-card-header">
                    {pet.photo_url ? (
                      <img
                        src={`http://localhost:3000/uploads/${pet.photo_url}`}
                        alt={pet.pet_name}
                        className="po-pet-photo"
                      />
                    ) : (
                      <div className="po-pet-photo-placeholder">
                        <i className={`fas ${speciesIcon(pet.species)}`}></i>
                      </div>
                    )}
                    <div>
                      <h3 className="po-pet-name">{pet.pet_name}</h3>
                      <p className="po-pet-breed">{pet.breed || pet.species}</p>
                    </div>
                  </div>

                  <div className="po-pet-details-grid">
                    <div><label>Species</label><p>{pet.species || '—'}</p></div>
                    <div><label>Gender</label><p style={{ textTransform: 'capitalize' }}>{pet.gender || '—'}</p></div>
                    <div><label>Date of Birth</label><p>{formatDate(pet.date_of_birth)}</p></div>
                    <div><label>Age</label><p>{pet.age_years != null ? `${pet.age_years} yrs` : '—'}</p></div>
                    <div><label>Color</label><p>{pet.color || '—'}</p></div>
                    <div><label>Weight</label><p>{pet.weight_current != null ? `${pet.weight_current} kg` : '—'}</p></div>
                    <div><label>Neutered</label><p>{pet.is_neutered ? 'Yes' : 'No'}</p></div>
                    <div><label>Insurance</label><p>{pet.insurance_provider || '—'}</p></div>
                  </div>

                  {pet.allergies && (
                    <div className="po-pet-alert">
                      <i className="fas fa-exclamation-triangle"></i> Allergies: {pet.allergies}
                    </div>
                  )}
                  {pet.special_needs && (
                    <div className="po-pet-note">
                      <i className="fas fa-notes-medical"></i> Special needs: {pet.special_needs}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PetOwnerProfile;
