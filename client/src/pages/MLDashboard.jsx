import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function MLDashboard() {
  const [mlHealth, setMlHealth] = useState(null);
  const [modelsStatus, setModelsStatus] = useState(null);
  const [dbTest, setDbTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMLStatus();
  }, []);

  const fetchMLStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch ML health
      const healthRes = await axios.get(`${API_URL}/ml/health`, config);
      setMlHealth(healthRes.data);

      // Fetch models status
      const modelsRes = await axios.get(`${API_URL}/ml/models/status`, config);
      setModelsStatus(modelsRes.data);

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch ML status');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.get(`${API_URL}/ml/test/db-connection`, config);
      setDbTest(res.data);
    } catch (err) {
      setDbTest({ 
        success: false, 
        message: err.response?.data?.message || 'Database test failed' 
      });
    }
  };

  const getStatusColor = (status) => {
    return status === 'healthy' ? '#10b981' : '#ef4444';
  };

  const getModelStatusColor = (loaded, trained) => {
    if (loaded && trained) return '#10b981';
    if (loaded && !trained) return '#f59e0b';
    return '#6b7280';
  };

  const getModelStatusText = (loaded, trained) => {
    if (loaded && trained) return 'Ready';
    if (loaded && !trained) return 'Loaded (Untrained)';
    return 'Not Loaded';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
          <p>Loading ML Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <i className="fas fa-brain"></i> Machine Learning Dashboard
        </h1>
        <p style={styles.subtitle}>Monitor ML service health and model status</p>
      </div>

      <div style={styles.grid}>
        {/* ML Service Health */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <i className="fas fa-heartbeat"></i> Service Health
            </h2>
          </div>
          <div style={styles.cardBody}>
            {mlHealth && (
              <>
                <div style={styles.healthItem}>
                  <span style={styles.label}>Service:</span>
                  <span style={styles.value}>{mlHealth.service}</span>
                </div>
                <div style={styles.healthItem}>
                  <span style={styles.label}>Status:</span>
                  <span style={{
                    ...styles.value,
                    color: getStatusColor(mlHealth.status),
                    fontWeight: 'bold'
                  }}>
                    {mlHealth.status.toUpperCase()}
                  </span>
                </div>
                <div style={styles.healthItem}>
                  <span style={styles.label}>Version:</span>
                  <span style={styles.value}>{mlHealth.version}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Models Status */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <i className="fas fa-robot"></i> Models Status
            </h2>
          </div>
          <div style={styles.cardBody}>
            {modelsStatus?.models && (
              <div style={styles.modelsGrid}>
                {Object.entries(modelsStatus.models).map(([modelName, status]) => (
                  <div key={modelName} style={styles.modelItem}>
                    <div style={styles.modelIcon}>
                      <i className={
                        modelName.includes('disease') ? 'fas fa-virus' :
                        modelName.includes('sales') ? 'fas fa-chart-line' :
                        'fas fa-boxes'
                      }></i>
                    </div>
                    <div style={styles.modelInfo}>
                      <div style={styles.modelName}>
                        {modelName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div style={{
                        ...styles.modelStatus,
                        color: getModelStatusColor(status.loaded, status.trained)
                      }}>
                        {getModelStatusText(status.loaded, status.trained)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Database Test */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <i className="fas fa-database"></i> Database Connection
            </h2>
          </div>
          <div style={styles.cardBody}>
            <button onClick={testDatabaseConnection} style={styles.testButton}>
              <i className="fas fa-plug"></i> Test Connection
            </button>
            
            {dbTest && (
              <div style={{
                ...styles.testResult,
                backgroundColor: dbTest.success ? '#ecfdf5' : '#fef2f2',
                borderColor: dbTest.success ? '#10b981' : '#ef4444'
              }}>
                <div style={{
                  color: dbTest.success ? '#10b981' : '#ef4444',
                  fontWeight: 'bold'
                }}>
                  {dbTest.success ? '✓ SUCCESS' : '✗ FAILED'}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                  {dbTest.message}
                </div>
                {dbTest.timestamp && (
                  <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
                    {new Date(dbTest.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <i className="fas fa-info-circle"></i> ML Features
            </h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.featuresList}>
              <div style={styles.featureItem}>
                <i className="fas fa-virus" style={styles.featureIcon}></i>
                <div>
                  <div style={styles.featureTitle}>Disease Prediction</div>
                  <div style={styles.featureDesc}>
                    Predict disease outbreaks and trends
                  </div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <i className="fas fa-chart-line" style={styles.featureIcon}></i>
                <div>
                  <div style={styles.featureTitle}>Sales Forecasting</div>
                  <div style={styles.featureDesc}>
                    Forecast future revenue and sales patterns
                  </div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <i className="fas fa-boxes" style={styles.featureIcon}></i>
                <div>
                  <div style={styles.featureTitle}>Inventory Optimization</div>
                  <div style={styles.featureDesc}>
                    Predict stock demand and optimize reordering
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.note}>
              <i className="fas fa-info-circle"></i>
              <span>Models are ready for training. Phase 2 implementation coming soon.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  cardBody: {
    padding: '1.5rem'
  },
  healthItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f3f4f6'
  },
  label: {
    color: '#6b7280',
    fontWeight: '500'
  },
  value: {
    color: '#1f2937',
    fontWeight: '600'
  },
  modelsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  modelItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  modelIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem'
  },
  modelInfo: {
    flex: 1
  },
  modelName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  modelStatus: {
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  testButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  testResult: {
    marginTop: '1rem',
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid'
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  featureItem: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  featureIcon: {
    fontSize: '1.5rem',
    color: '#3b82f6',
    marginTop: '0.25rem'
  },
  featureTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  featureDesc: {
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  note: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1e40af',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem'
  },
  error: {
    padding: '1rem',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    borderRadius: '8px',
    textAlign: 'center'
  }
};
