import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getDiseaseCases,
  getDiseaseStatistics,
  getDiseaseCasesByCategory,
  getMLModelStatus,
  assessOutbreakRisk,
  analyzeDiseasePatterns,
  getSpeciesTrends,
  trainMLModel,
  getMLHealth,
  testMLDatabase
} from '../services/diseaseCaseService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DiseaseCases = () => {
  const [activeTab, setActiveTab] = useState('cases');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    species: '',
    disease_category: '',
    severity: '',
    is_contagious: '',
    outcome: '',
    diagnosis_date_from: '',
    diagnosis_date_to: ''
  });
  const [totalCases, setTotalCases] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ML Dashboard state
  const [statistics, setStatistics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [outbreakRisk, setOutbreakRisk] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('Dog');
  const [riskFilters, setRiskFilters] = useState({
    species: '',
    days_lookback: 60
  });
  const [training, setTraining] = useState(false);
  const [mlHealth, setMlHealth] = useState(null);
  const [dbTest, setDbTest] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const isVetOrAdmin = user?.role === 'admin' || user?.role === 'veterinarian';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCases();
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchMLData();
    }
  }, [activeTab, riskFilters]);

  useEffect(() => {
    if (activeTab === 'analytics' && selectedSpecies) {
      fetchTrends(selectedSpecies);
    }
  }, [selectedSpecies, activeTab]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await getDiseaseCases(filters);
      setCases(response.data.cases);
      setTotalCases(response.total);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disease cases');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMLData = async () => {
    try {
      setLoading(true);
      const [statsRes, categoriesRes, modelRes, patternsRes, healthRes] = await Promise.all([
        getDiseaseStatistics(),
        getDiseaseCasesByCategory(),
        getMLModelStatus(),
        analyzeDiseasePatterns(),
        getMLHealth().catch(() => null)
      ]);

      setStatistics(statsRes.data.statistics);
      setCategories(categoriesRes.data.categories);
      setModelStatus(modelRes.models.disease_prediction);
      setPatterns(patternsRes.patterns);
      if (healthRes) {
        setMlHealth(healthRes);
      }
      
      await fetchTrends('Dog');
      await fetchOutbreakRisk();
      
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ML data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const res = await testMLDatabase();
      setDbTest(res);
    } catch (err) {
      setDbTest({ 
        success: false, 
        message: err.response?.data?.message || 'Database test failed' 
      });
    }
  };

  const fetchTrends = async (species) => {
    try {
      const response = await getSpeciesTrends(species);
      setTrends(response.trends);
    } catch (err) {
      console.error('Failed to load trends:', err);
    }
  };

  const fetchOutbreakRisk = async () => {
    try {
      const response = await assessOutbreakRisk(riskFilters);
      setOutbreakRisk(response.risk_assessment);
    } catch (err) {
      console.error('Failed to assess outbreak risk:', err);
    }
  };

  const handleTrainModel = async () => {
    if (!isAdmin) {
      setError('Only administrators can train ML models');
      return;
    }

    try {
      setTraining(true);
      setError('');
      await trainMLModel();
      await fetchMLData();
      alert('Model trained successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to train model');
    } finally {
      setTraining(false);
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
      species: '',
      disease_category: '',
      severity: '',
      is_contagious: '',
      outcome: '',
      diagnosis_date_from: '',
      diagnosis_date_to: ''
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

  const getSeverityBadge = (severity) => {
    const badges = {
      mild: { backgroundColor: '#dcfce7', color: '#166534' },
      moderate: { backgroundColor: '#fef3c7', color: '#92400e' },
      severe: { backgroundColor: '#fed7aa', color: '#9a3412' },
      critical: { backgroundColor: '#fee2e2', color: '#991b1b' }
    };
    return badges[severity] || { backgroundColor: '#f3f4f6', color: '#1f2937' };
  };

  const getOutcomeBadge = (outcome) => {
    const badges = {
      recovered: { backgroundColor: '#dcfce7', color: '#166534' },
      ongoing: { backgroundColor: '#dbeafe', color: '#1e40af' },
      deceased: { backgroundColor: '#f3f4f6', color: '#1f2937' }
    };
    return badges[outcome] || { backgroundColor: '#f3f4f6', color: '#1f2937' };
  };

  const getRiskColor = (level) => {
    const colors = {
      low: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
      medium: { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' },
      high: { backgroundColor: '#fed7aa', color: '#9a3412', borderColor: '#fdba74' },
      critical: { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }
    };
    return colors[level] || { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' };
  };

  const getConfidenceColor = (level) => {
    const colors = {
      very_low: '#dc2626',
      low: '#ca8a04',
      medium: '#2563eb',
      high: '#16a34a'
    };
    return colors[level] || '#4b5563';
  };

  const filteredCases = cases.filter(diseaseCase => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      diseaseCase.pet_name?.toLowerCase().includes(search) ||
      diseaseCase.disease_name?.toLowerCase().includes(search) ||
      diseaseCase.disease_category?.toLowerCase().includes(search) ||
      diseaseCase.symptoms?.toLowerCase().includes(search) ||
      diseaseCase.owner_first_name?.toLowerCase().includes(search) ||
      diseaseCase.owner_last_name?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCases = filteredCases.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.pageHeader}>
            <i className="fas fa-disease" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Disease Management</h1>
              <p style={styles.subtitle}>Track disease cases and monitor outbreak risks with ML analytics ({totalCases} total cases)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isAdmin && activeTab === 'analytics' && (
              <button
                onClick={handleTrainModel}
                disabled={training}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: training ? '#9ca3af' : '#9333ea',
                  cursor: training ? 'not-allowed' : 'pointer'
                }}
              >
                {training ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    Training...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                    Retrain Model
                  </>
                )}
              </button>
            )}
            {isVetOrAdmin && activeTab === 'cases' && (
              <button
                onClick={() => navigate('/disease-cases/create')}
                style={styles.primaryButton}
              >
                <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                Add Disease Case
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <div style={styles.tabsHeader}>
            <button
              onClick={() => setActiveTab('cases')}
              style={activeTab === 'cases' ? styles.tabActive : styles.tab}
            >
              <i className="fas fa-file-medical" style={{ marginRight: '0.5rem' }}></i>
              Cases ({totalCases})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={activeTab === 'analytics' ? styles.tabActive : styles.tab}
            >
              <i className="fas fa-chart-line" style={{ marginRight: '0.5rem' }}></i>
              ML Analytics
            </button>
          </div>
        </div>

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <>
            {/* Filters */}
            <div style={styles.filtersContainer}>
              <div style={styles.filtersHeader}>
                <h2 style={styles.filtersTitle}>Filters</h2>
                <button
                  onClick={clearFilters}
                  style={styles.clearButton}
                >
                  Clear All
                </button>
              </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.filterLabel}>Species</label>
              <select
                name="species"
                value={filters.species}
                onChange={handleFilterChange}
                style={styles.filterInput}
              >
                <option value="">All Species</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Bird">Bird</option>
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Category</label>
              <select
                name="disease_category"
                value={filters.disease_category}
                onChange={handleFilterChange}
                style={styles.filterInput}
              >
                <option value="">All Categories</option>
                <option value="infectious">Infectious</option>
                <option value="parasitic">Parasitic</option>
                <option value="metabolic">Metabolic</option>
                <option value="genetic">Genetic</option>
                <option value="immune_mediated">Immune-Mediated</option>
                <option value="neoplastic">Neoplastic</option>
                <option value="traumatic">Traumatic</option>
                <option value="nutritional">Nutritional</option>
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Severity</label>
              <select
                name="severity"
                value={filters.severity}
                onChange={handleFilterChange}
                style={styles.filterInput}
              >
                <option value="">All Severities</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Outcome</label>
              <select
                name="outcome"
                value={filters.outcome}
                onChange={handleFilterChange}
                style={styles.filterInput}
              >
                <option value="">All Outcomes</option>
                <option value="recovered">Recovered</option>
                <option value="ongoing">Ongoing</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Contagious</label>
              <select
                name="is_contagious"
                value={filters.is_contagious}
                onChange={handleFilterChange}
                style={styles.filterInput}
              >
                <option value="">All Cases</option>
                <option value="true">Contagious Only</option>
                <option value="false">Non-Contagious</option>
              </select>
            </div>

            <div>
              <label style={styles.filterLabel}>Date From</label>
              <input
                type="date"
                name="diagnosis_date_from"
                value={filters.diagnosis_date_from}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>

            <div>
              <label style={styles.filterLabel}>Date To</label>
              <input
                type="date"
                name="diagnosis_date_to"
                value={filters.diagnosis_date_to}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>
          </div>

          <div>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              placeholder="Search by pet name, disease, symptoms, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Results Summary */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Showing <strong>{currentCases.length}</strong> of{' '}
            <strong>{filteredCases.length}</strong> disease cases
            {totalCases > filteredCases.length && ` (${totalCases} total in database)`}
          </p>
        </div>

        {/* Cases Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
          </div>
        ) : currentCases.length === 0 ? (
          <div style={styles.emptyState}>
            <svg style={styles.emptyStateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 style={styles.emptyStateTitle}>No disease cases found</h3>
            <p style={styles.emptyStateText}>Try adjusting your filters or search terms</p>
            {isVetOrAdmin && (
              <button
                onClick={() => navigate('/disease-cases/create')}
                style={styles.primaryButton}
              >
                Add First Disease Case
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        Pet & Owner
                      </th>
                      <th style={styles.th}>
                        Disease
                      </th>
                      <th style={styles.th}>
                        Diagnosis Date
                      </th>
                      <th style={styles.th}>
                        Severity
                      </th>
                      <th style={styles.th}>
                        Outcome
                      </th>
                      <th style={styles.th}>
                        Status
                      </th>
                      <th style={styles.thRight}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCases.map((diseaseCase) => (
                      <tr key={diseaseCase.case_id} style={styles.tr}>
                        <td style={styles.td}>
                          <div>
                            <div style={styles.petName}>
                              {diseaseCase.pet_name}
                            </div>
                            <div style={styles.petDetails}>
                              {diseaseCase.species} • {diseaseCase.breed}
                            </div>
                            <div style={styles.petOwner}>
                              Owner: {diseaseCase.owner_first_name} {diseaseCase.owner_last_name}
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div>
                            <div style={styles.diseaseName}>
                              {diseaseCase.disease_name}
                            </div>
                            <div style={styles.diseaseCategory}>
                              {diseaseCase.disease_category?.replace('_', ' ')}
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {formatDate(diseaseCase.diagnosis_date)}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...getSeverityBadge(diseaseCase.severity) }}>
                            {diseaseCase.severity || 'Unknown'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...getOutcomeBadge(diseaseCase.outcome) }}>
                            {diseaseCase.outcome || 'Unknown'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {diseaseCase.is_contagious ? (
                            <span style={{ ...styles.badge, backgroundColor: '#fee2e2', color: '#991b1b' }}>
                              Contagious
                            </span>
                          ) : (
                            <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#166534' }}>
                              Non-Contagious
                            </span>
                          )}
                        </td>
                        <td style={styles.tdRight}>
                          <button
                            onClick={() => navigate(`/disease-cases/${diseaseCase.case_id}`)}
                            style={{ ...styles.actionButton, color: '#3B82F6', marginRight: 0 }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.paginationContainer}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} style={styles.paginationEllipsis}>...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={currentPage === page ? styles.paginationButtonActive : styles.paginationButton}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={currentPage === totalPages ? styles.paginationButtonDisabled : styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </>
    )}

        {/* ML Analytics Tab */}
        {activeTab === 'analytics' && (
          <>
            {/* Model Status Card */}
            {modelStatus && (
              <div style={styles.modelStatusCard}>
                <div style={styles.modelStatusHeader}>
                  <div>
                    <h3 style={styles.modelStatusTitle}>ML Model Status</h3>
                    <div>
                      <p style={styles.modelStatusText}>
                        Status: <span style={{ ...styles.modelStatusHighlight, color: '#16a34a' }}>
                          {modelStatus.loaded && modelStatus.trained ? 'Active' : 'Not Trained'}
                        </span>
                      </p>
                      <p style={styles.modelStatusText}>
                        Data Size: <span style={styles.modelStatusHighlight}>{modelStatus.data_size} cases</span>
                      </p>
                      {modelStatus.training_date && (
                        <p style={styles.modelStatusText}>
                          Last Trained: <span style={styles.modelStatusHighlight}>
                            {new Date(modelStatus.training_date).toLocaleDateString()}
                          </span>
                        </p>
                      )}
                      {modelStatus.confidence && (
                        <p style={styles.modelStatusText}>
                          Confidence: <span style={{ ...styles.modelStatusHighlight, color: getConfidenceColor(modelStatus.confidence.level) }}>
                            {modelStatus.confidence.level.toUpperCase()} ({modelStatus.confidence.accuracy_range || 'N/A'})
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={styles.modelStatusCount}>{modelStatus.data_size}</div>
                    <div style={styles.modelStatusLabel}>Total Cases</div>
                  </div>
                </div>
                {modelStatus.confidence && (
                  <div style={styles.modelNote}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#4b5563' }}>
                      <strong>Recommendation:</strong> {modelStatus.confidence.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ML System Health Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Service Health Card */}
              <div style={styles.tableContainer}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                    <i className="fas fa-heartbeat" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>
                    ML Service Health
                  </h3>
                </div>
                <div style={{ padding: '1rem' }}>
                  {mlHealth ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280' }}>Service:</span>
                        <span style={{ fontWeight: '600' }}>{mlHealth.service}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280' }}>Status:</span>
                        <span style={{ fontWeight: '600', color: mlHealth.status === 'healthy' ? '#10b981' : '#ef4444' }}>
                          {mlHealth.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <span style={{ color: '#6b7280' }}>Version:</span>
                        <span style={{ fontWeight: '600' }}>{mlHealth.version}</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: '#6b7280', textAlign: 'center', margin: '1rem 0' }}>
                      ML service not available
                    </p>
                  )}
                </div>
              </div>

              {/* Database Connection Test Card */}
              <div style={styles.tableContainer}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                    <i className="fas fa-database" style={{ marginRight: '0.5rem', color: '#3b82f6' }}></i>
                    Database Connection
                  </h3>
                </div>
                <div style={{ padding: '1rem' }}>
                  <button
                    onClick={testDatabaseConnection}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <i className="fas fa-plug"></i> Test Connection
                  </button>
                  
                  {dbTest && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      borderRadius: '6px',
                      backgroundColor: dbTest.success ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${dbTest.success ? '#10b981' : '#ef4444'}`
                    }}>
                      <div style={{ color: dbTest.success ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        {dbTest.success ? 'SUCCESS' : 'FAILED'}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                        {dbTest.message}
                      </div>
                      {dbTest.timestamp && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                          {new Date(dbTest.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ML Features Card */}
              <div style={styles.tableContainer}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                    <i className="fas fa-brain" style={{ marginRight: '0.5rem', color: '#8b5cf6' }}></i>
                    ML Features
                  </h3>
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                    <i className="fas fa-virus" style={{ color: '#3b82f6', marginTop: '0.25rem' }}></i>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.875rem' }}>Disease Prediction</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Predict disease outbreaks and trends</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                    <i className="fas fa-chart-line" style={{ color: '#3b82f6', marginTop: '0.25rem' }}></i>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.875rem' }}>Sales Forecasting</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Forecast future revenue and sales</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <i className="fas fa-boxes" style={{ color: '#3b82f6', marginTop: '0.25rem' }}></i>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.875rem' }}>Inventory Optimization</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Predict stock demand and reordering</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Overview */}
            {statistics && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statCardContent}>
                    <div>
                      <p style={styles.statLabel}>Total Cases</p>
                      <p style={styles.statValue}>{statistics.total_cases}</p>
                    </div>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}>
                      <svg style={{ width: '32px', height: '32px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statCardContent}>
                    <div>
                      <p style={styles.statLabel}>Affected Pets</p>
                      <p style={styles.statValue}>{statistics.affected_pets}</p>
                    </div>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}>
                      <svg style={{ width: '32px', height: '32px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statCardContent}>
                    <div>
                      <p style={styles.statLabel}>Contagious Cases</p>
                      <p style={{ ...styles.statValue, color: '#dc2626' }}>{statistics.contagious_cases}</p>
                    </div>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fee2e2' }}>
                      <svg style={{ width: '32px', height: '32px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statCardContent}>
                    <div>
                      <p style={styles.statLabel}>Recovery Rate</p>
                      <p style={{ ...styles.statValue, color: '#16a34a' }}>
                        {statistics.total_cases > 0 
                          ? `${Math.round((statistics.recovered_cases / statistics.total_cases) * 100)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div style={{ ...styles.statIcon, backgroundColor: '#f3e8ff' }}>
                      <svg style={{ width: '32px', height: '32px', color: '#9333ea' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Outbreak Risk Assessment */}
            {outbreakRisk && (
              <div style={styles.riskCard}>
                <h3 style={styles.riskTitle}>Outbreak Risk Assessment</h3>
                
                <div style={styles.riskInputGrid}>
                  <div>
                    <label style={styles.filterLabel}>Species</label>
                    <select
                      value={riskFilters.species}
                      onChange={(e) => setRiskFilters(prev => ({ ...prev, species: e.target.value }))}
                      style={styles.filterInput}
                    >
                      <option value="">All Species</option>
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Rabbit">Rabbit</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.filterLabel}>Days Lookback</label>
                    <select
                      value={riskFilters.days_lookback}
                      onChange={(e) => setRiskFilters(prev => ({ ...prev, days_lookback: parseInt(e.target.value) }))}
                      style={styles.filterInput}
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="60">Last 60 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="180">Last 6 Months</option>
                    </select>
                  </div>
                </div>

                <div style={{ ...styles.riskResultCard, ...getRiskColor(outbreakRisk.risk_level) }}>
                  <div style={styles.riskResultHeader}>
                    <div>
                      <h4 style={styles.riskLevel}>{outbreakRisk.risk_level} Risk</h4>
                      <p style={styles.riskScore}>Risk Score: {outbreakRisk.risk_score}/10</p>
                    </div>
                    <div style={styles.riskIcon}>
                      {outbreakRisk.risk_level === 'critical' ? (
                        <i className="fas fa-radiation"></i>
                      ) : outbreakRisk.risk_level === 'high' ? (
                        <i className="fas fa-exclamation-triangle"></i>
                      ) : outbreakRisk.risk_level === 'medium' ? (
                        <i className="fas fa-bolt"></i>
                      ) : (
                        <i className="fas fa-check-circle"></i>
                      )}
                    </div>
                  </div>

                  <div style={styles.riskMetricsGrid}>
                    <div style={styles.riskMetric}>
                      <p style={styles.riskMetricLabel}>Cases Analyzed</p>
                      <p style={styles.riskMetricValue}>{outbreakRisk.case_count}</p>
                    </div>
                    <div style={styles.riskMetric}>
                      <p style={styles.riskMetricLabel}>Contagious</p>
                      <p style={styles.riskMetricValue}>{outbreakRisk.contagious_cases}</p>
                    </div>
                    <div style={styles.riskMetric}>
                      <p style={styles.riskMetricLabel}>Time Period</p>
                      <p style={styles.riskMetricValue}>{outbreakRisk.days_analyzed}d</p>
                    </div>
                    <div style={styles.riskMetric}>
                      <p style={styles.riskMetricLabel}>Confidence</p>
                      <p style={{ ...styles.riskMetricValue, fontSize: '1.125rem', textTransform: 'uppercase' }}>{outbreakRisk.confidence}</p>
                    </div>
                  </div>

                  {outbreakRisk.reasons && outbreakRisk.reasons.length > 0 && (
                    <div style={styles.riskFactors}>
                      <p style={styles.riskFactorsTitle}>Risk Factors:</p>
                      <ul style={styles.riskFactorsList}>
                        {outbreakRisk.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={styles.riskRecommendation}>
                    <p style={styles.riskRecommendationTitle}>Recommendation:</p>
                    <p style={styles.riskRecommendationText}>{outbreakRisk.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Sub-Tabs */}
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsCardHeader}>
                <nav style={{ display: 'flex', gap: '2rem' }} aria-label="Analytics Tabs">
                  <button
                    onClick={() => {}}
                    style={{ padding: '1rem 0.25rem', border: 'none', borderBottom: '2px solid #3B82F6', backgroundColor: 'transparent', fontSize: '0.875rem', fontWeight: '500', color: '#2563eb', cursor: 'pointer' }}
                  >
                    Overview
                  </button>
                </nav>
              </div>

              <div style={styles.analyticsCardContent}>
                {/* Overview - Disease Categories */}
                {categories && (
                  <div>
                    <h3 style={styles.analyticsCardTitle}>Disease Categories</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {categories.map((category, index) => (
                        <div key={index} style={styles.categoryCard}>
                          <div style={styles.categoryHeader}>
                            <div>
                              <h4 style={styles.categoryName}>
                                {category.disease_category.replace('_', ' ')}
                              </h4>
                              <p style={styles.categoryDescription}>
                                Affected Species: {category.affected_species}
                              </p>
                            </div>
                            <div>
                              <p style={styles.categoryCount}>{category.case_count}</p>
                              <p style={styles.categoryCountLabel}>cases</p>
                            </div>
                          </div>
                          <div style={styles.categoryMetricsGrid}>
                            <div style={styles.categoryMetric}>
                              <p style={styles.categoryMetricLabel}>Contagious</p>
                              <p style={styles.categoryMetricValue}>{category.contagious_count}</p>
                            </div>
                            <div style={styles.categoryMetric}>
                              <p style={styles.categoryMetricLabel}>Avg Age</p>
                              <p style={styles.categoryMetricValue}>{parseFloat(category.avg_age).toFixed(1)} months</p>
                            </div>
                            <div style={styles.categoryMetric}>
                              <p style={styles.categoryMetricLabel}>Percentage</p>
                              <p style={styles.categoryMetricValue}>
                                {statistics ? `${Math.round((category.case_count / statistics.total_cases) * 100)}%` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ML Patterns */}
                    {patterns && (
                      <div style={{ marginTop: '2rem' }}>
                        <h3 style={styles.analyticsCardTitle}>Disease Patterns (ML Clustering)</h3>
                        {patterns.status === 'success' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1rem' }}>
                              ML clustering identified <strong>{patterns.patterns_found}</strong> distinct disease patterns
                            </p>
                            {patterns.patterns.map((pattern, index) => (
                              <div key={index} style={styles.patternCard}>
                                <div style={styles.categoryHeader}>
                                  <div>
                                    <h4 style={styles.categoryName}>
                                      Pattern #{pattern.pattern_id + 1}
                                    </h4>
                                    <p style={styles.categoryDescription}>
                                      Primary: {pattern.primary_species} • Category: {pattern.common_category}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ ...styles.categoryCount, color: '#9333ea' }}>{pattern.case_count}</p>
                                    <p style={styles.categoryCountLabel}>cases</p>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0.5rem' }}>
                                    <p style={styles.categoryMetricLabel}>Avg Age</p>
                                    <p style={styles.categoryMetricValue}>{pattern.avg_age ? pattern.avg_age.toFixed(1) : 'N/A'} mo</p>
                                  </div>
                                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0.5rem' }}>
                                    <p style={styles.categoryMetricLabel}>Contagious</p>
                                    <p style={styles.categoryMetricValue}>{pattern.contagious_percentage ? pattern.contagious_percentage.toFixed(1) : '0'}%</p>
                                  </div>
                                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0.5rem' }}>
                                    <p style={styles.categoryMetricLabel}>Species Count</p>
                                    <p style={styles.categoryMetricValue}>{pattern.affected_species ? Object.keys(pattern.affected_species).length : 0}</p>
                                  </div>
                                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0.5rem' }}>
                                    <p style={styles.categoryMetricLabel}>Diseases</p>
                                    <p style={styles.categoryMetricValue}>{pattern.common_diseases ? Object.keys(pattern.common_diseases).length : 0}</p>
                                  </div>
                                </div>
                                {pattern.affected_species && (
                                  <div style={{ marginTop: '0.75rem', backgroundColor: 'white', borderRadius: '4px', padding: '0.5rem' }}>
                                    <p style={{ ...styles.categoryMetricLabel, marginBottom: '0.25rem' }}>Species Distribution:</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                      {Object.entries(pattern.affected_species).map(([species, count]) => (
                                        <span key={species} style={styles.speciesBadge}>
                                          {species}: {count}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#4b5563' }}>{patterns.reason || 'Pattern analysis unavailable'}</p>
                        )}
                      </div>
                    )}

                    {/* Species Trends */}
                    {trends && (
                      <div style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={styles.analyticsCardTitle}>Disease Trends</h3>
                          <select
                            value={selectedSpecies}
                            onChange={(e) => setSelectedSpecies(e.target.value)}
                            style={styles.filterInput}
                          >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Rabbit">Rabbit</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <div style={styles.statsGrid}>
                            <div style={styles.trendCard}>
                              <p style={styles.trendLabel}>Total Cases</p>
                              <p style={styles.trendValue}>{trends.total_cases}</p>
                            </div>
                            <div style={{ ...styles.trendCard, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                              <p style={styles.trendLabel}>Avg Age at Diagnosis</p>
                              <p style={{ ...styles.trendValue, color: '#10b981' }}>
                                {trends.avg_age_at_diagnosis ? trends.avg_age_at_diagnosis.toFixed(1) : 'N/A'} mo
                              </p>
                            </div>
                            <div style={{ ...styles.trendCard, backgroundColor: 'rgba(220, 38, 38, 0.05)' }}>
                              <p style={styles.trendLabel}>Contagious %</p>
                              <p style={{ ...styles.trendValue, color: '#dc2626' }}>
                                {trends.contagious_percentage ? trends.contagious_percentage.toFixed(1) : '0'}%
                              </p>
                            </div>
                          </div>

                          {trends.disease_distribution && (
                            <div style={styles.categoryCard}>
                              <h4 style={styles.categoryName}>Disease Distribution</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {Object.entries(trends.disease_distribution).map(([category, count]) => (
                                  <div key={category} style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '160px', fontSize: '0.875rem', color: '#374151', textTransform: 'capitalize' }}>
                                      {category.replace('_', ' ')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                                        <div
                                          style={{ 
                                            backgroundColor: '#2563eb',
                                            borderRadius: '9999px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            padding: '0 0.5rem',
                                            width: `${(count / trends.total_cases) * 100}%`,
                                            minWidth: '30px'
                                          }}
                                        >
                                          <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>{count}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {trends.most_common_diseases && (
                            <div style={styles.categoryCard}>
                              <h4 style={styles.categoryName}>Most Common Diseases</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {Object.entries(trends.most_common_diseases).slice(0, 5).map(([disease, count], index) => (
                                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{disease}</span>
                                    <span style={styles.speciesBadge}>
                                      {count} {count === 1 ? 'case' : 'cases'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {trends.severity_distribution && (
                            <div style={styles.categoryCard}>
                              <h4 style={styles.categoryName}>Severity Distribution</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                {Object.entries(trends.severity_distribution).map(([severity, count]) => (
                                  <div key={severity} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{count}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{severity}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
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
  tabsContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    border: '1px solid #e5e7eb',
  },
  tabsHeader: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 1.5rem',
    gap: '2rem',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '1rem 0.25rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #3B82F6',
    padding: '1rem 0.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#3B82F6',
    cursor: 'pointer',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  filtersTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: '#3B82F6',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  filterLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1e40af',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 0',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '3rem 1rem',
    textAlign: 'center',
  },
  emptyStateIcon: {
    width: '48px',
    height: '48px',
    color: '#9ca3af',
    margin: '0 auto 1rem',
  },
  emptyStateTitle: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  emptyStateText: {
    fontSize: '0.875rem',
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
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '1rem 1.5rem',
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
  thRight: {
    backgroundColor: '#f9fafb',
    padding: '1rem 1.5rem',
    textAlign: 'right',
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
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  tdRight: {
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    textAlign: 'right',
  },
  petName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
  },
  petDetails: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  petOwner: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  diseaseName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
  },
  diseaseCategory: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
    display: 'inline-block',
  },
  actionButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '0.75rem',
    padding: '0.25rem 0.5rem',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '8px',
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
    borderRadius: '8px',
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
    borderRadius: '8px',
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    color: '#9ca3af',
    padding: '0.5rem',
    fontSize: '0.875rem',
  },
  // Analytics Tab Styles
  modelStatusCard: {
    background: 'linear-gradient(to right, #eff6ff, #f3e8ff)',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  modelStatusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelStatusTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  modelStatusText: {
    fontSize: '0.875rem',
    color: '#4b5563',
    marginBottom: '0.25rem',
  },
  modelStatusHighlight: {
    fontWeight: '600',
  },
  modelStatusCount: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'right',
  },
  modelStatusLabel: {
    fontSize: '0.875rem',
    color: '#4b5563',
    textAlign: 'right',
  },
  modelNote: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: '#4b5563',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  statCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  statIcon: {
    padding: '0.75rem',
    borderRadius: '50%',
  },
  riskCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  riskTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  riskInputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  riskResultCard: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  riskResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  riskLevel: {
    fontSize: '1.5rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  riskScore: {
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  },
  riskIcon: {
    fontSize: '2rem',
  },
  riskMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  riskMetric: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  riskMetricLabel: {
    fontSize: '0.75rem',
    opacity: 0.75,
    marginBottom: '0.25rem',
  },
  riskMetricValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  riskFactors: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '0.75rem',
  },
  riskFactorsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  riskFactorsList: {
    listStyle: 'disc',
    paddingLeft: '1.5rem',
    fontSize: '0.875rem',
    margin: 0,
  },
  riskRecommendation: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  riskRecommendationTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  riskRecommendationText: {
    fontSize: '0.875rem',
  },
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  analyticsCardHeader: {
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 1.5rem',
  },
  analyticsCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  analyticsCardContent: {
    padding: '1.5rem',
  },
  categoryCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
  },
  categoryName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  categoryDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  categoryCount: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'right',
  },
  categoryCountLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textAlign: 'right',
  },
  categoryMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginTop: '0.75rem',
  },
  categoryMetric: {
    padding: '0.5rem',
  },
  categoryMetricLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  categoryMetricValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  patternCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    backgroundColor: '#f9fafb',
  },
  trendCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
  },
  trendLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
  },
  trendValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#2563eb',
  },
  speciesBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '0.75rem',
    borderRadius: '4px',
    display: 'inline-block',
  },
};

export default DiseaseCases;
