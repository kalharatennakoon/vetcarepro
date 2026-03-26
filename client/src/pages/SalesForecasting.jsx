import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function SalesForecasting() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data state
  const [forecast, setForecast] = useState(null);
  const [trends, setTrends] = useState(null);
  const [topServices, setTopServices] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);
  const [monthPredLoading, setMonthPredLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast');

  // Controls
  const [forecastPeriods, setForecastPeriods] = useState(90);
  const [trendMonths, setTrendMonths] = useState(12);
  const [predMonth, setPredMonth] = useState(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
  const [predYear, setPredYear] = useState(new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear());
  const [monthPredResult, setMonthPredResult] = useState(null);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, trendsRes, topServicesRes, statusRes] = await Promise.allSettled([
        axios.get(`${API_URL}/ml/sales/forecast?periods=${forecastPeriods}`, getHeaders()),
        axios.get(`${API_URL}/ml/sales/trends?months=${trendMonths}`, getHeaders()),
        axios.get(`${API_URL}/ml/sales/top-services?limit=8`, getHeaders()),
        axios.get(`${API_URL}/ml/models/status`, getHeaders()),
      ]);

      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value.data);
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.data);
      if (topServicesRes.status === 'fulfilled') setTopServices(topServicesRes.value.data);
      if (statusRes.status === 'fulfilled') setModelStatus(statusRes.value.data);

      // If all failed with 503 the model isn't trained yet — that's OK
      const allFailed = [forecastRes, trendsRes, topServicesRes].every(r => r.status === 'rejected');
      if (allFailed) {
        setError('Sales forecasting model is not trained yet. Click "Train Model" to get started.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales forecasting data.');
    } finally {
      setLoading(false);
    }
  }, [forecastPeriods, trendMonths]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleTrainModel = async () => {
    setTrainingLoading(true);
    setTrainSuccess(false);
    setError(null);
    try {
      await axios.post(`${API_URL}/ml/sales/train`, {}, getHeaders());
      await loadAllData();
      setTrainSuccess(true);
      setTimeout(() => setTrainSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Training failed. Make sure billing data exists.');
    } finally {
      setTrainingLoading(false);
    }
  };

  const handlePredictMonth = async () => {
    setMonthPredLoading(true);
    setMonthPredResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/ml/sales/predict-month`,
        { month: parseInt(predMonth), year: parseInt(predYear) },
        getHeaders()
      );
      setMonthPredResult(res.data);
    } catch (err) {
      setMonthPredResult({ error: err.response?.data?.message || 'Prediction failed.' });
    } finally {
      setMonthPredLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val == null) return 'N/A';
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentYear = new Date().getFullYear();

  // Build stat cards data
  const salesModelInfo = modelStatus?.models?.sales_forecasting || modelStatus?.sales_model || null;
  const forecastData = forecast?.forecast?.daily_forecast || forecast?.data?.forecast?.daily_forecast || [];
  const trendsObj = trends?.trends || trends?.data?.trends || {};
  const historicalData = (trendsObj?.monthly_trends || []).map(r => ({
    ...r,
    month_key: `${r.year}-${String(r.month).padStart(2, '0')}`
  }));
  const serviceData = topServices?.top_services || topServices?.data?.top_services || [];
  const paymentMethodLabels = {
    cash: 'Cash',
    card: 'Debit/Credit Card',
    bank_transfer: 'Bank Transfer',
    mobile_payment: 'Mobile Payment/QR',
    insurance: 'Insurance',
  };
  const rawPaymentDict = trendsObj?.payment_method_breakdown || {};
  const paymentData = Object.entries(rawPaymentDict).map(([k, v]) => ({
    payment_method: paymentMethodLabels[k] || k,
    amount: v
  }));
  const dayOfWeekData = trendsObj?.day_of_week_patterns || [];
  const totalForecastRevenue = forecastData.reduce((sum, d) => sum + (d.predicted_revenue || 0), 0);
  const avgMonthlyRevenue = historicalData.length > 0
    ? historicalData.reduce((sum, d) => sum + parseFloat(d.revenue || d.total_revenue || 0), 0) / historicalData.length
    : 0;

  return (
    <Layout>
      <div style={styles.container}>

        {/* Page Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <i className="fas fa-chart-line" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Sales Forecasting</h1>
              <p style={styles.subtitle}>AI-powered revenue prediction & trend analysis</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button onClick={loadAllData} style={styles.btnSecondary} disabled={loading}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
              Refresh
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleTrainModel}
                style={trainingLoading ? { ...styles.btnPrimary, opacity: 0.6 } : styles.btnPrimary}
                disabled={trainingLoading}
              >
                <i className="fas fa-brain" style={{ marginRight: '0.5rem' }}></i>
                {trainingLoading ? 'Training...' : 'Train Model'}
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={styles.errorAlert}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}

        {/* Success Banner */}
        {trainSuccess && (
          <div style={styles.successAlert}>
            <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
            Sales forecasting model trained successfully! Forecasts have been updated.
          </div>
        )}

        {/* Stat Cards */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#3b82f6')}>
              <i className="fas fa-crystal-ball" style={{ color: '#3b82f6', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Forecast Revenue ({forecastPeriods}d)</p>
              <p style={styles.statValue}>{loading ? '...' : formatCurrency(totalForecastRevenue)}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#10b981')}>
              <i className="fas fa-calendar-check" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Avg Monthly Revenue</p>
              <p style={styles.statValue}>{loading ? '...' : formatCurrency(avgMonthlyRevenue)}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#f59e0b')}>
              <i className="fas fa-receipt" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Top Service</p>
              <p style={{ ...styles.statValue, fontSize: '1rem' }}>
                {loading ? '...' : (serviceData[0]?.service_name || serviceData[0]?.name || 'N/A')}
              </p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap(salesModelInfo?.trained ? '#10b981' : '#9ca3af')}>
              <i className="fas fa-robot" style={{ color: salesModelInfo?.trained ? '#10b981' : '#9ca3af', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Model Status</p>
              <p style={{ ...styles.statValue, fontSize: '1rem', color: salesModelInfo?.trained ? '#10b981' : '#9ca3af' }}>
                {loading ? '...' : (salesModelInfo?.trained ? 'Trained' : 'Not Trained')}
              </p>
            </div>
          </div>
        </div>

        {/* Model Status Card */}
        {(salesModelInfo || user?.role === 'admin') && (
          <div style={styles.modelStatusCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: salesModelInfo?.trained ? '#16a34a' : '#dc2626', display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Sales Forecasting Model</span>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px', backgroundColor: salesModelInfo?.trained ? '#dcfce7' : '#fee2e2', color: salesModelInfo?.trained ? '#15803d' : '#dc2626' }}>
                  {salesModelInfo?.trained ? 'Active' : 'Not Trained'}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                  Prophet + Random Forest
                </span>
                {salesModelInfo?.last_trained_at ? (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    Last trained: {new Date(salesModelInfo.last_trained_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Never trained</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {salesModelInfo?.training_data?.daily_records && (
                  <span style={{ fontSize: '0.8rem', color: '#4b5563' }}><strong style={{ color: '#1f2937' }}>{salesModelInfo.training_data.daily_records}</strong> daily records</span>
                )}
                {salesModelInfo?.training_data?.date_range && (
                  <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                    Range: <strong style={{ color: '#1f2937' }}>{salesModelInfo.training_data.date_range.start}</strong> → <strong style={{ color: '#1f2937' }}>{salesModelInfo.training_data.date_range.end}</strong>
                  </span>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={handleTrainModel}
                    disabled={trainingLoading}
                    style={{ padding: '0.35rem 0.9rem', backgroundColor: trainingLoading ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: trainingLoading ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <i className={`fas ${trainingLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                    {trainingLoading ? 'Training...' : 'Retrain Model'}
                  </button>
                )}
              </div>
            </div>
            <p style={styles.cardHint}>
              <i className="fas fa-circle-info" style={styles.cardHintIcon}></i>
              Retrain after adding new billing data to keep forecasts accurate. Training uses all historical billing records.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabBar}>
          {['forecast', 'trends', 'services', 'predictor'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? { ...styles.tab, ...styles.tabActive } : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'forecast' && <><i className="fas fa-chart-area" style={{ marginRight: '0.4rem' }}></i>Revenue Forecast</>}
              {tab === 'trends' && <><i className="fas fa-chart-bar" style={{ marginRight: '0.4rem' }}></i>Trends</>}
              {tab === 'services' && <><i className="fas fa-star" style={{ marginRight: '0.4rem' }}></i>Top Services</>}
              {tab === 'predictor' && <><i className="fas fa-magic" style={{ marginRight: '0.4rem' }}></i>Month Predictor</>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading sales data...</p>
          </div>
        ) : (
          <>
            {/* ── FORECAST TAB ── */}
            {activeTab === 'forecast' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-chart-area" style={{ marginRight: '0.5rem', color: '#3b82f6' }}></i>
                      Revenue Forecast
                    </h3>
                    <p style={styles.cardSubtitle}>Projected daily revenue with confidence interval</p>
                  </div>
                  <div style={styles.controlRow}>
                    <label style={styles.controlLabel}>Periods:</label>
                    <select
                      value={forecastPeriods}
                      onChange={(e) => setForecastPeriods(Number(e.target.value))}
                      style={styles.selectSm}
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                    </select>
                  </div>
                </div>
                <div style={styles.cardBody}>
                  {forecastData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={340}>
                      <AreaChart data={forecastData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => {
                            const d = new Date(v);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                          }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(val, name) => [formatCurrency(val), name]}
                          labelFormatter={(l) => formatDate(l)}
                        />
                        <Legend />
                        {forecastData[0]?.upper_bound != null && (
                          <Area
                            type="monotone"
                            dataKey="upper_bound"
                            stroke="none"
                            fill="url(#confGrad)"
                            name="Upper Bound"
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="predicted_revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#forecastGrad)"
                          name="Predicted Revenue"
                        />
                        {forecastData[0]?.lower_bound != null && (
                          <Area
                            type="monotone"
                            dataKey="lower_bound"
                            stroke="none"
                            fill="url(#confGrad)"
                            name="Lower Bound"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={styles.emptyState}>
                      <i className="fas fa-chart-area" style={styles.emptyIcon}></i>
                      <p>No forecast data available. Train the model first.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TRENDS TAB ── */}
            {activeTab === 'trends' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Monthly Historical */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>
                        <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>
                        Monthly Revenue History
                      </h3>
                      <p style={styles.cardSubtitle}>Actual revenue per month</p>
                    </div>
                    <div style={styles.controlRow}>
                      <label style={styles.controlLabel}>Months:</label>
                      <select
                        value={trendMonths}
                        onChange={(e) => setTrendMonths(Number(e.target.value))}
                        style={styles.selectSm}
                      >
                        <option value={6}>6 months</option>
                        <option value={12}>12 months</option>
                        <option value={24}>24 months</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    {historicalData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={historicalData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="month_key"
                            tickFormatter={(v) => {
                              const d = new Date(v + '-01');
                              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            }}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} />
                          <Bar
                            dataKey={historicalData[0]?.revenue != null ? 'revenue' : 'total_revenue'}
                            fill="#10b981"
                            name="Monthly Revenue"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={styles.emptyState}>
                        <i className="fas fa-chart-bar" style={styles.emptyIcon}></i>
                        <p>No historical data available.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.twoCol}>
                  {/* Payment Methods */}
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>
                        <i className="fas fa-credit-card" style={{ marginRight: '0.5rem', color: '#8b5cf6' }}></i>
                        Payment Methods
                      </h3>
                    </div>
                    <div style={styles.cardBody}>
                      {paymentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={paymentData}
                              dataKey={paymentData[0]?.amount != null ? 'amount' : 'total'}
                              nameKey={paymentData[0]?.payment_method != null ? 'payment_method' : 'method'}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val) => [formatCurrency(val)]} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={styles.emptyState}>
                          <i className="fas fa-credit-card" style={styles.emptyIcon}></i>
                          <p>No payment data available.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day of Week */}
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>
                        <i className="fas fa-calendar-week" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>
                        Revenue by Day of Week
                      </h3>
                    </div>
                    <div style={styles.cardBody}>
                      {dayOfWeekData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={dayOfWeekData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day_of_week" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val) => [formatCurrency(val), 'Avg Revenue']} />
                            <Bar
                              dataKey={dayOfWeekData[0]?.avg_revenue != null ? 'avg_revenue' : 'revenue'}
                              fill="#f59e0b"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={styles.emptyState}>
                          <i className="fas fa-calendar-week" style={styles.emptyIcon}></i>
                          <p>No day-of-week data available.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SERVICES TAB ── */}
            {activeTab === 'services' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-star" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>
                      Top Revenue-Generating Services
                    </h3>
                    <p style={styles.cardSubtitle}>Services ranked by total revenue contribution</p>
                  </div>
                </div>
                <div style={styles.cardBody}>
                  {serviceData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={serviceData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="item_name"
                            tick={{ fontSize: 11 }}
                            width={115}
                          />
                          <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} />
                          <Bar
                            dataKey={serviceData[0]?.total_revenue != null ? 'total_revenue' : 'revenue'}
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                          >
                            {serviceData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Service Table */}
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={styles.theadRow}>
                              <th style={styles.th}>Rank</th>
                              <th style={styles.th}>Service</th>
                              <th style={styles.th}>Revenue</th>
                              <th style={styles.th}>Transactions</th>
                              <th style={styles.th}>Avg Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceData.map((svc, i) => (
                              <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.rankBadge,
                                    backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fef3c7' : '#f9fafb',
                                    color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#d97706' : '#9ca3af'
                                  }}>
                                    #{i + 1}
                                  </span>
                                </td>
                                <td style={styles.td}>{svc.item_name || svc.service_name || svc.name}</td>
                                <td style={{ ...styles.td, fontWeight: '600', color: '#10b981' }}>
                                  {formatCurrency(svc.total_revenue || svc.revenue)}
                                </td>
                                <td style={styles.td}>{svc.times_billed || svc.transaction_count || svc.count || 'N/A'}</td>
                                <td style={styles.td}>
                                  {formatCurrency(svc.avg_price || svc.avg_value || svc.avg_revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={styles.emptyState}>
                      <i className="fas fa-star" style={styles.emptyIcon}></i>
                      <p>No service data available. Train the model first.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MONTH PREDICTOR TAB ── */}
            {activeTab === 'predictor' && (
              <div style={styles.twoCol}>
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-magic" style={{ marginRight: '0.5rem', color: '#8b5cf6' }}></i>
                      Monthly Revenue Predictor
                    </h3>
                  </div>
                  <div style={styles.cardBody}>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                      Select a month and year to get an AI-powered revenue prediction.
                    </p>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Month</label>
                      <select
                        value={predMonth}
                        onChange={(e) => setPredMonth(Number(e.target.value))}
                        style={styles.formControl}
                      >
                        {monthNames.map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Year</label>
                      <select
                        value={predYear}
                        onChange={(e) => setPredYear(Number(e.target.value))}
                        style={styles.formControl}
                      >
                        {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handlePredictMonth}
                      disabled={monthPredLoading}
                      style={monthPredLoading ? { ...styles.btnPrimary, opacity: 0.6, width: '100%' } : { ...styles.btnPrimary, width: '100%' }}
                    >
                      <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i>
                      {monthPredLoading ? 'Predicting...' : 'Predict Revenue'}
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-chart-pie" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>
                      Prediction Result
                    </h3>
                  </div>
                  <div style={styles.cardBody}>
                    {!monthPredResult && !monthPredLoading && (
                      <div style={styles.emptyState}>
                        <i className="fas fa-lightbulb" style={styles.emptyIcon}></i>
                        <p>Select a month and year, then click Predict.</p>
                      </div>
                    )}
                    {monthPredLoading && (
                      <div style={styles.emptyState}>
                        <i className="fas fa-spinner fa-spin" style={{ ...styles.emptyIcon, color: '#3b82f6' }}></i>
                        <p>Running prediction...</p>
                      </div>
                    )}
                    {monthPredResult && !monthPredLoading && (
                      monthPredResult.error ? (
                        <div style={styles.errorAlert}>{monthPredResult.error}</div>
                      ) : (
                        <div>
                          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            Prediction for <strong>{monthNames[predMonth - 1]} {predYear}</strong>
                          </p>
                          <div style={styles.predResultBox}>
                            <p style={styles.predResultLabel}>Predicted Revenue</p>
                            <p style={styles.predResultValue}>
                              {formatCurrency(monthPredResult.predicted_revenue || monthPredResult.prediction || monthPredResult.data?.predicted_revenue)}
                            </p>
                          </div>
                          {(monthPredResult.lower_bound || monthPredResult.data?.lower_bound) && (
                            <div style={styles.predBoundsRow}>
                              <div style={styles.predBound}>
                                <p style={styles.predBoundLabel}>Lower Bound</p>
                                <p style={styles.predBoundValue}>
                                  {formatCurrency(monthPredResult.lower_bound || monthPredResult.data?.lower_bound)}
                                </p>
                              </div>
                              <div style={styles.predBound}>
                                <p style={styles.predBoundLabel}>Upper Bound</p>
                                <p style={styles.predBoundValue}>
                                  {formatCurrency(monthPredResult.upper_bound || monthPredResult.data?.upper_bound)}
                                </p>
                              </div>
                            </div>
                          )}
                          {(monthPredResult.confidence || monthPredResult.data?.confidence) && (
                            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '1rem' }}>
                              Confidence: <strong>{monthPredResult.confidence || monthPredResult.data?.confidence}</strong>
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  container: { padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIcon: { fontSize: '2rem', color: '#3b82f6' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' },
  subtitle: { margin: 0, fontSize: '0.875rem', color: '#6b7280' },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  btnPrimary: { padding: '0.6rem 1.2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center' },
  btnSecondary: { padding: '0.6rem 1.2rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center' },
  errorAlert: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '1rem' },
  statIconWrap: (color) => ({ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  statLabel: { margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' },
  tabBar: { display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '10px', flexWrap: 'wrap' },
  tab: { padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', backgroundColor: 'transparent', display: 'flex', alignItems: 'center' },
  tabActive: { backgroundColor: 'white', color: '#1f2937', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1.5rem' },
  cardHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' },
  cardTitle: { margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center' },
  cardSubtitle: { margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#9ca3af' },
  cardBody: { padding: '1.5rem' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  controlRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  controlLabel: { fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' },
  selectSm: { padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', color: '#374151', cursor: 'pointer' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#9ca3af', textAlign: 'center' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem', color: '#d1d5db' },
  tableWrapper: { overflowX: 'auto', marginTop: '1.5rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  theadRow: { backgroundColor: '#f9fafb' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '0.75rem 1rem', color: '#4b5563', borderBottom: '1px solid #f3f4f6' },
  trEven: { backgroundColor: 'white' },
  trOdd: { backgroundColor: '#fafafa' },
  rankBadge: { padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' },
  formGroup: { marginBottom: '1.25rem' },
  formLabel: { display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
  formControl: { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', color: '#374151', boxSizing: 'border-box' },
  predResultBox: { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' },
  predResultLabel: { margin: 0, fontSize: '0.8rem', color: '#3b82f6', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' },
  predResultValue: { margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1e40af' },
  predBoundsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  predBound: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' },
  predBoundLabel: { margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' },
  predBoundValue: { margin: '0.25rem 0 0', fontSize: '1rem', fontWeight: '600', color: '#374151' },
  modelInfoBar: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#374151' },
  modelInfoBadge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' },
  modelStatusCard: { background: 'linear-gradient(to right, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem' },
  successAlert: { backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center' },
  cardHint: { margin: '0.6rem 0 0', fontSize: '0.73rem', color: '#6b7280', lineHeight: '1.5', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.5rem' },
  cardHintIcon: { color: '#93c5fd', marginRight: '0.35rem', fontSize: '0.7rem' },
};

export default SalesForecasting;
