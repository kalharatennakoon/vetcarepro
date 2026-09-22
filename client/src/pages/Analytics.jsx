import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDiseaseCases,
  getDiseaseStatistics,
  getDiseaseCasesByCategory,
  assessOutbreakRisk,
  getSpeciesTrends,
  trainMLModel,
  forecastDiseaseActivity,
  getMLModelStatus
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
import ExplainWithAI from '../components/ExplainWithAI';
import '../styles/AnalyticsModern.css';

const formatCategory = (cat) => {
  if (!cat) return '—';
  return cat
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('cases');
  useEffect(() => { window.scrollTo(0, 0); document.documentElement.scrollTo(0, 0); document.getElementById('main-content')?.scrollTo(0, 0); }, [activeTab]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
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
  const [outbreakRisk, setOutbreakRisk] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('Dog');
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
  const [modelStatus, setModelStatus] = useState(null);

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

  // Disease Forecast State
  const [diseaseForecast, setDiseaseForecast] = useState(null);
  const [diseaseForecastLoading, setDiseaseForecastLoading] = useState(false);
  const [diseaseForecastError, setDiseaseForecastError] = useState('');
  const [forecastPeriod, setForecastPeriod] = useState(12);
  const [showDiseaseDetails, setShowDiseaseDetails] = useState(false);

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
  }, []);

  useEffect(() => {
    getMLModelStatus().then(res => setModelStatus(res)).catch(() => {});
  }, []);

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
      const [statsRes, categoriesRes] = await Promise.all([
        getDiseaseStatistics({ dateFrom }),
        getDiseaseCasesByCategory({ dateFrom }),
      ]);

      setStatistics(statsRes.data.statistics);
      setCategories(categoriesRes.data.categories);

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
      const days = analyticsPeriod === 'all' ? 3650 : parseInt(analyticsPeriod);
      const response = await assessOutbreakRisk({ days_lookback: days });
      setOutbreakRisk(response.risk_assessment);
    } catch (err) {
      console.error('Failed to assess outbreak risk:', err);
    }
  };

  const fetchDiseaseForecast = async (periods = forecastPeriod, species = '') => {
    setDiseaseForecastLoading(true);
    setDiseaseForecastError('');
    try {
      const res = await forecastDiseaseActivity({
        periods,
        species: species || null,
      });
      if (res.success) {
        setDiseaseForecast(res.forecast);
      } else {
        setDiseaseForecastError(res.error || 'Forecast unavailable');
      }
    } catch {
      setDiseaseForecastError('Failed to load disease forecast');
    } finally {
      setDiseaseForecastLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const [forecastRes, trendsRes] = await Promise.all([
        getSalesForecast(salesPeriod).catch(() => ({ success: false })),
        getSalesTrends(Math.max(1, Math.round(salesPeriod / 30))).catch(() => ({ success: false }))
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
      const suggestionsRes = await getReorderSuggestions(inventoryDays).catch(() => ({ success: false }));

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
      getMLModelStatus().then(res => setModelStatus(res)).catch(() => {});
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
      getMLModelStatus().then(res => setModelStatus(res)).catch(() => {});
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
      getMLModelStatus().then(res => setModelStatus(res)).catch(() => {});
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
      recovered:         { backgroundColor: '#dcfce7', color: '#166534' },
      ongoing_treatment: { backgroundColor: '#dbeafe', color: '#1e40af' },
      chronic:           { backgroundColor: '#fef9c3', color: '#854d0e' },
      deceased:          { backgroundColor: '#f3f4f6', color: '#1f2937' },
      transferred:       { backgroundColor: '#f3e8ff', color: '#6b21a8' },
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
      <div className="analytics-container">
        {/* Page Header */}
        <div className="analytics-header-card">
          <div className="analytics-header-content">
            <div className="analytics-header-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h1 className="analytics-header-title">Analytics & Insights</h1>
              <p className="analytics-header-subtitle">
                Disease tracking, activity forecasting, sales forecasting, and inventory demand analysis
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && activeTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <button
                  onClick={handleTrainModel}
                  disabled={training}
                  className="analytics-btn-action analytics-btn-purple"
                >
                  {training ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Training...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i>
                      Retrain Model
                    </>
                  )}
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                  {modelStatus?.models?.disease_prediction?.last_trained_at
                    ? `Last trained: ${new Date(modelStatus.models.disease_prediction.last_trained_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Never trained'}
                </span>
              </div>
            )}
            {isAdmin && activeTab === 'sales' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <button
                  onClick={handleTrainSalesModel}
                  disabled={salesTraining}
                  className="analytics-btn-action"
                >
                  <i className={`fas ${salesTraining ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                  {salesTraining ? 'Training...' : 'Retrain Sales Model'}
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                  {modelStatus?.models?.sales_forecasting?.last_trained_at
                    ? `Last trained: ${new Date(modelStatus.models.sales_forecasting.last_trained_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Never trained'}
                </span>
              </div>
            )}
            {isAdmin && activeTab === 'inventory' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <button
                  onClick={handleTrainInventoryModel}
                  disabled={inventoryTraining}
                  className="analytics-btn-action analytics-btn-emerald"
                >
                  <i className={`fas ${inventoryTraining ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                  {inventoryTraining ? 'Training...' : 'Retrain Inventory Model'}
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                  {modelStatus?.models?.inventory_forecasting?.last_trained_at
                    ? `Last trained: ${new Date(modelStatus.models.inventory_forecasting.last_trained_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Never trained'}
                </span>
              </div>
            )}
            {isVetOrAdmin && activeTab === 'cases' && (
              <button
                onClick={() => navigate('/disease-cases/create')}
                className="analytics-btn-action"
              >
                <i className="fas fa-plus"></i>
                Add Disease Case
              </button>
            )}
          </div>
        </div>

        {/* Notifications & Alerts */}
        {error && (
          <div ref={errorRef} className="analytics-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        {trainSuccess && (
          <div className="analytics-alert-success">
            <i className="fas fa-check-circle"></i>
            Disease prediction model trained successfully!
          </div>
        )}
        {salesTrainSuccess && (
          <div className="analytics-alert-success">
            <i className="fas fa-check-circle"></i>
            Sales forecasting model trained successfully! Forecasts have been updated.
          </div>
        )}
        {inventoryTrainSuccess && (
          <div className="analytics-alert-success">
            <i className="fas fa-check-circle"></i>
            Inventory forecasting model trained successfully! Recommendations have been updated.
          </div>
        )}

        {/* Tabs Bar */}
        <div className="analytics-nav-tabs">
          <button
            onClick={() => setActiveTab('cases')}
            className={`analytics-tab-btn ${activeTab === 'cases' ? 'is-active' : ''}`}
          >
            <i className="fas fa-virus"></i>
            Disease Cases
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`analytics-tab-btn ${activeTab === 'analytics' ? 'is-active' : ''}`}
          >
            <i className="fas fa-chart-pie"></i>
            Disease Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('sales')}
              className={`analytics-tab-btn ${activeTab === 'sales' ? 'is-active' : ''}`}
            >
              <i className="fas fa-dollar-sign"></i>
              Sales Forecasting
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`analytics-tab-btn ${activeTab === 'inventory' ? 'is-active' : ''}`}
            >
              <i className="fas fa-boxes"></i>
              Inventory Demand
            </button>
          )}
        </div>

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <>
            {/* Filters */}
            <div className="analytics-filters-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Filters</h2>
                <button
                  onClick={clearFilters}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>

              <div className="analytics-filter-grid">
                <div>
                  <label className="analytics-filter-label">Species</label>
                  <select
                    name="species"
                    value={filters.species}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  >
                    <option value="">All Species</option>
                    {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="analytics-filter-label">Category</label>
                  <select
                    name="disease_category"
                    value={filters.disease_category}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
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
                  <label className="analytics-filter-label">Severity</label>
                  <select
                    name="severity"
                    value={filters.severity}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  >
                    <option value="">All Severities</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="analytics-filter-label">Outcome</label>
                  <select
                    name="outcome"
                    value={filters.outcome}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  >
                    <option value="">All Outcomes</option>
                    <option value="recovered">Recovered</option>
                    <option value="ongoing_treatment">Ongoing Treatment</option>
                    <option value="chronic">Chronic</option>
                    <option value="deceased">Deceased</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>

                <div>
                  <label className="analytics-filter-label">Contagious</label>
                  <select
                    name="is_contagious"
                    value={filters.is_contagious}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  >
                    <option value="">All Cases</option>
                    <option value="true">Contagious Only</option>
                    <option value="false">Non-Contagious</option>
                  </select>
                </div>

                <div>
                  <label className="analytics-filter-label">Date From</label>
                  <input
                    type="date"
                    name="diagnosis_date_from"
                    value={filters.diagnosis_date_from}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  />
                </div>

                <div>
                  <label className="analytics-filter-label">Date To</label>
                  <input
                    type="date"
                    name="diagnosis_date_to"
                    value={filters.diagnosis_date_to}
                    onChange={handleFilterChange}
                    className="analytics-select-input"
                  />
                </div>
              </div>

              <div>
                <label className="analytics-filter-label">Search</label>
                <input
                  type="text"
                  placeholder="Search by pet name, disease, symptoms, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="analytics-select-input"
                />
              </div>
            </div>

            {/* Results Summary */}
            <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'rgba(248, 250, 252, 0.8)', border: '1px solid #e2e8f0', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#475569' }}>
              Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredCases.length)}</strong> of{' '}
              <strong>{filteredCases.length}</strong> disease cases
              {totalCases > filteredCases.length && ` (${totalCases} total in database)`}
            </div>

            {/* Cases Table */}
            {loading ? (
              <div className="med-records-empty-card">
                <div className="appts-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                <p style={{ color: '#64748b', margin: 0 }}>Loading disease cases...</p>
              </div>
            ) : currentCases.length === 0 ? (
              <div className="med-records-empty-card">
                <i className="fas fa-virus" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>No disease cases found</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>Try adjusting your filters or search terms</p>
                {isVetOrAdmin && (
                  <button
                    onClick={() => navigate('/disease-cases/create')}
                    className="analytics-btn-action"
                  >
                    <i className="fas fa-plus"></i> Add First Disease Case
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="analytics-table-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Pet & Owner</th>
                          <th>Disease</th>
                          <th>Diagnosis Date</th>
                          <th>Severity</th>
                          <th>Outcome</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCases.map((diseaseCase) => (
                          <tr key={diseaseCase.case_id}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {diseaseCase.pet_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {diseaseCase.species} • {diseaseCase.breed}
                                </div>
                                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                                  Owner: {diseaseCase.owner_first_name} {diseaseCase.owner_last_name}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {diseaseCase.disease_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {formatCategory(diseaseCase.disease_category)}
                                </div>
                              </div>
                            </td>
                            <td>{formatDate(diseaseCase.diagnosis_date)}</td>
                            <td>
                              <span className="analytics-badge" style={getSeverityBadge(diseaseCase.severity)}>
                                {diseaseCase.severity || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              <span className="analytics-badge" style={getOutcomeBadge(diseaseCase.outcome)}>
                                {diseaseCase.outcome || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              {diseaseCase.is_contagious ? (
                                <span className="analytics-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                  Contagious
                                </span>
                              ) : (
                                <span className="analytics-badge" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                                  Non-Contagious
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => navigate(`/disease-cases/${diseaseCase.case_id}`)}
                                className="med-records-btn-view"
                              >
                                <i className="fas fa-eye"></i> View
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
                  <div className="med-records-pagination-bar">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="med-records-pag-btn"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} style={{ color: '#94a3b8', padding: '0.4rem', fontSize: '0.85rem' }}>...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`med-records-pag-btn ${currentPage === page ? 'is-active' : ''}`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="med-records-pag-btn"
                    >
                      <i className="fas fa-chevron-right"></i>
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
            {/* Disease Activity Forecast */}
            {isVetOrAdmin && (
              <div className="analytics-glass-card">
                <div className="analytics-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 className="analytics-card-title">
                      <i className="fas fa-chart-line" style={{ color: '#7c3aed' }}></i>
                      Disease Activity Forecast
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Forecast Period</label>
                        <select value={forecastPeriod} onChange={(e) => setForecastPeriod(parseInt(e.target.value))} className="analytics-select-input" style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}>
                          <option value={6}>6 months</option>
                          <option value={12}>1 year</option>
                          <option value={24}>2 years</option>
                          <option value={36}>3 years</option>
                          <option value={60}>5 years</option>
                        </select>
                      </div>
                      <button
                        onClick={() => fetchDiseaseForecast(forecastPeriod)}
                        disabled={diseaseForecastLoading}
                        className="analytics-btn-action analytics-btn-purple"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                      >
                        <i className={`fas ${diseaseForecastLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                        {diseaseForecastLoading ? 'Forecasting...' : 'Generate Forecast'}
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    <i className="fas fa-circle-info" style={{ color: '#60a5fa', marginRight: '0.35rem' }}></i>
                    Trained on disease cases, appointments, and medical records across all species.
                  </p>
                </div>
                <div className="analytics-card-body">
                  {diseaseForecastLoading ? (
                    <div className="med-records-empty-card" style={{ padding: '2rem' }}>
                      <div className="appts-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                      <p style={{ color: '#64748b', margin: 0 }}>Forecasting disease activity...</p>
                    </div>
                  ) : diseaseForecastError ? (
                    <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>{diseaseForecastError}</p>
                  ) : !diseaseForecast ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <i className="fas fa-chart-line" style={{ fontSize: '2.5rem', color: '#c084fc', marginBottom: '0.75rem', display: 'block' }}></i>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Select a forecast period and click <strong>Generate Forecast</strong> to see predicted disease activity, pandemic risk, and monthly case volumes.</p>
                    </div>
                  ) : (() => {
                    const pr = diseaseForecast.pandemic_risk || {};
                    const prColor = pr.level === 'high' ? '#dc2626' : pr.level === 'medium' ? '#d97706' : '#16a34a';
                    const prBg = pr.level === 'high' ? '#fee2e2' : pr.level === 'medium' ? '#fef3c7' : '#ecfdf5';
                    const conf = diseaseForecast.confidence;
                    const confProps = conf === 'high'
                      ? { color: '#15803d', bg: '#ecfdf5', label: 'High Confidence', detail: '85–95% accuracy' }
                      : conf === 'medium'
                      ? { color: '#1d4ed8', bg: '#eff6ff', label: 'Medium Confidence', detail: '75–85% accuracy' }
                      : conf === 'low'
                      ? { color: '#b45309', bg: '#fffbeb', label: 'Low Confidence', detail: '60–75% accuracy' }
                      : { color: '#dc2626', bg: '#fef2f2', label: 'Very Low Confidence', detail: 'More data needed' };
                    return (
                      <>
                        {/* Confidence badge */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', backgroundColor: confProps.bg, borderRadius: '9999px', border: `1px solid ${confProps.color}30` }}>
                            <i className="fas fa-circle-info" style={{ color: confProps.color, fontSize: '0.75rem' }}></i>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: confProps.color }}>{confProps.label}</span>
                            <span style={{ fontSize: '0.72rem', color: confProps.color, opacity: 0.8 }}>· {confProps.detail}</span>
                          </span>
                        </div>

                        {/* Pandemic risk banner */}
                        <div style={{ marginBottom: '1.25rem', backgroundColor: prBg, border: `1px solid ${prColor}30`, borderRadius: '14px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                          <i className={`fas ${pr.level === 'high' ? 'fa-biohazard' : pr.level === 'medium' ? 'fa-triangle-exclamation' : 'fa-shield-virus'}`} style={{ color: prColor, fontSize: '1.3rem', marginTop: '0.1rem' }}></i>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: prColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pr.level} Pandemic Risk</span>
                              <span style={{ fontSize: '0.72rem', backgroundColor: `${prColor}20`, color: prColor, padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '700' }}>Index: {pr.current_index}/10</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 0.4rem 0' }}>{pr.description}</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                              Index scored from contagious rate, multi-species spread &amp; case severity (0–10).&nbsp;
                              <span style={{ color: '#16a34a', fontWeight: '700' }}>Low: 0–2.9</span> ·&nbsp;
                              <span style={{ color: '#d97706', fontWeight: '700' }}>Medium: 3–5.9</span> ·&nbsp;
                              <span style={{ color: '#dc2626', fontWeight: '700' }}>High: 6–10</span>
                            </p>
                          </div>
                        </div>

                        {/* Summary cards */}
                        <div className="analytics-stats-grid">
                          {[
                            {
                              label: 'Disease Trend',
                              value: diseaseForecast.trend_direction?.charAt(0).toUpperCase() + diseaseForecast.trend_direction?.slice(1),
                              color: diseaseForecast.trend_direction === 'increasing' ? '#e11d48' : diseaseForecast.trend_direction === 'decreasing' ? '#059669' : '#2563eb',
                              bg: diseaseForecast.trend_direction === 'increasing' ? '#fff1f2' : diseaseForecast.trend_direction === 'decreasing' ? '#ecfdf5' : '#eff6ff',
                              icon: diseaseForecast.trend_direction === 'increasing' ? 'fa-arrow-trend-up' : diseaseForecast.trend_direction === 'decreasing' ? 'fa-arrow-trend-down' : 'fa-minus',
                            },
                            { label: 'Total Projected Cases', value: diseaseForecast.total_forecast_cases, color: '#7c3aed', bg: '#f3e8ff', icon: 'fa-file-medical' },
                            { label: 'Predicted Cases / Month', value: diseaseForecast.forecast_monthly_avg?.toFixed(1), color: '#d97706', bg: '#fffbeb', icon: 'fa-calendar-day' },
                            (() => {
                              const peak = diseaseForecast.activity_forecast?.reduce((max, m) => m.activity_score > (max?.activity_score || 0) ? m : max, null);
                              const peakColor = peak?.activity_level === 'high' ? '#e11d48' : peak?.activity_level === 'moderate' ? '#d97706' : '#059669';
                              const peakBg = peak?.activity_level === 'high' ? '#fff1f2' : peak?.activity_level === 'moderate' ? '#fffbeb' : '#ecfdf5';
                              const peakFormatted = peak ? new Date(peak.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';
                              return { label: 'Peak Clinical Month', value: peakFormatted, color: peakColor, bg: peakBg, icon: 'fa-calendar-exclamation', hint: 'Expect higher contagious & severe cases.' };
                            })(),
                          ].map((s, i) => (
                            <div key={i} className="analytics-stat-card">
                              <div className="analytics-stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                                <i className={`fas ${s.icon}`}></i>
                              </div>
                              <div>
                                <div className="analytics-stat-label">{s.label}</div>
                                <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
                                {s.hint && <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '0.2rem 0 0 0', lineHeight: 1.3 }}>{s.hint}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Monthly predictions table */}
                        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                          <table className="analytics-table">
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th style={{ textAlign: 'right' }}>Predicted Cases</th>
                                <th style={{ textAlign: 'right' }}>Lower Bound</th>
                                <th style={{ textAlign: 'right' }}>Upper Bound</th>
                                <th style={{ textAlign: 'right' }}>Disease Activity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {diseaseForecast.predictions?.map((row, idx) => {
                                const ob = diseaseForecast.activity_forecast?.[idx];
                                const obColor = ob?.activity_level === 'high' ? '#e11d48' : ob?.activity_level === 'moderate' ? '#d97706' : '#059669';
                                const obLabel = ob?.activity_level === 'high' ? 'High' : ob?.activity_level === 'moderate' ? 'Moderate' : 'Normal';
                                return (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.month}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed', fontSize: '0.95rem' }}>{row.predicted_cases}</td>
                                    <td style={{ textAlign: 'right', color: '#64748b' }}>{row.lower_bound}</td>
                                    <td style={{ textAlign: 'right', color: '#64748b' }}>{row.upper_bound}</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {ob && <span className="analytics-badge" style={{ backgroundColor: `${obColor}18`, color: obColor, border: `1px solid ${obColor}30` }}>{obLabel} ({ob.activity_score}%)</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Category breakdown */}
                        {diseaseForecast.category_trend && Object.keys(diseaseForecast.category_trend).length > 0 && (() => {
                          const allMonths = [...new Set(Object.values(diseaseForecast.category_trend).flatMap(m => m.map(x => x.month)))].sort();
                          return (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', background: 'rgba(248, 250, 252, 0.6)' }}>
                              <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#7c3aed', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Projected Cases by Disease Category</h4>
                              <div style={{ overflowX: 'auto' }}>
                                <table className="analytics-table">
                                  <thead>
                                    <tr>
                                      <th>Category</th>
                                      {allMonths.map(m => <th key={m} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{m}</th>)}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(diseaseForecast.category_trend).map(([cat, months]) => {
                                      const byMonth = Object.fromEntries(months.map(m => [m.month, m.predicted]));
                                      return (
                                        <tr key={cat}>
                                          <td style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</td>
                                          {allMonths.map(m => <td key={m} style={{ textAlign: 'right', color: '#475569' }}>{byMonth[m] ?? '—'}</td>)}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* More Details toggle */}
            <button
              onClick={() => setShowDiseaseDetails(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0', padding: '0.6rem 1.2rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <i className={`fas ${showDiseaseDetails ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              {showDiseaseDetails ? 'Hide Detailed Insights' : 'Show Detailed Insights'}
            </button>

            {showDiseaseDetails && (
              <>
                {/* Historical period filter */}
                <div className="analytics-glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Historical Period</div>
                    <div style={{ fontSize: '0.775rem', color: '#64748b' }}>Filters case counts, categories &amp; activity assessment below</div>
                  </div>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => setAnalyticsPeriod(e.target.value)}
                    className="analytics-select-input"
                    style={{ width: 'auto', minWidth: '160px' }}
                  >
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 6 months</option>
                    <option value="365">Last 1 year</option>
                    <option value="730">Last 2 years</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                {/* Statistics Overview */}
                {statistics && (
                  <div className="analytics-stats-grid">
                    {[
                      { label: 'Total Cases',   value: statistics.total_cases, color: '#2563eb', bg: '#eff6ff', icon: 'fa-file-medical', clickable: true },
                      { label: 'Affected Pets', value: statistics.affected_pets, color: '#059669', bg: '#ecfdf5', icon: 'fa-paw' },
                      { label: 'Contagious',    value: statistics.contagious_cases, color: '#e11d48', bg: '#fff1f2', icon: 'fa-triangle-exclamation' },
                      { label: 'Recovery Rate', value: statistics.total_cases > 0 ? `${Math.round((statistics.recovered_cases / statistics.total_cases) * 100)}%` : '0%', color: '#7c3aed', bg: '#f3e8ff', icon: 'fa-heart-pulse' },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="analytics-stat-card"
                        style={{ cursor: s.clickable ? 'pointer' : 'default' }}
                        onClick={s.clickable ? () => setActiveTab('cases') : undefined}
                      >
                        <div className="analytics-stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div>
                          <div className="analytics-stat-label">{s.label}</div>
                          <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outbreak Risk Assessment */}
                {outbreakRisk && (
                  <div className="analytics-glass-card">
                    <div className="analytics-card-header">
                      <h3 className="analytics-card-title">
                        <i className="fas fa-triangle-exclamation" style={{ color: '#d97706' }}></i>
                        Disease Activity Assessment
                      </h3>
                    </div>
                    <div className="analytics-card-body">
                      {(() => {
                        const actLevel = outbreakRisk.risk_level === 'critical' ? 'Critical Activity'
                          : outbreakRisk.risk_level === 'high' ? 'High Activity'
                          : outbreakRisk.risk_level === 'medium' ? 'Moderate Activity'
                          : 'Normal Activity';
                        return (
                          <div style={{ ...getRiskColor(outbreakRisk.risk_level), borderRadius: '16px', padding: '1.25rem', border: '1px solid' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>
                                  {outbreakRisk.risk_level === 'critical' ? <i className="fas fa-radiation"></i>
                                    : outbreakRisk.risk_level === 'high' ? <i className="fas fa-exclamation-triangle"></i>
                                    : outbreakRisk.risk_level === 'medium' ? <i className="fas fa-bolt"></i>
                                    : <i className="fas fa-check-circle"></i>}
                                </span>
                                <div>
                                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>{actLevel}</h4>
                                  <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.85 }}>Score: {outbreakRisk.risk_score}/10 · {analyticsPeriod === 'all' ? 'All time' : `${outbreakRisk.days_analyzed} days`}</p>
                                </div>
                              </div>
                            </div>

                            {outbreakRisk.reasons && outbreakRisk.reasons.length > 0 && (
                              <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '0.6rem 0.85rem', marginBottom: '0.6rem', fontSize: '0.825rem' }}>
                                <span style={{ fontWeight: 700 }}>Contributing factors: </span>
                                {outbreakRisk.reasons.join(' · ')}
                              </div>
                            )}

                            <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}>
                              <i className="fas fa-circle-info" style={{ marginRight: '0.35rem', opacity: 0.7 }}></i>
                              <span>{outbreakRisk.recommendation}</span>
                            </div>

                            <ExplainWithAI outputType="outbreak_risk" data={outbreakRisk} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Disease Categories */}
                <div className="analytics-glass-card">
                  <div className="analytics-card-header">
                    <h3 className="analytics-card-title">
                      <i className="fas fa-layer-group" style={{ color: '#4f46e5' }}></i>
                      Cases by Disease Category
                    </h3>
                  </div>
                  <div className="analytics-card-body" style={{ padding: 0 }}>
                    {categories && (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="analytics-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th style={{ textAlign: 'center' }}>Cases</th>
                              <th style={{ textAlign: 'center' }}>Share</th>
                              <th style={{ textAlign: 'center' }}>Contagious</th>
                              <th style={{ textAlign: 'center' }}>Species</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((category, index) => (
                              <tr key={index}>
                                <td
                                  style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}
                                  onClick={() => { setFilters(prev => ({ ...prev, disease_category: category.disease_category })); setActiveTab('cases'); }}
                                >
                                  {formatCategory(category.disease_category)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="analytics-badge" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{category.case_count}</span>
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>
                                  {statistics ? `${Math.round((category.case_count / statistics.total_cases) * 100)}%` : '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {category.contagious_count > 0
                                    ? <span className="analytics-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>{category.contagious_count}</span>
                                    : <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
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

                {/* Disease Trends by Species */}
                {trends && (
                  <div className="analytics-glass-card">
                    <div className="analytics-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 className="analytics-card-title">
                        <i className="fas fa-paw" style={{ color: '#2563eb' }}></i>
                        Disease Trends by Species
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Species</label>
                        <select value={selectedSpecies} onChange={(e) => setSelectedSpecies(e.target.value)} className="analytics-select-input" style={{ width: 'auto', minWidth: '140px' }}>
                          {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="analytics-card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                        {trends.most_common_diseases && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', background: '#f8fafc' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Diseases</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {Object.entries(trends.most_common_diseases).slice(0, 5).map(([disease, count], index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: index < 4 ? '1px solid #e2e8f0' : 'none' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>{disease}</span>
                                  <span className="analytics-badge" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {trends.severity_distribution && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', background: '#f8fafc' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Severity Breakdown</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {Object.entries(trends.severity_distribution).map(([severity, count]) => {
                                const sevColor = severity === 'critical' ? '#dc2626' : severity === 'severe' ? '#ea580c' : severity === 'moderate' ? '#d97706' : '#059669';
                                const sevBg = severity === 'critical' ? '#fee2e2' : severity === 'severe' ? '#ffedd5' : severity === 'moderate' ? '#fffbeb' : '#ecfdf5';
                                return (
                                  <div key={severity} style={{ backgroundColor: sevBg, border: `1px solid ${sevColor}30`, borderRadius: '12px', padding: '0.6rem 0.85rem', textAlign: 'center', minWidth: '75px', flex: 1 }}>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: sevColor, margin: 0 }}>{count}</p>
                                    <p style={{ fontSize: '0.725rem', color: sevColor, textTransform: 'capitalize', margin: '0.1rem 0 0 0', fontWeight: 700 }}>{severity}</p>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '1.25rem', fontSize: '0.825rem', color: '#475569' }}>
                              <span>Total: <strong>{trends.total_cases}</strong></span>
                              <span>Contagious: <strong style={{ color: '#e11d48' }}>{trends.contagious_percentage?.toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Sales Forecasting Tab */}
        {isAdmin && activeTab === 'sales' && (
          <>
            <div className="analytics-glass-card">
              <div className="analytics-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="analytics-card-title">
                  <i className="fas fa-chart-bar" style={{ color: '#10b981' }}></i>
                  Monthly Revenue Forecast
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Forecast Period</label>
                    <select value={salesPeriod} onChange={(e) => setSalesPeriod(parseInt(e.target.value))} className="analytics-select-input" style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                  <button onClick={fetchSalesData} className="analytics-btn-action analytics-btn-emerald" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
                    <i className="fas fa-sync-alt"></i> Generate
                  </button>
                </div>
              </div>
              <div className="analytics-card-body">
                {loading ? (
                  <div className="med-records-empty-card" style={{ padding: '2rem' }}>
                    <div className="appts-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                    <p style={{ color: '#64748b', margin: 0 }}>Generating sales forecast...</p>
                  </div>
                ) : !salesData.forecast ? (
                  <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Click "Generate" to load the sales forecast.</p>
                ) : salesData.forecast?.success === false ? (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Sales forecasting model is not loaded. Please train the model first.</p>
                ) : (() => {
                  const monthlyForecast = salesData.forecast?.forecast?.monthly_forecast || [];
                  return monthlyForecast.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Model: {salesData.forecast?.forecast?.model_used || 'ML Model'}</p>
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th style={{ textAlign: 'right' }}>Forecast Revenue</th>
                            <th style={{ textAlign: 'right' }}>Avg Daily</th>
                            <th style={{ textAlign: 'right' }}>Lower Bound</th>
                            <th style={{ textAlign: 'right' }}>Upper Bound</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyForecast.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.month}</td>
                              <td style={{ textAlign: 'right', color: '#059669', fontWeight: 800, fontSize: '0.95rem' }}>LKR {Number(row.monthly_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'right', color: '#334155', fontWeight: 600 }}>LKR {Number(row.avg_daily_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'right', color: '#64748b' }}>LKR {Number(row.lower_bound || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'right', color: '#64748b' }}>LKR {Number(row.upper_bound || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null;
                })()}

                {salesData.forecast?.success !== false && salesData.forecast?.forecast && (
                  <ExplainWithAI outputType="sales_forecast" data={salesData.forecast.forecast} />
                )}
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
                  <div className="analytics-stats-grid">
                    {[
                      { label: 'Total Forecast Revenue', value: `LKR ${totalForecastRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#059669', bg: '#ecfdf5', icon: 'fa-sack-dollar' },
                      { label: 'YoY Growth', value: yoy != null ? `${yoy > 0 ? '+' : ''}${Number(yoy).toFixed(1)}%` : 'N/A', color: yoy >= 0 ? '#2563eb' : '#dc2626', bg: yoy >= 0 ? '#eff6ff' : '#fff1f2', icon: yoy >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down' },
                      { label: 'Best Day', value: bestDay ? bestDay.day_of_week : 'N/A', color: '#7c3aed', bg: '#f3e8ff', icon: 'fa-calendar-star' },
                      { label: 'Avg Monthly Revenue', value: trendsData.avg_monthly_revenue != null ? `LKR ${Number(trendsData.avg_monthly_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A', color: '#d97706', bg: '#fffbeb', icon: 'fa-calendar-check' },
                    ].map((s, i) => (
                      <div key={i} className="analytics-stat-card">
                        <div className="analytics-stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div>
                          <div className="analytics-stat-label">{s.label}</div>
                          <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {dayPatterns.length > 0 && (
                    <div className="analytics-glass-card">
                      <div className="analytics-card-header">
                        <h3 className="analytics-card-title">
                          <i className="fas fa-calendar-week" style={{ color: '#10b981' }}></i>
                          Revenue by Day of Week
                        </h3>
                      </div>
                      <div className="analytics-card-body">
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                          {dayPatterns.map((d, idx) => (
                            <div key={idx} style={{ flex: '1 1 calc(14% - 0.5rem)', minWidth: '100px', backgroundColor: '#f0fdf4', borderRadius: '14px', padding: '0.75rem 0.5rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>{d.day_of_week}</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>LKR {Number(d.avg_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
            <div className="analytics-glass-card">
              <div className="analytics-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="analytics-card-title">
                  <i className="fas fa-warehouse" style={{ color: '#f59e0b' }}></i>
                  Inventory Reorder Summary
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Forecast Period</label>
                    <select value={inventoryDays} onChange={(e) => setInventoryDays(parseInt(e.target.value))} className="analytics-select-input" style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                  <button onClick={fetchInventoryData} className="analytics-btn-action" style={{ backgroundColor: '#f59e0b', padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
                    <i className="fas fa-sync-alt"></i> Generate
                  </button>
                </div>
              </div>
              <div className="analytics-card-body">
                {loading ? (
                  <div className="med-records-empty-card" style={{ padding: '2rem' }}>
                    <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#f59e0b' }}></div>
                    <p style={{ color: '#64748b', margin: 0 }}>Generating inventory forecast...</p>
                  </div>
                ) : !inventoryData.reorderSuggestions ? (
                  <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Click "Generate" to load inventory reorder suggestions.</p>
                ) : inventoryData.reorderSuggestions?.success === false ? (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Inventory forecasting model is not loaded. Please train the model first.</p>
                ) : (() => {
                  const summary = (inventoryData.reorderSuggestions?.recommendations || {}).summary || {};
                  return (
                    <div className="analytics-stats-grid">
                      {[
                        { label: 'Urgent Reorder', value: summary.urgent_count ?? 0, color: '#dc2626', bg: '#fee2e2', icon: 'fa-triangle-exclamation' },
                        { label: 'Reorder Soon', value: summary.upcoming_count ?? 0, color: '#d97706', bg: '#fffbeb', icon: 'fa-clock' },
                        { label: 'Sufficient Stock', value: summary.sufficient_count ?? 0, color: '#059669', bg: '#ecfdf5', icon: 'fa-circle-check' },
                        { label: 'Est. Reorder Cost', value: `LKR ${Number(summary.estimated_reorder_cost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2563eb', bg: '#eff6ff', icon: 'fa-receipt' },
                      ].map((s, i) => (
                        <div key={i} className="analytics-stat-card">
                          <div className="analytics-stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                            <i className={`fas ${s.icon}`}></i>
                          </div>
                          <div>
                            <div className="analytics-stat-label">{s.label}</div>
                            <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {inventoryData.reorderSuggestions?.success !== false && inventoryData.reorderSuggestions?.recommendations?.summary && (
                  <ExplainWithAI outputType="inventory_forecast" data={inventoryData.reorderSuggestions.recommendations.summary} />
                )}
              </div>
            </div>

            {/* Reorder Suggestion Tables */}
            {inventoryData.reorderSuggestions?.success !== false && inventoryData.reorderSuggestions && (() => {
              const recs = inventoryData.reorderSuggestions?.recommendations || {};
              const urgent = recs.urgent_reorder || [];
              const soon = recs.reorder_soon || [];
              const renderTable = (items, color, icon, label) => items.length === 0 ? null : (
                <div className="analytics-glass-card" key={label}>
                  <div className="analytics-card-header">
                    <h3 className="analytics-card-title" style={{ color }}>
                      <i className={`fas ${icon}`}></i>
                      {label}
                      <span className="analytics-badge" style={{ backgroundColor: color === '#dc2626' ? '#fee2e2' : '#fffbeb', color, marginLeft: '0.5rem' }}>{items.length} items</span>
                    </h3>
                  </div>
                  <div className="analytics-card-body" style={{ padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ textAlign: 'right' }}>Current Stock</th>
                            <th style={{ textAlign: 'right' }}>Reorder Qty</th>
                            <th style={{ textAlign: 'right' }}>Est. Cost</th>
                            <th>Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.item_name}</td>
                              <td style={{ textAlign: 'right', color: '#475569' }}>{item.current_stock ?? 'N/A'}</td>
                              <td style={{ textAlign: 'right', color, fontWeight: 800 }}>{item.suggested_order_quantity ?? 'N/A'}</td>
                              <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{item.estimated_cost != null ? `LKR ${Number(item.estimated_cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}</td>
                              <td style={{ color: '#64748b' }}>
                                <span className="analytics-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                                  {formatCategory(item.category)}
                                </span>
                              </td>
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

export default Analytics;
