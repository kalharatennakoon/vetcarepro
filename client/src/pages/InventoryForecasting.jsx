import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';


const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function InventoryForecasting() {
  const { user } = useAuth();

  // Data state
  const [reorderRecs, setReorderRecs] = useState(null);
  const [fastMoving, setFastMoving] = useState(null);
  const [categoryAnalysis, setCategoryAnalysis] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);
  const [itemLookupLoading, setItemLookupLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('reorder');
  const [reorderFilter, setReorderFilter] = useState('all');
  const [forecastDays, setForecastDays] = useState(30);

  // Item lookup state
  const [lookupItemId, setLookupItemId] = useState('');
  const [itemForecast, setItemForecast] = useState(null);
  const [restockPred, setRestockPred] = useState(null);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reorderRes, fastRes, categoryRes, statusRes] = await Promise.allSettled([
        axios.get(`${API_URL}/ml/inventory/reorder-suggestions?days=${forecastDays}`, getHeaders()),
        axios.get(`${API_URL}/ml/inventory/fast-moving?limit=10`, getHeaders()),
        axios.get(`${API_URL}/ml/inventory/category-analysis`, getHeaders()),
        axios.get(`${API_URL}/ml/models/status`, getHeaders()),
      ]);

      if (reorderRes.status === 'fulfilled') setReorderRecs(reorderRes.value.data);
      if (fastRes.status === 'fulfilled') setFastMoving(fastRes.value.data);
      if (categoryRes.status === 'fulfilled') setCategoryAnalysis(categoryRes.value.data);
      if (statusRes.status === 'fulfilled') setModelStatus(statusRes.value.data);

      const allFailed = [reorderRes, fastRes, categoryRes].every(r => r.status === 'rejected');
      if (allFailed) {
        setError('Inventory forecasting model is not trained yet. Click "Train Model" to get started.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory forecasting data.');
    } finally {
      setLoading(false);
    }
  }, [forecastDays]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleTrainModel = async () => {
    setTrainingLoading(true);
    setTrainSuccess(false);
    setError(null);
    try {
      await axios.post(`${API_URL}/ml/inventory/train`, {}, getHeaders());
      await loadAllData();
      setTrainSuccess(true);
      setTimeout(() => setTrainSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Training failed. Make sure inventory data exists.');
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleItemLookup = async () => {
    if (!lookupItemId.trim()) return;
    setItemLookupLoading(true);
    setItemForecast(null);
    setRestockPred(null);
    try {
      const [forecastRes, restockRes] = await Promise.allSettled([
        axios.post(`${API_URL}/ml/inventory/forecast`, { item_id: parseInt(lookupItemId), days: forecastDays }, getHeaders()),
        axios.post(`${API_URL}/ml/inventory/predict-restock`, { item_id: parseInt(lookupItemId) }, getHeaders()),
      ]);
      if (forecastRes.status === 'fulfilled') setItemForecast(forecastRes.value.data);
      else setItemForecast({ error: forecastRes.reason?.response?.data?.message || 'Forecast failed.' });
      if (restockRes.status === 'fulfilled') setRestockPred(restockRes.value.data);
      else setRestockPred({ error: restockRes.reason?.response?.data?.message || 'Restock prediction failed.' });
    } catch (err) {
      setItemForecast({ error: 'Lookup failed.' });
    } finally {
      setItemLookupLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val == null) return 'N/A';
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const urgencyStyle = (urgency) => ({
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor:
      urgency === 'urgent' ? '#fef2f2' :
      urgency === 'soon' ? '#fffbeb' :
      '#f0fdf4',
    color:
      urgency === 'urgent' ? '#dc2626' :
      urgency === 'soon' ? '#d97706' :
      '#16a34a',
  });

  // Derived data
  const inventoryModelInfo = modelStatus?.models?.inventory_forecasting || modelStatus?.inventory_model || null;
  const recommendations = reorderRecs?.recommendations || reorderRecs?.data?.recommendations || [];
  const fastItems = fastMoving?.fast_moving || fastMoving?.data?.fast_moving || [];
  const slowItems = fastMoving?.slow_moving || fastMoving?.data?.slow_moving || [];
  const categories = categoryAnalysis?.category_analysis || categoryAnalysis?.data?.category_analysis || [];

  const urgentItems = recommendations.filter(r => (r.urgency || r.priority) === 'urgent');
  const soonItems = recommendations.filter(r => (r.urgency || r.priority) === 'soon');
  const sufficientItems = recommendations.filter(r =>
    (r.urgency || r.priority) !== 'urgent' && (r.urgency || r.priority) !== 'soon'
  );

  const filteredRecommendations = reorderFilter === 'all' ? recommendations
    : reorderFilter === 'urgent' ? urgentItems
    : reorderFilter === 'soon' ? soonItems
    : sufficientItems;

  const totalReorderCost = recommendations.reduce(
    (sum, r) => sum + ((r.reorder_quantity || r.suggested_quantity || 0) * (r.unit_cost || r.cost || 0)), 0
  );

  return (
    <Layout>
      <div style={styles.container}>

        {/* Page Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <i className="fas fa-boxes" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Inventory Forecasting</h1>
              <p style={styles.subtitle}>AI-powered demand prediction & smart reorder recommendations</p>
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
            Inventory forecasting model trained successfully! Recommendations have been updated.
          </div>
        )}

        {/* Stat Cards */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#ef4444')}>
              <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Urgent Reorders</p>
              <p style={{ ...styles.statValue, color: urgentItems.length > 0 ? '#ef4444' : '#1f2937' }}>
                {loading ? '...' : urgentItems.length}
              </p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#f59e0b')}>
              <i className="fas fa-clock" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Order Soon</p>
              <p style={{ ...styles.statValue, color: soonItems.length > 0 ? '#d97706' : '#1f2937' }}>
                {loading ? '...' : soonItems.length}
              </p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#10b981')}>
              <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Sufficient Stock</p>
              <p style={styles.statValue}>{loading ? '...' : sufficientItems.length}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIconWrap('#3b82f6')}>
              <i className="fas fa-dollar-sign" style={{ color: '#3b82f6', fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <p style={styles.statLabel}>Est. Reorder Cost</p>
              <p style={styles.statValue}>{loading ? '...' : formatCurrency(totalReorderCost)}</p>
            </div>
          </div>
        </div>

        {/* Model Status Card */}
        {(inventoryModelInfo || user?.role === 'admin') && (
          <div style={styles.modelStatusCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: inventoryModelInfo?.trained ? '#16a34a' : '#dc2626', display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Inventory Forecasting Model</span>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px', backgroundColor: inventoryModelInfo?.trained ? '#dcfce7' : '#fee2e2', color: inventoryModelInfo?.trained ? '#15803d' : '#dc2626' }}>
                  {inventoryModelInfo?.trained ? 'Active' : 'Not Trained'}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                  Gradient Boosting
                </span>
                {inventoryModelInfo?.last_trained_at ? (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    Last trained: {new Date(inventoryModelInfo.last_trained_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Never trained</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {inventoryModelInfo?.items_tracked && (
                  <span style={{ fontSize: '0.8rem', color: '#4b5563' }}><strong style={{ color: '#1f2937' }}>{inventoryModelInfo.items_tracked}</strong> items tracked</span>
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
              Retrain after adding new inventory or billing data to keep demand predictions and reorder suggestions accurate.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabBar}>
          {['reorder', 'movement', 'categories', 'item-lookup'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? { ...styles.tab, ...styles.tabActive } : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'reorder' && <><i className="fas fa-shopping-cart" style={{ marginRight: '0.4rem' }}></i>Reorder Alerts</>}
              {tab === 'movement' && <><i className="fas fa-tachometer-alt" style={{ marginRight: '0.4rem' }}></i>Stock Movement</>}
              {tab === 'categories' && <><i className="fas fa-layer-group" style={{ marginRight: '0.4rem' }}></i>Category Demand</>}
              {tab === 'item-lookup' && <><i className="fas fa-search" style={{ marginRight: '0.4rem' }}></i>Item Lookup</>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading inventory data...</p>
          </div>
        ) : (
          <>
            {/* ── REORDER TAB ── */}
            {activeTab === 'reorder' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-shopping-cart" style={{ marginRight: '0.5rem', color: '#ef4444' }}></i>
                      Smart Reorder Recommendations
                    </h3>
                    <p style={styles.cardSubtitle}>
                      {recommendations.length} items analysed · {urgentItems.length} urgent
                    </p>
                  </div>
                  <div style={styles.filterGroup}>
                    {['all', 'urgent', 'soon', 'sufficient'].map(f => (
                      <button
                        key={f}
                        style={reorderFilter === f ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
                        onClick={() => setReorderFilter(f)}
                      >
                        {f === 'all' ? `All (${recommendations.length})` :
                         f === 'urgent' ? `Urgent (${urgentItems.length})` :
                         f === 'soon' ? `Soon (${soonItems.length})` :
                         `OK (${sufficientItems.length})`}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={styles.cardBody}>
                  {filteredRecommendations.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.theadRow}>
                            <th style={styles.th}>Item</th>
                            <th style={styles.th}>Category</th>
                            <th style={styles.th}>Current Stock</th>
                            <th style={styles.th}>Days Until Stockout</th>
                            <th style={styles.th}>Suggested Qty</th>
                            <th style={styles.th}>Reorder Point</th>
                            <th style={styles.th}>Est. Cost</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecommendations.map((item, i) => (
                            <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                              <td style={{ ...styles.td, fontWeight: '600', color: '#1f2937' }}>
                                {item.item_name || item.name}
                              </td>
                              <td style={styles.td}>{item.category || 'N/A'}</td>
                              <td style={styles.td}>{item.current_stock ?? item.quantity ?? 'N/A'}</td>
                              <td style={{ ...styles.td, fontWeight: '600', color:
                                (item.days_until_stockout || item.days_remaining) < 7 ? '#ef4444' :
                                (item.days_until_stockout || item.days_remaining) < 14 ? '#d97706' : '#16a34a'
                              }}>
                                {item.days_until_stockout ?? item.days_remaining ?? 'N/A'}
                                {(item.days_until_stockout ?? item.days_remaining) != null && ' days'}
                              </td>
                              <td style={{ ...styles.td, fontWeight: '600', color: '#3b82f6' }}>
                                {item.reorder_quantity ?? item.suggested_quantity ?? 'N/A'}
                              </td>
                              <td style={styles.td}>
                                {item.reorder_point ?? item.min_quantity ?? 'N/A'}
                              </td>
                              <td style={styles.td}>
                                {formatCurrency(
                                  (item.reorder_quantity || item.suggested_quantity || 0) * (item.unit_cost || item.cost || 0)
                                )}
                              </td>
                              <td style={styles.td}>
                                <span style={urgencyStyle(item.urgency || item.priority || 'sufficient')}>
                                  {item.urgency || item.priority || 'OK'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={styles.emptyState}>
                      <i className="fas fa-check-circle" style={{ ...styles.emptyIcon, color: '#10b981' }}></i>
                      <p>{reorderFilter === 'all' ? 'No recommendations available. Train the model first.' : `No items in "${reorderFilter}" category.`}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MOVEMENT TAB ── */}
            {activeTab === 'movement' && (
              <div style={styles.twoCol}>
                {/* Fast Moving */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>
                        <i className="fas fa-rocket" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>
                        Fast-Moving Items
                      </h3>
                      <p style={styles.cardSubtitle}>Highest demand items requiring close monitoring</p>
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    {fastItems.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={fastItems.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis
                              type="category"
                              dataKey={fastItems[0]?.item_name != null ? 'item_name' : 'name'}
                              tick={{ fontSize: 10 }}
                              width={95}
                            />
                            <Tooltip formatter={(val) => [`${val} units/day`, 'Avg Daily Demand']} />
                            <Bar
                              dataKey={fastItems[0]?.avg_daily_demand != null ? 'avg_daily_demand' : 'daily_demand'}
                              fill="#10b981"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: '1rem' }}>
                          {fastItems.slice(0, 5).map((item, i) => (
                            <div key={i} style={styles.movementRow}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ ...styles.rankDot, backgroundColor: CATEGORY_COLORS[i] }}></span>
                                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                                  {item.item_name || item.name}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
                                {item.avg_daily_demand?.toFixed(2) || item.daily_demand?.toFixed(2) || 'N/A'} u/day
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={styles.emptyState}>
                        <i className="fas fa-rocket" style={styles.emptyIcon}></i>
                        <p>No fast-moving data available.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slow Moving */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>
                        <i className="fas fa-snooze" style={{ marginRight: '0.5rem', color: '#9ca3af' }}></i>
                        Slow-Moving Items
                      </h3>
                      <p style={styles.cardSubtitle}>Items with low demand — consider reducing stock</p>
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    {slowItems.length > 0 ? (
                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={styles.theadRow}>
                              <th style={styles.th}>Item</th>
                              <th style={styles.th}>Category</th>
                              <th style={styles.th}>Stock</th>
                              <th style={styles.th}>Daily Demand</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slowItems.map((item, i) => (
                              <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                                <td style={{ ...styles.td, fontWeight: '500' }}>{item.item_name || item.name}</td>
                                <td style={styles.td}>{item.category || 'N/A'}</td>
                                <td style={styles.td}>{item.current_stock ?? item.quantity ?? 'N/A'}</td>
                                <td style={{ ...styles.td, color: '#9ca3af' }}>
                                  {item.avg_daily_demand?.toFixed(3) || item.daily_demand?.toFixed(3) || '0.000'} u/day
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={styles.emptyState}>
                        <i className="fas fa-check" style={{ ...styles.emptyIcon, color: '#10b981' }}></i>
                        <p>No slow-moving items detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── CATEGORIES TAB ── */}
            {activeTab === 'categories' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>
                    <i className="fas fa-layer-group" style={{ marginRight: '0.5rem', color: '#8b5cf6' }}></i>
                    Demand Analysis by Category
                  </h3>
                  <p style={styles.cardSubtitle}>Total and average daily demand per inventory category</p>
                </div>
                <div style={styles.cardBody}>
                  {categories.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={categories} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey={categories[0]?.category != null ? 'category' : 'name'}
                            tick={{ fontSize: 11 }}
                            angle={-15}
                            textAnchor="end"
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="total_avg_daily_demand"
                            name="Avg Daily Demand"
                            radius={[4, 4, 0, 0]}
                          >
                            {categories.map((_, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={styles.theadRow}>
                              <th style={styles.th}>Category</th>
                              <th style={styles.th}>Items</th>
                              <th style={styles.th}>Avg Daily Demand</th>
                              <th style={styles.th}>Current Stock (units)</th>
                              <th style={styles.th}>Low Stock Items</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((cat, i) => (
                              <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                                <td style={{ ...styles.td, fontWeight: '600' }}>
                                  <span style={{ ...styles.categoryDot, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}></span>
                                  {cat.category || cat.name}
                                </td>
                                <td style={styles.td}>{cat.item_count || cat.items || 'N/A'}</td>
                                <td style={{ ...styles.td, fontWeight: '600', color: '#3b82f6' }}>
                                  {(cat.total_avg_daily_demand || cat.avg_daily_demand || 0).toFixed(3)} u/day
                                </td>
                                <td style={styles.td}>{cat.total_current_stock != null ? cat.total_current_stock.toLocaleString() : 'N/A'}</td>
                                <td style={{ ...styles.td, color: (cat.items_needing_reorder || cat.low_stock_count || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                                  {cat.items_needing_reorder ?? cat.low_stock_count ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={styles.emptyState}>
                      <i className="fas fa-layer-group" style={styles.emptyIcon}></i>
                      <p>No category data available. Train the model first.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ITEM LOOKUP TAB ── */}
            {activeTab === 'item-lookup' && (
              <div style={styles.twoCol}>
                {/* Lookup Form */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-search" style={{ marginRight: '0.5rem', color: '#3b82f6' }}></i>
                      Item Demand Lookup
                    </h3>
                  </div>
                  <div style={styles.cardBody}>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                      Enter an inventory item ID to get its demand forecast and predicted restock date.
                    </p>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Forecast Period</label>
                      <select
                        value={forecastDays}
                        onChange={(e) => setForecastDays(Number(e.target.value))}
                        style={styles.formControl}
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={365}>1 year</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Inventory Item ID</label>
                      <input
                        type="number"
                        value={lookupItemId}
                        onChange={(e) => setLookupItemId(e.target.value)}
                        placeholder="e.g. 42"
                        style={styles.formControl}
                        min="1"
                      />
                    </div>
                    <button
                      onClick={handleItemLookup}
                      disabled={itemLookupLoading || !lookupItemId.trim()}
                      style={(itemLookupLoading || !lookupItemId.trim())
                        ? { ...styles.btnPrimary, opacity: 0.6, width: '100%' }
                        : { ...styles.btnPrimary, width: '100%' }
                      }
                    >
                      <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
                      {itemLookupLoading ? 'Looking up...' : 'Lookup Item'}
                    </button>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '0.4rem', color: '#3b82f6' }}></i>
                        You can find inventory item IDs on the <a href="/inventory" style={{ color: '#3b82f6' }}>Inventory page</a>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lookup Results */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>
                      <i className="fas fa-chart-line" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>
                      Item Forecast Results
                    </h3>
                  </div>
                  <div style={styles.cardBody}>
                    {!itemForecast && !restockPred && !itemLookupLoading && (
                      <div style={styles.emptyState}>
                        <i className="fas fa-search" style={styles.emptyIcon}></i>
                        <p>Enter an item ID and click Lookup to see its forecast.</p>
                      </div>
                    )}
                    {itemLookupLoading && (
                      <div style={styles.emptyState}>
                        <i className="fas fa-spinner fa-spin" style={{ ...styles.emptyIcon, color: '#3b82f6' }}></i>
                        <p>Fetching item data...</p>
                      </div>
                    )}
                    {itemForecast && !itemLookupLoading && (
                      <div>
                        {itemForecast.error ? (
                          <div style={styles.errorAlert}>{itemForecast.error}</div>
                        ) : (
                          <>
                            <div style={styles.lookupGrid}>
                              <div style={styles.lookupMetric}>
                                <p style={styles.lookupMetricLabel}>Item Name</p>
                                <p style={styles.lookupMetricValue}>
                                  {itemForecast.item_name || itemForecast.data?.item_name || `Item #${lookupItemId}`}
                                </p>
                              </div>
                              <div style={styles.lookupMetric}>
                                <p style={styles.lookupMetricLabel}>{forecastDays}-Day Demand</p>
                                <p style={{ ...styles.lookupMetricValue, color: '#3b82f6' }}>
                                  {(itemForecast.predicted_demand || itemForecast.total_demand || itemForecast.data?.predicted_demand || 0).toFixed(1)} units
                                </p>
                              </div>
                              <div style={styles.lookupMetric}>
                                <p style={styles.lookupMetricLabel}>Daily Avg Demand</p>
                                <p style={styles.lookupMetricValue}>
                                  {(itemForecast.avg_daily_demand || itemForecast.data?.avg_daily_demand || 0).toFixed(3)} u/day
                                </p>
                              </div>
                              <div style={styles.lookupMetric}>
                                <p style={styles.lookupMetricLabel}>Safety Stock</p>
                                <p style={styles.lookupMetricValue}>
                                  {itemForecast.safety_stock || itemForecast.data?.safety_stock || 'N/A'} units
                                </p>
                              </div>
                            </div>

                            {restockPred && !restockPred.error && (
                              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <i className="fas fa-calendar-alt" style={{ marginRight: '0.4rem' }}></i>
                                  Predicted Restock Date
                                </p>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e40af' }}>
                                  {formatDate(restockPred.restock_date || restockPred.data?.restock_date)}
                                </p>
                                {(restockPred.days_until_restock || restockPred.data?.days_until_restock) != null && (
                                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                                    In {restockPred.days_until_restock || restockPred.data?.days_until_restock} days
                                  </p>
                                )}
                              </div>
                            )}
                            {restockPred?.error && (
                              <div style={{ ...styles.errorAlert, marginTop: '1rem' }}>
                                Restock prediction: {restockPred.error}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
  filterGroup: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  filterBtn: { padding: '0.35rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', backgroundColor: 'white' },
  filterBtnActive: { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#9ca3af', textAlign: 'center' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem', color: '#d1d5db' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  theadRow: { backgroundColor: '#f9fafb' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td: { padding: '0.75rem 1rem', color: '#4b5563', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
  trEven: { backgroundColor: 'white' },
  trOdd: { backgroundColor: '#fafafa' },
  movementRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' },
  rankDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  categoryDot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '0.5rem' },
  formGroup: { marginBottom: '1.25rem' },
  formLabel: { display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
  formControl: { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', color: '#374151', boxSizing: 'border-box' },
  lookupGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  lookupMetric: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.875rem' },
  lookupMetricLabel: { margin: 0, fontSize: '0.7rem', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' },
  lookupMetricValue: { margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: '700', color: '#1f2937' },
  modelInfoBar: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#374151' },
  modelInfoBadge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' },
  modelStatusCard: { background: 'linear-gradient(to right, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem' },
  successAlert: { backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center' },
  cardHint: { margin: '0.6rem 0 0', fontSize: '0.73rem', color: '#6b7280', lineHeight: '1.5', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.5rem' },
  cardHintIcon: { color: '#93c5fd', marginRight: '0.35rem', fontSize: '0.7rem' },
};

export default InventoryForecasting;
