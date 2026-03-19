import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import auditLogService from '../services/auditLogService';

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
      gap: '0.3rem',
      padding: '0.22rem 0.6rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: '700',
      backgroundColor: m.bg,
      color: m.color,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap'
    }}>
      <i className={`fas ${m.icon}`} style={{ fontSize: '0.65rem' }}></i>
      {action}
    </span>
  );
}

function InfoPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.infoPanel}>
      <div style={styles.infoPanelHeader} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-info-circle" style={{ color: '#2563eb' }}></i>
          <strong style={{ fontSize: '0.875rem', color: '#1e40af' }}>About System Logs</strong>
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#6b7280', fontSize: '0.75rem' }}></i>
      </div>
      {open && (
        <div style={styles.infoPanelBody}>
          <p style={styles.infoText}>
            System logs capture significant actions performed by staff members. Each entry records <strong>who</strong> performed the action, <strong>what</strong> was affected, and <strong>when</strong> it happened.
          </p>
          <div style={styles.actionGrid}>
            {Object.entries(ACTION_META).map(([key, m]) => (
              <div key={key} style={styles.actionInfoItem}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem',
                  fontWeight: '700', backgroundColor: m.bg, color: m.color, marginBottom: '0.3rem'
                }}>
                  <i className={`fas ${m.icon}`} style={{ fontSize: '0.65rem' }}></i> {m.label}
                </span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>{m.desc}</p>
              </div>
            ))}
          </div>
          <div style={styles.infoNote}>
            <i className="fas fa-lightbulb" style={{ color: '#d97706', marginRight: '0.4rem' }}></i>
            <span style={{ fontSize: '0.8rem', color: '#78350f' }}>
              <strong>Tip:</strong> Click any row to expand and see the before/after values of the change. Use filters to narrow down to specific date ranges, staff members, or record types.
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
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/audit-logs/export${query ? '?' + query : ''}`;
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
      <div style={styles.pagination}>
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} style={currentPage <= 1 ? styles.pageBtnDisabled : styles.pageBtnEnabled}>
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages.filter(Boolean).map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 0.3rem', color: '#9ca3af' }}>…</span>
            : <button key={p} onClick={() => handlePageChange(p)} style={p === currentPage ? styles.pageBtnCurrent : styles.pageBtnEnabled}>{p}</button>
        )}
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pagination.pages} style={currentPage >= pagination.pages ? styles.pageBtnDisabled : styles.pageBtnEnabled}>
          <i className="fas fa-chevron-right"></i>
        </button>
        <span style={styles.pageInfo}>Page {currentPage} of {pagination.pages} &nbsp;·&nbsp; {pagination.total} total</span>
      </div>
    );
  };

  return (
    <Layout>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}><i className="fas fa-clipboard-list" style={{ marginRight: '0.5rem', color: '#2563eb' }}></i>System Audit Logs</h1>
            <p style={styles.subtitle}>View, search, and filter all significant system actions recorded for auditing purposes</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleExport} style={styles.exportBtn} title="Export to CSV">
              <i className="fas fa-download"></i> Export CSV
            </button>
            <button onClick={handleRefresh} style={styles.refreshBtn} title="Refresh logs">
              <i className={`fas fa-sync-alt${loading ? ' fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>

        <InfoPanel />

        {/* Filters */}
        <div style={styles.filterCard}>
          <div style={styles.filterCardHeader}>
            <i className="fas fa-filter" style={{ color: '#6b7280', fontSize: '0.8rem' }}></i>
            <span style={styles.filterCardTitle}>Filter Logs</span>
            {hasActiveFilters && (
              <span style={styles.activeFiltersBadge}>Filters active</span>
            )}
          </div>
          <form onSubmit={handleApply}>
            {/* Row 1: Search, Action Type, Record Type */}
            <div style={styles.filterGrid}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  Search
                  <span style={styles.filterHint}>by action, table, or staff name</span>
                </label>
                <div style={styles.inputWithIcon}>
                  <i className="fas fa-search" style={styles.inputIcon}></i>
                  <input
                    name="search"
                    value={filters.search}
                    onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                    placeholder="e.g. DELETE, customers, Dr. Silva..."
                    style={{ ...styles.filterInput, paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  Action Type
                  <span style={styles.filterHint}>what was done</span>
                </label>
                <select
                  value={filters.action}
                  onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}
                  style={styles.filterInput}
                >
                  <option value="">All action types</option>
                  {Object.entries(ACTION_META).map(([key, m]) => (
                    <option key={key} value={key}>{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  Record Type
                  <span style={styles.filterHint}>which table was affected</span>
                </label>
                <select
                  value={filters.table_name}
                  onChange={e => setFilters(p => ({ ...p, table_name: e.target.value }))}
                  style={styles.filterInput}
                >
                  <option value="">All record types</option>
                  {Object.entries(TABLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Date Range */}
            <div style={styles.filterRow2}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  From Date
                  <span style={styles.filterHint}>start of date range</span>
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
                  style={styles.filterInput}
                  max={filters.date_to || undefined}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  To Date
                  <span style={styles.filterHint}>end of date range</span>
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
                  style={styles.filterInput}
                  min={filters.date_from || undefined}
                />
              </div>
            </div>

            <div style={styles.filterFooter}>
              <div style={styles.filterActions}>
                <button type="submit" style={styles.applyBtn}>
                  <i className="fas fa-search"></i> Apply Filters
                </button>
                {hasActiveFilters && (
                  <button type="button" onClick={handleClear} style={styles.clearBtn}>
                    <i className="fas fa-times"></i> Clear All
                  </button>
                )}
              </div>
              <p style={styles.filterNote}>
                <i className="fas fa-keyboard" style={{ marginRight: '0.3rem', color: '#9ca3af' }}></i>
                Fill any filter above then click <strong>Apply Filters</strong>, or press <kbd style={styles.kbd}>Enter</kbd>
              </p>
            </div>
          </form>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Error loading logs</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <span style={styles.tableTitle}>
              {loading ? 'Loading...' : pagination.total > 0
                ? `${pagination.total} log entr${pagination.total !== 1 ? 'ies' : 'y'}${hasActiveFilters ? ' matching filters' : ''}`
                : 'Audit Log Entries'
              }
            </span>
            <span style={styles.tableHint}>
              <i className="fas fa-hand-point-down" style={{ marginRight: '0.3rem' }}></i>
              Click a row to expand and view full details
            </span>
          </div>

          {loading ? (
            <div style={styles.centeredState}>
              <div style={styles.spinner}></div>
              <p style={{ color: '#6b7280', marginTop: '0.75rem' }}>Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={styles.emptyState}>
              <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
              <h3 style={{ margin: '0 0 0.5rem', color: '#374151', fontSize: '1rem' }}>
                {hasActiveFilters ? 'No logs match your filters' : 'No audit logs recorded yet'}
              </h3>
              <p style={{ margin: '0 0 1rem', color: '#9ca3af', fontSize: '0.875rem', maxWidth: '380px', textAlign: 'center' }}>
                {hasActiveFilters
                  ? 'Try adjusting or clearing your filters to see more results.'
                  : 'Audit entries are created when staff perform significant actions like deleting or inactivating records. Perform such an action and it will appear here.'
                }
              </p>
              {hasActiveFilters && (
                <button onClick={handleClear} style={styles.applyBtn}>
                  <i className="fas fa-times"></i> Clear Filters
                </button>
              )}
              {!hasActiveFilters && (
                <div style={styles.whatGetsLoggedBox}>
                  <p style={{ margin: '0 0 0.6rem', fontWeight: '600', fontSize: '0.8rem', color: '#374151' }}>
                    What gets logged:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.7' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Date &amp; Time</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Record Type</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>ID</th>
                    <th style={styles.th}>Performed By</th>
                    <th style={styles.th}>IP Address</th>
                    <th style={{ ...styles.th, textAlign: 'center', width: '48px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const ts = formatTimestamp(log.timestamp);
                    const isExpanded = expandedRow === log.log_id;
                    return (
                      <>
                        <tr
                          key={log.log_id}
                          onClick={() => toggleRow(log.log_id)}
                          style={isExpanded ? { ...styles.tr, backgroundColor: '#f0f7ff', borderBottom: 'none' } : styles.tr}
                        >
                          <td style={styles.td}>
                            <div style={{ lineHeight: '1.4' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: '500', color: '#111827' }}>{ts.date}</div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{ts.time}</div>
                            </div>
                          </td>
                          <td style={styles.td}><ActionBadge action={log.action} /></td>
                          <td style={styles.td}>
                            <span style={{ fontSize: '0.85rem', color: '#374151' }}>{fmtTable(log.table_name)}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'monospace' }}>#{log.record_id ?? '—'}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ lineHeight: '1.4' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#111827' }}>{log.performed_by || 'Unknown'}</div>
                              {log.performed_by_role && (
                                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'capitalize' }}>{log.performed_by_role}</div>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>{log.ip_address || '—'}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              backgroundColor: isExpanded ? '#dbeafe' : '#f3f4f6',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.65rem', color: isExpanded ? '#2563eb' : '#9ca3af' }}></i>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${log.log_id}-detail`}>
                            <td colSpan={7} style={styles.detailCell}>
                              <div style={styles.detailInner}>
                                <div style={styles.detailGrid}>
                                  <div style={styles.detailBlock}>
                                    <p style={styles.detailLabel}><i className="fas fa-history" style={{ marginRight: '0.3rem', color: '#dc2626' }}></i>Before (Old Values)</p>
                                    {log.old_values
                                      ? <pre style={{ ...styles.jsonPre, borderLeft: '3px solid #fca5a5' }}>{JSON.stringify(log.old_values, null, 2)}</pre>
                                      : <p style={styles.noData}>No previous data recorded</p>
                                    }
                                  </div>
                                  <div style={styles.detailBlock}>
                                    <p style={styles.detailLabel}><i className="fas fa-arrow-right" style={{ marginRight: '0.3rem', color: '#16a34a' }}></i>After (New Values / Reason)</p>
                                    {log.new_values
                                      ? <pre style={{ ...styles.jsonPre, borderLeft: '3px solid #86efac' }}>{JSON.stringify(log.new_values, null, 2)}</pre>
                                      : <p style={styles.noData}>No new data recorded</p>
                                    }
                                  </div>
                                </div>
                                {log.user_agent && (
                                  <div style={styles.userAgentRow}>
                                    <span style={styles.userAgentLabel}><i className="fas fa-desktop" style={{ marginRight: '0.3rem' }}></i>Browser / Client:</span>
                                    <span style={styles.userAgentText}>{log.user_agent}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    gap: '1rem'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.25rem'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.9rem',
    backgroundColor: '#16a34a',
    border: '1px solid #15803d',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.9rem',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#374151',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },

  // Info panel
  infoPanel: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    marginBottom: '1rem',
    overflow: 'hidden'
  },
  infoPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    userSelect: 'none'
  },
  infoPanelBody: {
    padding: '0 1rem 1rem'
  },
  infoText: {
    margin: '0 0 0.75rem',
    fontSize: '0.875rem',
    color: '#1e40af',
    lineHeight: '1.5'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.75rem',
    marginBottom: '0.75rem'
  },
  actionInfoItem: {
    backgroundColor: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '6px',
    padding: '0.6rem 0.75rem',
    display: 'flex',
    flexDirection: 'column'
  },
  infoNote: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '6px',
    padding: '0.6rem 0.75rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.3rem'
  },

  // Filter card
  filterCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem 1rem',
    marginBottom: '1rem'
  },
  filterCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f3f4f6'
  },
  filterCardTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#111827'
  },
  activeFiltersBadge: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    padding: '0.15rem 0.55rem',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: '600',
    marginLeft: 'auto'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem 1.25rem',
    marginBottom: '1rem'
  },
  filterRow2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem 1.25rem',
    marginBottom: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  filterLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.3rem',
    minHeight: '1.1rem'
  },
  filterHint: {
    fontSize: '0.71rem',
    fontWeight: '400',
    color: '#9ca3af'
  },
  inputWithIcon: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: '0.65rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    fontSize: '0.75rem',
    pointerEvents: 'none'
  },
  filterInput: {
    width: '100%',
    height: '2.25rem',
    padding: '0 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#111827',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'auto'
  },
  filterFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '0.85rem'
  },
  filterActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  filterNote: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#9ca3af'
  },
  applyBtn: {
    padding: '0.45rem 1rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem'
  },
  clearBtn: {
    padding: '0.45rem 0.85rem',
    backgroundColor: '#f9fafb',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem'
  },
  kbd: {
    display: 'inline-block',
    padding: '0.1rem 0.35rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    color: '#374151'
  },

  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem'
  },

  // Table card
  tableCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '1rem'
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  tableTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151'
  },
  tableHint: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  centeredState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 2rem',
    textAlign: 'center'
  },
  whatGetsLoggedBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    textAlign: 'left',
    marginTop: '0.5rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem'
  },
  thead: {
    backgroundColor: '#f9fafb'
  },
  th: {
    padding: '0.65rem 1rem',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '0.72rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.1s'
  },
  td: {
    padding: '0.75rem 1rem',
    verticalAlign: 'middle'
  },

  // Expanded row detail
  detailCell: {
    backgroundColor: '#f0f7ff',
    borderBottom: '2px solid #bfdbfe',
    padding: 0
  },
  detailInner: {
    padding: '1rem 1.25rem'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
    marginBottom: '0.75rem'
  },
  detailBlock: {},
  detailLabel: {
    margin: '0 0 0.4rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center'
  },
  jsonPre: {
    margin: 0,
    padding: '0.6rem 0.75rem',
    backgroundColor: '#fff',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflow: 'auto',
    fontFamily: 'monospace'
  },
  noData: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: '0.5rem 0'
  },
  userAgentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid #dbeafe'
  },
  userAgentLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  userAgentText: {
    fontSize: '0.78rem',
    color: '#6b7280',
    wordBreak: 'break-all'
  },

  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    flexWrap: 'wrap'
  },
  pageBtnEnabled: {
    minWidth: '34px',
    height: '34px',
    padding: '0 0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pageBtnCurrent: {
    minWidth: '34px',
    height: '34px',
    padding: '0 0.5rem',
    border: '1px solid #2563eb',
    borderRadius: '6px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600'
  },
  pageBtnDisabled: {
    minWidth: '34px',
    height: '34px',
    padding: '0 0.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
    color: '#d1d5db',
    fontSize: '0.85rem',
    cursor: 'not-allowed',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pageInfo: {
    marginLeft: '0.5rem',
    fontSize: '0.8rem',
    color: '#9ca3af'
  }
};

export default SystemLogs;
