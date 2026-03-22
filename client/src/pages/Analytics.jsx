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
  trainMLModel
} from '../services/diseaseCaseService';
import {
  getSalesForecast,
  getSalesTrends,
  getReorderSuggestions,
  trainSalesModel,
  trainInventoryModel
} from '../services/predictionService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Analytics = () => {
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
  const [analyticsPeriod, setAnalyticsPeriod] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [outbreakRisk, setOutbreakRisk] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('Dog');
  const [riskFilters, setRiskFilters] = useState({
    species: '',
  });
  const [speciesList] = useState([
    'Dog', 'Cat', 'Bird', 'Rabbit', 'Guinea Pig', 'Hamster',
    'Parrot', 'Budgie', 'Pigeon', 'Hen',
    'Cow', 'Goat', 'Pig', 'Sheep',
    'Snake', 'Lizard', 'Turtle',
    'Exotic Animal', 'Monkey', 'Deer',
    'Rescue/Admitted Wildlife', 'Other',
  ]);
  const [training, setTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);
  const [salesTraining, setSalesTraining] = useState(false);
  const [salesTrainSuccess, setSalesTrainSuccess] = useState(false);
  const [inventoryTraining, setInventoryTraining] = useState(false);
  const [inventoryTrainSuccess, setInventoryTrainSuccess] = useState(false);

  // Sales Forecast State
  const [salesData, setSalesData] = useState({
    forecast: null,
    trends: null
  });
  const [salesPeriod, setSalesPeriod] = useState(30);

  // Inventory Forecast State
  const [inventoryData, setInventoryData] = useState({
    forecast: null,
    reorderSuggestions: null
  });
  const [inventoryDays, setInventoryDays] = useState(30);

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
  }, [analyticsPeriod]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchMLData();
    } else if (activeTab === 'sales') {
      fetchSalesData();
    } else if (activeTab === 'inventory') {
      fetchInventoryData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchOutbreakRisk();
    }
  }, [riskFilters]);

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

  const getAnalyticsDateFrom = () => {
    if (!analyticsPeriod || analyticsPeriod === 'all') return undefined;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(analyticsPeriod));
    return d.toISOString().slice(0, 10);
  };

  const fetchMLData = async () => {
    try {
      setLoading(true);
      const dateFrom = getAnalyticsDateFrom();
      const [statsRes, categoriesRes, modelRes] = await Promise.all([
        getDiseaseStatistics({ dateFrom }),
        getDiseaseCasesByCategory({ dateFrom }),
        getMLModelStatus()
      ]);

      setStatistics(statsRes.data.statistics);
      setCategories(categoriesRes.data.categories);
      setModelStatus(modelRes.models.disease_prediction);

      try {
        const patternsRes = await analyzeDiseasePatterns();
        setPatterns(patternsRes.patterns);
      } catch (patternsErr) {
        setPatterns({ status: 'failed', reason: patternsErr.response?.data?.message || 'Pattern analysis unavailable' });
      }

      await fetchTrends(selectedSpecies);
      await fetchOutbreakRisk();

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ML data');
      console.error(err);
    } finally {
      setLoading(false);
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
      const days = analyticsPeriod === 'all' ? undefined : parseInt(analyticsPeriod);
      const response = await assessOutbreakRisk({ ...riskFilters, ...(days ? { days_lookback: days } : {}) });
      setOutbreakRisk(response.risk_assessment);
    } catch (err) {
      console.error('Failed to assess outbreak risk:', err);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const [forecastRes, trendsRes] = await Promise.all([
        getSalesForecast(salesPeriod).catch(() => ({ success: false })),
        getSalesTrends().catch(() => ({ success: false }))
      ]);

      setSalesData({
        forecast: forecastRes,
        trends: trendsRes
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const suggestionsRes = await getReorderSuggestions().catch(() => ({ success: false }));

      setInventoryData({
        forecast: null,
        reorderSuggestions: suggestionsRes
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory data');
      console.error(err);
    } finally {
      setLoading(false);
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
      setTrainSuccess(true);
      setTimeout(() => setTrainSuccess(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to train model');
    } finally {
      setTraining(false);
    }
  };

  const handleTrainSalesModel = async () => {
    setSalesTraining(true);
    setSalesTrainSuccess(false);
    setError('');
    try {
      await trainSalesModel();
      await fetchSalesData();
      setSalesTrainSuccess(true);
      setTimeout(() => setSalesTrainSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to train sales model');
    } finally {
      setSalesTraining(false);
    }
  };

  const handleTrainInventoryModel = async () => {
    setInventoryTraining(true);
    setInventoryTrainSuccess(false);
    setError('');
    try {
      await trainInventoryModel();
      await fetchInventoryData();
      setInventoryTrainSuccess(true);
      setTimeout(() => setInventoryTrainSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to train inventory model');
    } finally {
      setInventoryTraining(false);
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
            <i className="fas fa-chart-line" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Analytics & Insights</h1>
              <p style={styles.subtitle}>Disease tracking, outbreak predictions, sales forecasting, and inventory demand analysis</p>
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
            {isAdmin && activeTab === 'sales' && (
              <button
                onClick={handleTrainSalesModel}
                disabled={salesTraining}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: salesTraining ? '#9ca3af' : '#3b82f6',
                  cursor: salesTraining ? 'not-allowed' : 'pointer'
                }}
              >
                <i className={`fas ${salesTraining ? 'fa-spinner fa-spin' : 'fa-rotate'}`} style={{ marginRight: '0.5rem' }}></i>
                {salesTraining ? 'Training...' : 'Retrain Sales Model'}
              </button>
            )}
            {isAdmin && activeTab === 'inventory' && (
              <button
                onClick={handleTrainInventoryModel}
                disabled={inventoryTraining}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: inventoryTraining ? '#9ca3af' : '#10b981',
                  cursor: inventoryTraining ? 'not-allowed' : 'pointer'
                }}
              >
                <i className={`fas ${inventoryTraining ? 'fa-spinner fa-spin' : 'fa-rotate'}`} style={{ marginRight: '0.5rem' }}></i>
                {inventoryTraining ? 'Training...' : 'Retrain Inventory Model'}
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
        {trainSuccess && (
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            <i className="fas fa-check-circle"></i>
            Disease prediction model trained successfully!
          </div>
        )}
        {salesTrainSuccess && (
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            <i className="fas fa-check-circle"></i>
            Sales forecasting model trained successfully! Forecasts have been updated.
          </div>
        )}
        {inventoryTrainSuccess && (
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            <i className="fas fa-check-circle"></i>
            Inventory forecasting model trained successfully! Recommendations have been updated.
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <div style={styles.tabsHeader}>
            <button
              onClick={() => setActiveTab('cases')}
              style={activeTab === 'cases' ? styles.tabActive : styles.tab}
            >
              <i className="fas fa-virus" style={{ marginRight: '0.5rem' }}></i>
              Disease Cases
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={activeTab === 'analytics' ? styles.tabActive : styles.tab}
            >
              <i className="fas fa-chart-pie" style={{ marginRight: '0.5rem' }}></i>
              Disease Analytics
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('sales')}
                style={activeTab === 'sales' ? styles.tabActive : styles.tab}
              >
                <i className="fas fa-dollar-sign" style={{ marginRight: '0.5rem' }}></i>
                Sales Forecasting
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('inventory')}
                style={activeTab === 'inventory' ? styles.tabActive : styles.tab}
              >
                <i className="fas fa-boxes" style={{ marginRight: '0.5rem' }}></i>
                Inventory Demand
              </button>
            )}
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
                {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
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
            Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredCases.length)}</strong> of{' '}
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
            {/* Period selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Showing data for</span>
              {[
                { label: 'Last 30 days', value: '30' },
                { label: 'Last 90 days', value: '90' },
                { label: 'Last 6 months', value: '180' },
                { label: 'Last 1 year', value: '365' },
                { label: 'Last 2 years', value: '730' },
                { label: 'Last 5 years', value: '1825' },
                { label: 'All time', value: 'all' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnalyticsPeriod(opt.value)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: analyticsPeriod === opt.value ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: analyticsPeriod === opt.value ? '#eff6ff' : 'white',
                    color: analyticsPeriod === opt.value ? '#2563eb' : '#6b7280',
                    fontSize: '0.78rem',
                    fontWeight: analyticsPeriod === opt.value ? '600' : '400',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Model Status — compact strip */}
            {modelStatus && (isAdmin || (modelStatus.loaded && modelStatus.trained)) && (
              <div style={styles.modelStatusCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: modelStatus.loaded && modelStatus.trained ? '#16a34a' : '#dc2626', display: 'inline-block', flexShrink: 0 }}></span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Disease Prediction Model</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px', backgroundColor: modelStatus.loaded && modelStatus.trained ? '#dcfce7' : '#fee2e2', color: modelStatus.loaded && modelStatus.trained ? '#15803d' : '#dc2626' }}>
                      {modelStatus.loaded && modelStatus.trained ? 'Active' : 'Not Trained'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#4b5563' }}><strong style={{ color: '#1f2937' }}>{modelStatus.data_size}</strong> cases trained</span>
                    {modelStatus.training_date && (
                      <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>Trained: <strong style={{ color: '#1f2937' }}>{new Date(modelStatus.training_date).toLocaleString()}</strong></span>
                    )}
                    {modelStatus.confidence && (
                      <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                        Confidence: <strong style={{ color: getConfidenceColor(modelStatus.confidence.level) }}>{modelStatus.confidence.level.toUpperCase()} ({modelStatus.confidence.accuracy_range || 'N/A'})</strong>
                      </span>
                    )}
                  </div>
                </div>
                {modelStatus.confidence?.recommendation && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#4b5563' }}>
                    <i className="fas fa-lightbulb" style={{ color: '#f59e0b', marginRight: '0.35rem' }}></i>
                    {modelStatus.confidence.recommendation}
                  </p>
                )}
                <p style={styles.cardHint}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  The more cases recorded, the better the predictions. Retrain after adding a batch of new cases to keep results accurate.
                </p>
              </div>
            )}

            {/* Statistics Overview */}
            {statistics && (
              <>
                <div style={styles.statsGrid}>
                  {[
                    { label: 'Total Cases',   value: statistics.total_cases, color: '#2563eb', bg: '#dbeafe', icon: 'fa-file-medical', clickable: true },
                    { label: 'Affected Pets', value: statistics.affected_pets, color: '#16a34a', bg: '#dcfce7', icon: 'fa-paw' },
                    { label: 'Contagious',    value: statistics.contagious_cases, color: '#dc2626', bg: '#fee2e2', icon: 'fa-triangle-exclamation' },
                    { label: 'Recovery Rate', value: statistics.total_cases > 0 ? `${Math.round((statistics.recovered_cases / statistics.total_cases) * 100)}%` : '0%', color: '#7c3aed', bg: '#f3e8ff', icon: 'fa-heart-pulse' },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{ ...styles.statCard, ...(s.clickable ? { cursor: 'pointer' } : {}) }}
                      onClick={s.clickable ? () => setActiveTab('cases') : undefined}
                      title={s.clickable ? 'View all disease cases' : undefined}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                      </div>
                      <div>
                        <p style={styles.statLabel}>{s.label}</p>
                        <p style={{ ...styles.statValue, color: s.color }}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ ...styles.cardHint, borderTop: 'none', marginBottom: '1rem' }}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  Click <strong>Total Cases</strong> to view the full cases list. <strong>Contagious</strong> shows how many cases can spread between animals — useful for isolation decisions.
                </p>
              </>
            )}

            {/* Outbreak Risk Assessment */}
            {outbreakRisk && (
              <div style={styles.riskCard}>
                <div style={styles.riskCardHeader}>
                  <h3 style={styles.riskTitle}>
                    <i className="fas fa-triangle-exclamation" style={{ marginRight: '0.4rem', color: '#f59e0b' }}></i>
                    Outbreak Risk Assessment
                  </h3>
                  <div style={styles.filterBar}>
                    <div style={styles.filterBarGroup}>
                      <label style={styles.filterBarLabel}>Species</label>
                      <select value={riskFilters.species} onChange={(e) => setRiskFilters(prev => ({ ...prev, species: e.target.value }))} style={styles.compactSelect}>
                        <option value="">All Species</option>
                        {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ ...styles.riskResultCard, ...getRiskColor(outbreakRisk.risk_level) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>
                        {outbreakRisk.risk_level === 'critical' ? <i className="fas fa-radiation"></i>
                          : outbreakRisk.risk_level === 'high' ? <i className="fas fa-exclamation-triangle"></i>
                          : outbreakRisk.risk_level === 'medium' ? <i className="fas fa-bolt"></i>
                          : <i className="fas fa-check-circle"></i>}
                      </span>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>{outbreakRisk.risk_level} Risk</h4>
                        <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.8 }}>Score: {outbreakRisk.risk_score}/10</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                      {[
                        { label: 'Cases', val: outbreakRisk.case_count },
                        { label: 'Contagious', val: outbreakRisk.contagious_cases },
                        { label: 'Period', val: `${outbreakRisk.days_analyzed}d` },
                        { label: 'Confidence', val: outbreakRisk.confidence?.toUpperCase() },
                      ].map((m, i) => (
                        <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px', padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.65rem', opacity: 0.7, margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.label}</p>
                          <p style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>{m.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {outbreakRisk.reasons && outbreakRisk.reasons.length > 0 && (
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px', padding: '0.4rem 0.65rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Risk factors: </span>
                      {outbreakRisk.reasons.map((reason, index) => (
                        <span key={index} style={{ fontSize: '0.75rem' }}>{reason}{index < outbreakRisk.reasons.length - 1 ? ' · ' : ''}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: '6px', padding: '0.4rem 0.65rem' }}>
                    <i className="fas fa-circle-info" style={{ marginRight: '0.35rem', opacity: 0.7, fontSize: '0.8rem' }}></i>
                    <span style={{ fontSize: '0.8rem' }}>{outbreakRisk.recommendation}</span>
                  </div>
                </div>
                <p style={{ ...styles.cardHint, borderTopColor: 'rgba(0,0,0,0.08)', marginTop: '0.75rem' }}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  Filter by <strong>Species</strong> to check risk for a specific animal group. Use the <strong>Showing data for</strong> selector above to change the time period.
                </p>
              </div>
            )}

            {/* Disease Categories */}
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsCardHeader}>
                <h3 style={styles.analyticsCardTitle}>
                  <i className="fas fa-layer-group" style={{ marginRight: '0.4rem', color: '#6366f1' }}></i>
                  Disease Categories
                </h3>
                <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  Click a category name to view its cases. <strong>Avg Age</strong> is the pet's age in months at the time of diagnosis.
                </p>
              </div>
              <div style={styles.analyticsCardContent}>
                {categories && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'left', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Category</th>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'center', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Cases</th>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'center', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Share</th>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'center', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Contagious</th>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'center', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Avg Age</th>
                          <th style={{ padding: '0.5rem 0.85rem', textAlign: 'left', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>Affected Species</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((category, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.5rem 0.85rem', fontWeight: '600', color: '#2563eb', textTransform: 'capitalize', cursor: 'pointer', textDecoration: 'none' }}
                              onClick={() => { setFilters(prev => ({ ...prev, disease_category: category.disease_category })); setActiveTab('cases'); }}
                              title={`View cases in ${category.disease_category.replace(/_/g, ' ')}`}
                            >
                              {category.disease_category.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '700', fontSize: '0.8rem', padding: '0.15rem 0.55rem', borderRadius: '20px' }}>{category.case_count}</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center', color: '#6b7280' }}>
                              {statistics ? `${Math.round((category.case_count / statistics.total_cases) * 100)}%` : '—'}
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                              {category.contagious_count > 0
                                ? <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: '700', fontSize: '0.8rem', padding: '0.15rem 0.55rem', borderRadius: '20px' }}>{category.contagious_count}</span>
                                : <span style={{ color: '#d1d5db' }}>—</span>}
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center', color: '#374151' }}>
                              {parseFloat(category.avg_age).toFixed(1)} mo
                            </td>
                            <td style={{ padding: '0.5rem 0.85rem', color: '#6b7280', fontSize: '0.78rem' }}>
                              {category.affected_species}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ML Patterns */}
            {patterns && (
              <div style={styles.analyticsCard}>
                <div style={styles.analyticsCardHeader}>
                  <h3 style={styles.analyticsCardTitle}>
                    <i className="fas fa-circle-nodes" style={{ marginRight: '0.4rem', color: '#9333ea' }}></i>
                    Disease Patterns — ML Clustering
                    {patterns.status === 'success' && (
                      <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '20px', backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                        {patterns.patterns_found} patterns identified
                      </span>
                    )}
                  </h3>
                  <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                    <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                    Each pattern groups cases that share similar traits — species, disease type, and age range. These help identify recurring disease profiles in your patient population.
                  </p>
                </div>
                <div style={styles.analyticsCardContent}>
                  {patterns.status === 'success' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {patterns.patterns.map((pattern, index) => (
                        <div key={index} style={{ border: '1px solid #e9d5ff', borderRadius: '8px', padding: '0.75rem', backgroundColor: '#faf5ff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b21a8' }}>Pattern #{pattern.pattern_id + 1}</span>
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#7c3aed' }}>{pattern.primary_species} · {pattern.common_category}</p>
                            </div>
                            <span style={{ backgroundColor: '#e9d5ff', color: '#6b21a8', fontWeight: '700', fontSize: '0.78rem', padding: '0.15rem 0.5rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>{pattern.case_count} cases</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            {[
                              { label: 'Avg Age', val: `${pattern.avg_age ? pattern.avg_age.toFixed(1) : 'N/A'} mo` },
                              { label: 'Contagious', val: `${pattern.contagious_percentage ? pattern.contagious_percentage.toFixed(1) : '0'}%` },
                              { label: 'Species', val: pattern.affected_species ? Object.keys(pattern.affected_species).length : 0 },
                              { label: 'Diseases', val: pattern.common_diseases ? Object.keys(pattern.common_diseases).length : 0 },
                            ].map((m, i) => (
                              <div key={i} style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0.3rem 0.4rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '0 0 0.1rem', textTransform: 'uppercase' }}>{m.label}</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151', margin: 0 }}>{m.val}</p>
                              </div>
                            ))}
                          </div>
                          {pattern.affected_species && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {Object.entries(pattern.affected_species).map(([species, count]) => (
                                <span key={species} style={{ padding: '0.1rem 0.4rem', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.7rem', borderRadius: '3px' }}>
                                  {species}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : isAdmin ? (
                    <p style={{ color: '#4b5563', fontSize: '0.875rem' }}>{patterns.reason || 'Pattern analysis unavailable'}</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Species Trends */}
            {trends && (
              <div style={styles.analyticsCard}>
                <div style={styles.analyticsCardHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={styles.analyticsCardTitle}>
                      <i className="fas fa-chart-line" style={{ marginRight: '0.4rem', color: '#3b82f6' }}></i>
                      Disease Trends
                    </h3>
                    <div style={styles.filterBarGroup}>
                      <label style={styles.filterBarLabel}>Species</label>
                      <select value={selectedSpecies} onChange={(e) => setSelectedSpecies(e.target.value)} style={styles.compactSelect}>
                        {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                    <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                    Select a species to see its disease history. Shows the most common disease types, top diagnoses, and how severe cases have typically been.
                  </p>
                </div>
                <div style={styles.analyticsCardContent}>
                  {/* Trend summary pills */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Total Cases', val: trends.total_cases, color: '#2563eb', bg: 'rgba(59,130,246,0.06)' },
                      { label: 'Avg Age at Diagnosis', val: trends.avg_age_at_diagnosis ? `${trends.avg_age_at_diagnosis.toFixed(1)} mo` : 'N/A', color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
                      { label: 'Contagious %', val: `${trends.contagious_percentage ? trends.contagious_percentage.toFixed(1) : '0'}%`, color: '#dc2626', bg: 'rgba(220,38,38,0.06)' },
                    ].map((t, i) => (
                      <div key={i} style={{ backgroundColor: t.bg, borderRadius: '8px', padding: '0.5rem 0.85rem', minWidth: '120px' }}>
                        <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 0.15rem' }}>{t.label}</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '700', color: t.color, margin: 0, lineHeight: 1.1 }}>{t.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Disease distribution + Most common diseases side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {trends.disease_distribution && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Disease Distribution</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {Object.entries(trends.disease_distribution).map(([category, count]) => (
                            <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '110px', fontSize: '0.78rem', color: '#374151', textTransform: 'capitalize', flexShrink: 0 }}>{category.replace(/_/g, ' ')}</span>
                              <div style={{ flex: 1, backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '14px', overflow: 'hidden' }}>
                                <div style={{ backgroundColor: '#2563eb', borderRadius: '9999px', height: '14px', width: `${(count / trends.total_cases) * 100}%`, minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.3rem' }}>
                                  <span style={{ fontSize: '0.65rem', color: 'white', fontWeight: '600' }}>{count}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trends.most_common_diseases && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Most Common Diseases</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                          {Object.entries(trends.most_common_diseases).slice(0, 5).map(([disease, count], index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none' }}>
                              <span style={{ fontSize: '0.82rem', color: '#374151' }}>{disease}</span>
                              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: '20px' }}>
                                {count} {count === 1 ? 'case' : 'cases'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Severity distribution */}
                  {trends.severity_distribution && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Severity Distribution</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(trends.severity_distribution).map(([severity, count]) => (
                          <div key={severity} style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '0.5rem 0.85rem', textAlign: 'center', minWidth: '80px' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{count}</p>
                            <p style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'capitalize', margin: '0.1rem 0 0' }}>{severity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Sales Forecasting Tab */}
        {isAdmin && activeTab === 'sales' && (
          <>
            {/* Monthly Revenue Forecast */}
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsCardHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={styles.analyticsCardTitle}>
                    <i className="fas fa-chart-bar" style={{ marginRight: '0.4rem', color: '#10b981' }}></i>
                    Monthly Revenue Forecast
                  </h3>
                  <div style={styles.filterBar}>
                    <div style={styles.filterBarGroup}>
                      <label style={styles.filterBarLabel}>Forecast Period</label>
                      <select value={salesPeriod} onChange={(e) => setSalesPeriod(parseInt(e.target.value))} style={styles.compactSelect}>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                    <button onClick={fetchSalesData} style={{ padding: '0.38rem 0.8rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <i className="fas fa-sync-alt"></i> Generate
                    </button>
                  </div>
                </div>
                <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  Predicted revenue for each upcoming month based on past billing data. <strong>Lower/Upper Bound</strong> shows the expected range actual revenue will likely fall within.
                </p>
              </div>
              <div style={styles.analyticsCardContent}>
                {loading ? (
                  <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div></div>
                ) : !salesData.forecast ? (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Click "Generate" to load the sales forecast.</p>
                ) : salesData.forecast?.success === false ? (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Sales forecasting model is not loaded. Please train the model first.</p>
                ) : (() => {
                  const monthlyForecast = salesData.forecast?.forecast?.monthly_forecast || [];
                  return monthlyForecast.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 0.5rem' }}>Model: {salesData.forecast?.forecast?.model_used || 'ML Model'}</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            {['Month', 'Forecast Revenue', 'Avg Daily', 'Lower Bound', 'Upper Bound'].map((h, i) => (
                              <th key={i} style={{ padding: '0.5rem 0.85rem', textAlign: i === 0 ? 'left' : 'right', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyForecast.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '0.5rem 0.85rem', color: '#1f2937', fontWeight: '500' }}>{row.month}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>LKR {Number(row.monthly_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#374151' }}>LKR {Number(row.avg_daily_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#6b7280' }}>LKR {Number(row.lower_bound || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#6b7280' }}>LKR {Number(row.upper_bound || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Sales Summary Metrics + Day of Week */}
            {salesData.forecast?.success !== false && salesData.forecast && (() => {
              const monthlyForecast = salesData.forecast?.forecast?.monthly_forecast || [];
              const trendsData = salesData.trends?.trends || {};
              const dayPatterns = trendsData.day_of_week_patterns || [];
              const bestDay = dayPatterns.length > 0 ? dayPatterns.reduce((a, b) => (a.avg_revenue > b.avg_revenue ? a : b)) : null;
              const totalForecastRevenue = monthlyForecast.reduce((sum, m) => sum + (m.monthly_revenue || 0), 0);
              const yoy = trendsData.yoy_growth_percentage;
              return (
                <>
                  <div style={styles.statsGrid}>
                    {[
                      { label: 'Total Forecast Revenue', value: `LKR ${totalForecastRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#10b981', bg: '#dcfce7', icon: 'fa-sack-dollar' },
                      { label: 'YoY Growth', value: yoy != null ? `${yoy > 0 ? '+' : ''}${Number(yoy).toFixed(1)}%` : 'N/A', color: yoy >= 0 ? '#2563eb' : '#dc2626', bg: yoy >= 0 ? '#dbeafe' : '#fee2e2', icon: yoy >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down' },
                      { label: 'Best Day', value: bestDay ? bestDay.day_of_week : 'N/A', color: '#7c3aed', bg: '#f3e8ff', icon: 'fa-calendar-star' },
                      { label: 'Avg Monthly Revenue', value: trendsData.avg_monthly_revenue != null ? `LKR ${Number(trendsData.avg_monthly_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A', color: '#d97706', bg: '#fef3c7', icon: 'fa-calendar-check' },
                    ].map((s, i) => (
                      <div key={i} style={styles.statCard}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                        </div>
                        <div>
                          <p style={styles.statLabel}>{s.label}</p>
                          <p style={{ ...styles.statValue, color: s.color, fontSize: '1.1rem' }}>{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ ...styles.cardHint, borderTop: 'none', marginBottom: '1rem' }}>
                    <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                    <strong>YoY Growth</strong> compares this year's revenue to last year's. <strong>Best Day</strong> shows which day historically earns the most — useful for scheduling.
                  </p>

                  {dayPatterns.length > 0 && (
                    <div style={styles.analyticsCard}>
                      <div style={styles.analyticsCardHeader}>
                        <h3 style={styles.analyticsCardTitle}>
                          <i className="fas fa-calendar-week" style={{ marginRight: '0.4rem', color: '#10b981' }}></i>
                          Revenue by Day of Week
                        </h3>
                        <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                          <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                          Average revenue per day of the week based on past billing. Useful for planning appointments and staffing levels.
                        </p>
                      </div>
                      <div style={styles.analyticsCardContent}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {dayPatterns.map((d, idx) => (
                            <div key={idx} style={{ flex: '1 1 calc(14% - 0.5rem)', minWidth: '80px', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '0.6rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{d.day_of_week}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>LKR {Number(d.avg_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* Inventory Demand Tab */}
        {isAdmin && activeTab === 'inventory' && (
          <>
            {/* Summary + controls */}
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsCardHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={styles.analyticsCardTitle}>
                    <i className="fas fa-warehouse" style={{ marginRight: '0.4rem', color: '#f59e0b' }}></i>
                    Inventory Reorder Summary
                  </h3>
                  <div style={styles.filterBar}>
                    <div style={styles.filterBarGroup}>
                      <label style={styles.filterBarLabel}>Forecast Period</label>
                      <select value={inventoryDays} onChange={(e) => setInventoryDays(parseInt(e.target.value))} style={styles.compactSelect}>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                      </select>
                    </div>
                    <button onClick={fetchInventoryData} style={{ padding: '0.38rem 0.8rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <i className="fas fa-sync-alt"></i> Generate
                    </button>
                  </div>
                </div>
                <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                  <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                  Reorder recommendations based on current stock and expected demand. <strong>Urgent</strong> items are critically low — order these right away.
                </p>
              </div>
              <div style={styles.analyticsCardContent}>
                {loading ? (
                  <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div></div>
                ) : !inventoryData.reorderSuggestions ? (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Click "Generate" to load inventory reorder suggestions.</p>
                ) : inventoryData.reorderSuggestions?.success === false ? (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Inventory forecasting model is not loaded. Please train the model first.</p>
                ) : (() => {
                  const summary = (inventoryData.reorderSuggestions?.recommendations || {}).summary || {};
                  return (
                    <div style={styles.statsGrid}>
                      {[
                        { label: 'Urgent Reorder', value: summary.urgent_count ?? 0, color: '#dc2626', bg: '#fee2e2', icon: 'fa-triangle-exclamation' },
                        { label: 'Reorder Soon', value: summary.upcoming_count ?? 0, color: '#d97706', bg: '#fef3c7', icon: 'fa-clock' },
                        { label: 'Sufficient Stock', value: summary.sufficient_count ?? 0, color: '#16a34a', bg: '#dcfce7', icon: 'fa-circle-check' },
                        { label: 'Est. Reorder Cost', value: `LKR ${Number(summary.estimated_reorder_cost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#1d4ed8', bg: '#dbeafe', icon: 'fa-receipt' },
                      ].map((s, i) => (
                        <div key={i} style={styles.statCard}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                          </div>
                          <div>
                            <p style={styles.statLabel}>{s.label}</p>
                            <p style={{ ...styles.statValue, color: s.color, fontSize: '1.1rem' }}>{s.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Reorder Suggestion Tables */}
            {inventoryData.reorderSuggestions?.success !== false && inventoryData.reorderSuggestions && (() => {
              const recs = inventoryData.reorderSuggestions?.recommendations || {};
              const urgent = recs.urgent_reorder || [];
              const soon = recs.reorder_soon || [];
              const renderTable = (items, color, icon, label, hint) => items.length === 0 ? null : (
                <div style={styles.analyticsCard} key={label}>
                  <div style={styles.analyticsCardHeader}>
                    <h3 style={{ ...styles.analyticsCardTitle, color }}>
                      <i className={`fas ${icon}`} style={{ marginRight: '0.4rem' }}></i>
                      {label}
                      <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '20px', backgroundColor: color === '#dc2626' ? '#fee2e2' : '#fef3c7', color, marginLeft: '0.5rem' }}>{items.length} items</span>
                    </h3>
                    <p style={{ ...styles.cardHint, borderTop: 'none', margin: '0.35rem 0 0' }}>
                      <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
                      {hint}
                    </p>
                  </div>
                  <div style={styles.analyticsCardContent}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            {['Item', 'Current Stock', 'Reorder Qty', 'Est. Cost', 'Category'].map((h, i) => (
                              <th key={i} style={{ padding: '0.5rem 0.85rem', textAlign: i === 0 || i === 4 ? 'left' : 'right', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '0.5rem 0.85rem', color: '#1f2937', fontWeight: '500' }}>{item.item_name}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#374151' }}>{item.current_stock ?? 'N/A'}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color, fontWeight: '600' }}>{item.suggested_order_quantity ?? 'N/A'}</td>
                              <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#374151' }}>{item.estimated_cost != null ? `LKR ${Number(item.estimated_cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}</td>
                              <td style={{ padding: '0.5rem 0.85rem', color: '#6b7280' }}>{item.category || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
              return (
                <>
                  {renderTable(urgent, '#dc2626', 'fa-triangle-exclamation', 'Urgent Reorder', 'Stock is critically low. Place orders for these items as soon as possible.')}
                  {renderTable(soon, '#d97706', 'fa-clock', 'Reorder Soon', 'Stock is getting low. Plan to reorder these within the next few days.')}
                </>
              );
            })()}
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
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  tabsContainer: {
    marginBottom: '2rem',
    borderBottom: '1px solid #e5e7eb',
  },
  tabsHeader: {
    display: 'flex',
    gap: '2rem',
  },
  tab: {
    padding: '1rem 0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
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
    marginBottom: '0.5rem',
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
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  infoText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
  },
  loadingSpinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyStateIcon: {
    width: '48px',
    height: '48px',
    color: '#d1d5db',
    marginBottom: '1rem',
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
    padding: '0.85rem 1.25rem',
    marginBottom: '1rem',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '0.85rem 1rem',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  statCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
    marginBottom: '0.1rem',
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.1,
  },
  statIcon: {
    padding: '0.75rem',
    borderRadius: '50%',
  },
  riskCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
    border: '1px solid #e5e7eb',
  },
  riskCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  riskTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  filterBarGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  filterBarLabel: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  compactSelect: {
    padding: '0.38rem 0.6rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.82rem',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '130px',
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
    marginBottom: '1rem',
    border: '1px solid #e5e7eb',
  },
  analyticsCardHeader: {
    borderBottom: '1px solid #e5e7eb',
    padding: '0.7rem 1.1rem',
  },
  analyticsCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  analyticsCardContent: {
    padding: '0.9rem 1.1rem',
  },
  cardHint: {
    margin: '0.6rem 0 0',
    fontSize: '0.73rem',
    color: '#6b7280',
    lineHeight: '1.5',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    paddingTop: '0.5rem',
  },
  cardHintIcon: {
    color: '#93c5fd',
    marginRight: '0.35rem',
    fontSize: '0.7rem',
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
  comingSoonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    border: '1px dashed #d1d5db',
    borderRadius: '12px',
    padding: '2.5rem 1.5rem',
    margin: '2rem 0',
    minHeight: '220px',
    textAlign: 'center',
  },
  metricsGridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    margin: '2rem 0',
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    padding: '1.25rem 1rem',
    gap: '1rem',
    minHeight: '90px',
  },
  metricIconBox: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
    fontSize: '1.5rem',
    marginRight: '0.75rem',
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginBottom: '0.15rem',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1f2937',
  },
};

export default Analytics;
