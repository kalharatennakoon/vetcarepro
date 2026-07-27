import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { getMyPets, getPetLabReports, downloadPetLabReport } from '../services/customerPortalService';
import PetOwnerAIWidget from '../components/PetOwnerAIWidget';
import '../styles/PetOwnerProfile.css';

const labReportIcon = (fileType) => (fileType === 'pdf' ? 'fa-file-pdf' : 'fa-file-image');

const formatReportType = (reportType) =>
  (reportType || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

const genderIcon = (gender) => {
  if ((gender || '').toLowerCase() === 'male') return 'fa-mars';
  if ((gender || '').toLowerCase() === 'female') return 'fa-venus';
  return 'fa-question';
};

const PetOwnerProfile = () => {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState('');
  const [labReportsByPet, setLabReportsByPet] = useState({});
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  useEffect(() => {
    const loadPets = async () => {
      try {
        const result = await getMyPets();
        const loadedPets = result.data.pets || [];
        setPets(loadedPets);

        const entries = await Promise.all(
          loadedPets.map(async (pet) => {
            try {
              const reportResult = await getPetLabReports(pet.pet_id);
              return [pet.pet_id, reportResult.reports || []];
            } catch {
              // Non-fatal - the pet card just shows no lab reports section.
              return [pet.pet_id, []];
            }
          })
        );
        setLabReportsByPet(Object.fromEntries(entries));
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

  const handleDownloadReport = async (report) => {
    setDownloadingReportId(report.report_id);
    try {
      await downloadPetLabReport(report.report_id, report.report_name, report.file_type);
    } catch {
      setPetsError('Unable to download that lab report right now.');
    } finally {
      setDownloadingReportId(null);
    }
  };

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
      <header className="po-profile-header">
        <div className="po-profile-header-left">
          <div className="po-profile-header-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="po-profile-header-title">VetCare Pro</h2>
            <span className="po-profile-header-badge">Pet Owner</span>
          </div>
        </div>
        <div className="po-profile-header-right">
          {customer && <span className="po-profile-header-username">{customer.first_name} {customer.last_name}</span>}
        </div>
      </header>

      <div className="po-profile-body">
        {/* Left panel */}
        <aside className="po-profile-sidebar">
          <div className="po-profile-avatar">{initials}</div>
          <h3 className="po-profile-sidebar-name">{customer?.first_name} {customer?.last_name}</h3>
          {memberSince && <p className="po-profile-sidebar-meta">Member since {memberSince}</p>}

          {!petsLoading && (
            <div className="po-profile-sidebar-stat">
              <i className="fas fa-paw"></i> {pets.length} {pets.length === 1 ? 'pet' : 'pets'} on file
            </div>
          )}

          <nav className="po-profile-nav">
            {navItem('/pet-owner/profile', 'fa-user-circle', 'My Profile')}
            {navItem('/pet-owner/change-password', 'fa-lock', 'Change Password')}
          </nav>

          <button type="button" className="po-profile-signout" onClick={handleSignOut}>
            <i className="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </aside>

        {/* Main content */}
        <main className="po-profile-main">
          <div className="po-profile-welcome">
            <h1>Welcome back{customer?.first_name ? `, ${customer.first_name}` : ''}!</h1>
            <p>Here&rsquo;s an overview of your account and your pets.</p>
          </div>

          <section className="po-profile-card">
            <h2 className="po-profile-section-title"><i className="fas fa-id-card"></i> My Details</h2>
            <div className="po-profile-details-grid">
              <div><label>Full Name</label><p>{customer?.first_name} {customer?.last_name}</p></div>
              <div className="po-profile-detail-wide"><label>Email</label><p>{customer?.email || '—'}</p></div>
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

            {petsLoading && (
              <div className="po-profile-loading">
                <span className="po-profile-spinner"></span> Loading your pets...
              </div>
            )}
            {petsError && (
              <p className="po-profile-error"><i className="fas fa-exclamation-circle"></i> {petsError}</p>
            )}
            {!petsLoading && !petsError && pets.length === 0 && (
              <div className="po-profile-empty">
                <i className="fas fa-paw"></i>
                <p>You don&rsquo;t have any pets on file yet.</p>
                <span>Your pets will appear here once the clinic adds them to your account.</span>
              </div>
            )}

            <div className="po-profile-pets-grid">
              {pets.map((pet) => (
                <div key={pet.pet_id} className="po-pet-card">
                  <div className="po-pet-card-header">
                    <div className="po-pet-card-header-info">
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
                    <span className={`po-pet-neutered-badge ${pet.is_neutered ? 'yes' : 'no'}`}>
                      {pet.is_neutered ? 'Neutered' : 'Not Neutered'}
                    </span>
                  </div>

                  <div className="po-pet-details-grid">
                    <div><label>Species</label><p>{pet.species || '—'}</p></div>
                    <div>
                      <label>Gender</label>
                      <p style={{ textTransform: 'capitalize' }}>
                        <i className={`fas ${genderIcon(pet.gender)} po-pet-gender-icon po-pet-gender-${(pet.gender || '').toLowerCase()}`}></i> {pet.gender || '—'}
                      </p>
                    </div>
                    <div><label>Date of Birth</label><p>{formatDate(pet.date_of_birth)}</p></div>
                    <div><label>Age</label><p>{pet.age_years != null ? `${pet.age_years} yrs` : '—'}</p></div>
                    <div><label>Color</label><p>{pet.color || '—'}</p></div>
                    <div><label>Weight</label><p>{pet.weight_current != null ? `${pet.weight_current} kg` : '—'}</p></div>
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

                  {(labReportsByPet[pet.pet_id] || []).length > 0 && (
                    <div className="po-pet-lab-reports">
                      <h4 className="po-pet-lab-reports-title">
                        <i className="fas fa-flask"></i> Lab Reports
                      </h4>
                      {labReportsByPet[pet.pet_id].map((report) => (
                        <div key={report.report_id} className="po-lab-report-item">
                          <div className="po-lab-report-info">
                            <i className={`fas ${labReportIcon(report.file_type)}`}></i>
                            <div>
                              <p className="po-lab-report-name">{report.report_name}</p>
                              <span className="po-lab-report-meta">
                                {formatReportType(report.report_type)} &middot; {formatDate(report.created_at)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="po-lab-report-download-btn"
                            onClick={() => handleDownloadReport(report)}
                            disabled={downloadingReportId === report.report_id}
                            aria-label={`Download ${report.report_name}`}
                          >
                            <i className={`fas ${downloadingReportId === report.report_id ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <PetOwnerAIWidget />
    </div>
  );
};

export default PetOwnerProfile;
