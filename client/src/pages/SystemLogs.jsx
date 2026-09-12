import { useState, useEffect, useRef, Fragment } from 'react';
import Layout from '../components/Layout';
import auditLogService from '../services/auditLogService';
import '../styles/SystemLogsModern.css';

const PAGE_LIMIT = 50;

const ACTION_META = {
  DELETE:     { bg: '#fee2e2', color: '#dc2626', icon: 'fa-trash',         label: 'Delete',     desc: 'Permanent hard delete of a record' },
  DEACTIVATE: { bg: '#fef3c7', color: '#b45309', icon: 'fa-ban',           label: 'Deactivate', desc: 'Staff account or inventory item disabled' },
  INACTIVATE: { bg: '#fef3c7', color: '#b45309', icon: 'fa-user-slash',    label: 'Inactivate', desc: 'Customer or pet marked as inactive with reason' },
  CREATE:     { bg: '#dcfce7', color: '#16a34a', icon: 'fa-plus-circle',   label: 'Create',     desc: 'New record added to the system' },
  UPDATE:     { bg: '#dbeafe', color: '#2563eb', icon: 'fa-edit',          label: 'Update',     desc: 'Existing record modified' },
  TRAIN:      { bg: '#f3e8ff', color: '#7c3aed', icon: 'fa-brain',         label: 'Train',      desc: 'ML model trained or retrained' },
  PREDICT:    { bg: '#ecfdf5', color: '#059669', icon: 'fa-microscope',    label: 'Predict',    desc: 'Health risk prediction run for a pet' },
};

const TABLE_LABELS = {
  audit_logs:     'Audit Logs',
  customers:      'Customers',
  pets:           'Pets',
  users:          'Staff / Users',
  inventory:      'Inventory',
  appointments:   'Appointments',
  medical_records:'Medical Records',
  disease_cases:  'Disease Cases',
  billing:        'Billing',
  lab_reports:    'Lab Reports',
  ml_models:      'ML Models',
};

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { bg: '#f3f4f6', color: '#374151', icon: 'fa-circle' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '6px',
      fontSize: '0.725rem',
      fontWeight: '700',
      backgroundColor: m.bg,
      color: m.color,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
    }}>
      <i className={`fas ${m.icon}`} style={{ fontSize: '0.65rem' }}></i>
      {action}
    </span>
  );
}

function InfoPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="syslog-info-card">
      <div className="syslog-info-header" onClick={() => setOpen(o => !o)}>
        <span className="syslog-info-title">
          <i className="fas fa-info-circle" style={{ color: '#2563eb' }}></i>
          <strong>About System Logs & Audit Policy</strong>
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
      </div>
      {open && (
        <div className="syslog-info-body">
          <p className="syslog-info-text">
            System audit logs capture significant actions performed by staff members. Each entry records <strong>who</strong> performed the action, <strong>what</strong> was affected, and <strong>when</strong> it happened.
          </p>
          <div className="syslog-action-grid">
            {Object.entries(ACTION_META).map(([key, m]) => (
              <div key={key} className="syslog-action-item">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.725rem',
                  fontWeight: '700', backgroundColor: m.bg, color: m.color, marginBottom: '0.35rem'
                }}>
                  <i className={`fas ${m.icon}`} style={{ fontSize: '0.65rem' }}></i> {m.label}
                </span>
                <p className="syslog-action-desc">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="syslog-info-tip">
            <i className="fas fa-lightbulb" style={{ color: '#d97706' }}></i>
            <span>
              <strong>Tip:</strong> Click any log row to expand and view full before/after state comparisons. Use filters to scope by date ranges, staff members, or record types.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  const [filters, setFilters] = useState({
    search: '',
    action: '',
    table_name: '',
    date_from: '',
    date_to: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const doFetch = async (f, page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (f.search)     params.search     = f.search;
      if (f.action)     params.action     = f.action;
      if (f.table_name) params.table_name = f.table_name;
      if (f.date_from)  params.date_from  = f.date_from;
      if (f.date_to)    params.date_to    = f.date_to;

      const res = await auditLogService.getLogs(params);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
    doFetch(filters, 1);
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setExpandedRow(null);
    doFetch(filters, 1);
  };

  const handleClear = () => {
    const empty = { search: '', action: '', table_name: '', date_from: '', date_to: '', user_id: '' };
    setFilters(empty);
    setCurrentPage(1);
    setExpandedRow(null);
    doFetch(empty, 1);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    setExpandedRow(null);
    doFetch(filters, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    doFetch(filters, currentPage);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.search)     params.set('search',     filters.search);
    if (filters.action)     params.set('action',     filters.action);
    if (filters.table_name) params.set('table_name', filters.table_name);
    if (filters.date_from)  params.set('date_from',  filters.date_from);
    if (filters.date_to)    params.set('date_to',    filters.date_to);
    const token = localStorage.getItem('token');
    const query = params.toString();
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/audit-logs/export${query ? '?' + query : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `system_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time };
  };

  const fmtTable = (name) => TABLE_LABELS[name] || name?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  const toggleRow = (id) => setExpandedRow(prev => prev === id ? null : id);

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(pagination.pages, currentPage + 2);
    if (start > 1) pages.push(1, start > 2 ? '...' : null);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pagination.pages) pages.push(end < pagination.pages - 1 ? '...' : null, pagination.pages);

    return (
      <div className="syslog-pagination">
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage <= 1} 
          className="syslog-page-btn"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages.filter(Boolean).map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 0.35rem', color: '#94a3b8' }}>…</span>
            : <button 
                key={p} 
                onClick={() => handlePageChange(p)} 
                className={`syslog-page-btn ${p === currentPage ? 'active' : ''}`}
              >
                {p}
              </button>
        )}
        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage >= pagination.pages} 
          className="syslog-page-btn"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
        <span className="syslog-page-info">
          Page {currentPage} of {pagination.pages} &nbsp;·&nbsp; {pagination.total} total logs
        </span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="syslog-container">

        {/* Page Header Hero */}
        <div className="syslog-header-card">
          <div className="syslog-header-left">
            <div className="syslog-header-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div>
              <h1 className="syslog-title">System Audit Logs</h1>
              <p className="syslog-subtitle">View, search, and filter all significant system actions recorded for auditing purposes</p>
            </div>
          </div>
          <div className="syslog-header-actions">
            <button onClick={handleExport} className="syslog-btn-export" title="Export to CSV">
              <i className="fas fa-download"></i> Export CSV
            </button>
            <button onClick={handleRefresh} className="syslog-btn-refresh" title="Refresh logs">
              <i className={`fas fa-sync-alt${loading ? ' fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>

        <InfoPanel />

        {/* Filters Card */}
        <div className="syslog-filter-card">
          <div className="syslog-filter-header">
            <div className="syslog-filter-title">
              <i className="fas fa-filter" style={{ color: '#3b82f6' }}></i>
              Filter Audit Logs
            </div>
            {hasActiveFilters && (
              <span className="syslog-active-badge">
                <i className="fas fa-check-circle" style={{ marginRight: '0.3rem' }}></i>
                Filters Active
              </span>
            )}
          </div>
          <form onSubmit={handleApply}>
            {/* Filter Grid */}
            <div className="syslog-filter-grid">
              <div className="syslog-filter-group">
                <label className="syslog-filter-label">
                  Search Term
                  <span className="syslog-filter-hint">Action, table, or staff name</span>
                </label>
                <div className="syslog-search-box">
                  <i className="fas fa-search syslog-search-icon"></i>
                  <input
                    name="search"
                    value={filters.search}
                    onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                    placeholder="e.g. DELETE, customers, Dr. Silva..."
                    className="syslog-input syslog-search-input"
                  />
                </div>
              </div>

              <div className="syslog-filter-group">
                <label className="syslog-filter-label">
                  Action Type
                  <span className="syslog-filter-hint">Operation performed</span>
                </label>
                <select
                  value={filters.action}
                  onChange={e => {
                    const updated = { ...filters, action: e.target.value };
                    setFilters(updated);
                    setCurrentPage(1);
                    setExpandedRow(null);
                    doFetch(updated, 1);
                  }}
                  className="syslog-select"
                >
                  <option value="">All Action Types</option>
                  {Object.entries(ACTION_META).map(([key, m]) => (
                    <option key={key} value={key}>{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>

              <div className="syslog-filter-group">
                <label className="syslog-filter-label">
                  Record Type
                  <span className="syslog-filter-hint">Target table</span>
                </label>
                <select
                  value={filters.table_name}
                  onChange={e => {
                    const updated = { ...filters, table_name: e.target.value };
                    setFilters(updated);
                    setCurrentPage(1);
                    setExpandedRow(null);
                    doFetch(updated, 1);
                  }}
                  className="syslog-select"
                >
                  <option value="">All Record Types</option>
                  {Object.entries(TABLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="syslog-filter-group">
                <label className="syslog-filter-label">
                  From Date
                  <span className="syslog-filter-hint">Start date</span>
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
                  className="syslog-input"
                  max={filters.date_to || undefined}
                />
              </div>

              <div className="syslog-filter-group">
                <label className="syslog-filter-label">
                  To Date
                  <span className="syslog-filter-hint">End date</span>
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
                  className="syslog-input"
                  min={filters.date_from || undefined}
                />
              </div>
            </div>

            <div className="syslog-filter-footer">
              <div className="syslog-filter-actions">
                <button type="submit" className="syslog-btn-apply">
                  <i className="fas fa-search"></i> Apply Filters
                </button>
                {hasActiveFilters && (
                  <button type="button" onClick={handleClear} className="syslog-btn-clear">
                    <i className="fas fa-times"></i> Clear All
                  </button>
                )}
              </div>
              <p className="syslog-filter-note">
                <i className="fas fa-keyboard"></i>
                Fill any filter above then click <strong>Apply Filters</strong>, or press <kbd className="syslog-kbd">Enter</kbd>
              </p>
            </div>
          </form>
        </div>

        {error && (
          <div ref={errorRef} className="syslog-alert-error">
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.1rem' }}></i>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>Error Loading Audit Logs</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results Table Card */}
        <div className="syslog-table-card">
          <div className="syslog-table-header">
            <span className="syslog-table-title">
              <i className="fas fa-history" style={{ color: '#3b82f6' }}></i>
              {loading ? 'Loading Logs...' : pagination.total > 0
                ? `${pagination.total} log entr${pagination.total !== 1 ? 'ies' : 'y'}${hasActiveFilters ? ' matching filters' : ''}`
                : 'Audit Log Entries'
              }
            </span>
            <span className="syslog-table-hint">
              <i className="fas fa-hand-point-down"></i>
              Click any row to expand details
            </span>
          </div>

          {loading ? (
            <div className="syslog-loading-state">
              <div className="syslog-spinner"></div>
              <p>Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="syslog-empty-state">
              <i className="fas fa-clipboard-list syslog-empty-icon"></i>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700 }}>
                {hasActiveFilters ? 'No logs match your filters' : 'No audit logs recorded yet'}
              </h3>
              <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', lineHeight: 1.5 }}>
                {hasActiveFilters
                  ? 'Try adjusting or clearing your filters to see more results.'
                  : 'Audit entries are automatically generated when staff perform actions like deleting, updating, or inactivating records.'
                }
              </p>
              {hasActiveFilters && (
                <button onClick={handleClear} className="syslog-btn-apply">
                  <i className="fas fa-times"></i> Clear Filters
                </button>
              )}
              {!hasActiveFilters && (
                <div className="syslog-logged-box">
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '700', fontSize: '0.825rem', color: '#0f172a' }}>
                    What gets logged:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#475569', lineHeight: '1.7' }}>
                    <li>Permanently deleting a customer or pet record</li>
                    <li>Inactivating a customer or pet (with reason)</li>
                    <li>Deactivating a staff account</li>
                    <li>Deactivating an inventory item</li>
                    <li>Deleting a disease case</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="syslog-table-wrapper">
              <table className="syslog-table">
                <thead>
                  <tr>
                    <th className="syslog-th" style={{ width: '150px' }}>Date &amp; Time</th>
                    <th className="syslog-th" style={{ width: '130px' }}>Action</th>
                    <th className="syslog-th" style={{ width: '160px' }}>Record Type</th>
                    <th className="syslog-th" style={{ textAlign: 'center', width: '110px' }}>Record ID</th>
                    <th className="syslog-th">Performed By</th>
                    <th className="syslog-th" style={{ width: '150px' }}>IP Address</th>
                    <th className="syslog-th" style={{ textAlign: 'center', width: '48px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const ts = formatTimestamp(log.timestamp);
                    const isExpanded = expandedRow === log.log_id;
                    return (
                      <Fragment key={log.log_id}>
                        <tr
                          onClick={() => toggleRow(log.log_id)}
                          className={`syslog-tr ${isExpanded ? 'expanded' : ''}`}
                        >
                          <td className="syslog-td" style={{ width: '150px' }}>
                            <div>
                              <div className="syslog-timestamp-date">{ts.date}</div>
                              <div className="syslog-timestamp-time">{ts.time}</div>
                            </div>
                          </td>
                          <td className="syslog-td" style={{ width: '130px' }}><ActionBadge action={log.action} /></td>
                          <td className="syslog-td" style={{ width: '160px' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                              {fmtTable(log.table_name)}
                            </span>
                          </td>
                          <td className="syslog-td" style={{ textAlign: 'center', width: '110px' }}>
                            <span className="syslog-record-id">#{log.record_id ?? '—'}</span>
                          </td>
                          <td className="syslog-td">
                            <div>
                              <div className="syslog-user-name">{log.performed_by || 'Unknown'}</div>
                              {log.performed_by_role && (
                                <div className="syslog-user-role">{log.performed_by_role}</div>
                              )}
                            </div>
                          </td>
                          <td className="syslog-td" style={{ width: '150px' }}>
                            <span className="syslog-ip-badge">{log.ip_address || '—'}</span>
                          </td>
                          <td className="syslog-td" style={{ textAlign: 'center', width: '48px' }}>
                            <div className="syslog-expand-pill">
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="syslog-detail-cell">
                              <div className="syslog-detail-inner">
                                <div className="syslog-detail-grid">
                                  <div className="syslog-detail-block">
                                    <p className="syslog-detail-label before">
                                      <i className="fas fa-history"></i> Before (Old Values)
                                    </p>
                                    {log.old_values
                                      ? <pre className="syslog-json-pre before">{JSON.stringify(log.old_values, null, 2)}</pre>
                                      : <p className="syslog-no-data">No previous state recorded</p>
                                    }
                                  </div>
                                  <div className="syslog-detail-block">
                                    <p className="syslog-detail-label after">
                                      <i className="fas fa-arrow-right"></i> After (New Values / Reason)
                                    </p>
                                    {log.new_values
                                      ? <pre className="syslog-json-pre after">{JSON.stringify(log.new_values, null, 2)}</pre>
                                      : <p className="syslog-no-data">No new state recorded</p>
                                    }
                                  </div>
                                </div>
                                {log.user_agent && (
                                  <div className="syslog-agent-row">
                                    <span className="syslog-agent-label">
                                      <i className="fas fa-desktop" style={{ marginRight: '0.3rem' }}></i>Client / User Agent:
                                    </span>
                                    <span className="syslog-agent-text">{log.user_agent}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {renderPagination()}

      </div>
    </Layout>
  );
}

export default SystemLogs;
