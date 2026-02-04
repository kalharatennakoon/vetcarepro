import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import Layout from '../components/Layout';

function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('financial');
  const [reportType, setReportType] = useState('revenue-summary');
  const [reportData, setReportData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report configurations
  const financialReports = [
    { value: 'revenue-summary', label: 'Revenue Summary' },
    { value: 'payments-by-method', label: 'Payments by Method' },
    { value: 'outstanding-balances', label: 'Outstanding Balances' },
    { value: 'revenue-by-service', label: 'Revenue by Service' },
    { value: 'top-customers', label: 'Top Customers' },
    { value: 'monthly-trend', label: 'Monthly Revenue Trend' }
  ];

  const operationalReports = [
    { value: 'appointment-stats', label: 'Appointment Statistics' },
    { value: 'appointments-by-type', label: 'Appointments by Type' },
    { value: 'patient-visits', label: 'Patient Visit Statistics' },
    { value: 'inventory-usage', label: 'Inventory Usage' }
  ];

  // Load dashboard summary on mount
  useEffect(() => {
    loadDashboardSummary();
  }, [startDate, endDate]);

  const loadDashboardSummary = async () => {
    try {
      const response = await reportService.getDashboardSummary(startDate, endDate);
      setDashboardSummary(response.data);
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let response;
      if (activeTab === 'financial') {
        response = await reportService.getFinancialReport(reportType, startDate, endDate);
      } else {
        response = await reportService.getOperationalReport(reportType, startDate, endDate);
      }
      setReportData(response);
    } catch (err) {
      setError(err.error || 'Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      await reportService.exportReport(activeTab, reportType, startDate, endDate);
    } catch (err) {
      setError(err.error || 'Failed to export report');
      console.error('Error exporting report:', err);
    }
  };

  // Pagination calculations
  const getPageNumbers = () => {
    if (!reportData || !reportData.data) return [];
    const data = Array.isArray(reportData.data) ? reportData.data : [reportData.data];
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (reportData && reportData.data) {
      const data = Array.isArray(reportData.data) ? reportData.data : [reportData.data];
      const totalPages = Math.ceil(data.length / itemsPerPage);
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const formatCurrency = (amount) => {
    return 'Rs. ' + new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderDashboardSummary = () => {
    if (!dashboardSummary) return null;

    return (
      <div style={styles.dashboardSummary}>
        <div style={styles.summaryHeader}>
          <h3 style={styles.summaryTitle}>Quick Summary</h3>
          <div style={styles.dateRangeBadge}>
            <i className="fas fa-calendar-alt" style={{marginRight: '0.5rem', fontSize: '0.875rem'}}></i>
            <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
          </div>
        </div>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <h4 style={styles.summaryCardTitle}><i className="fas fa-dollar-sign" style={{marginRight: '6px', color: '#667eea'}} /><span>Financial</span></h4>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Revenue:</span>
              <strong style={styles.summaryValue}>{formatCurrency(dashboardSummary.total_revenue)}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Collected:</span>
              <strong style={{...styles.summaryValue, color: '#059669'}}>{formatCurrency(dashboardSummary.total_collected)}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Outstanding:</span>
              <strong style={{...styles.summaryValue, color: '#DC2626'}}>{formatCurrency(dashboardSummary.total_outstanding)}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Invoices:</span>
              <strong style={styles.summaryValue}>{dashboardSummary.total_invoices}</strong>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <h4 style={styles.summaryCardTitle}><i className="fas fa-calendar" style={{marginRight: '6px', color: '#667eea'}} /><span>Appointments</span></h4>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total:</span>
              <strong style={styles.summaryValue}>{dashboardSummary.total_appointments}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Completed:</span>
              <strong style={{...styles.summaryValue, color: '#059669'}}>{dashboardSummary.completed_appointments}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Completion Rate:</span>
              <strong style={styles.summaryValue}>
                {dashboardSummary.total_appointments > 0
                  ? ((dashboardSummary.completed_appointments / dashboardSummary.total_appointments) * 100).toFixed(1)
                  : 0}%
              </strong>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <h4 style={styles.summaryCardTitle}><i className="fas fa-users" style={{marginRight: '6px', color: '#667eea'}} /><span>Patients & Customers</span></h4>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Unique Patients:</span>
              <strong style={styles.summaryValue}>{dashboardSummary.unique_patients}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Unique Customers:</span>
              <strong style={styles.summaryValue}>{dashboardSummary.unique_customers}</strong>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <h4 style={styles.summaryCardTitle}><i className="fas fa-box" style={{marginRight: '6px', color: '#667eea'}} /><span>Inventory</span></h4>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Low Stock Items:</span>
              <strong style={{...styles.summaryValue, color: dashboardSummary.low_stock_items > 0 ? '#DC2626' : '#059669'}}>
                {dashboardSummary.low_stock_items}
              </strong>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Inventory Value:</span>
              <strong style={styles.summaryValue}>{formatCurrency(dashboardSummary.total_inventory_value)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportData = () => {
    if (!reportData || !reportData.data) return null;

    const data = Array.isArray(reportData.data) ? reportData.data : [reportData.data];

    if (data.length === 0) {
      return <div className="no-data">No data available for the selected criteria.</div>;
    }

    // Pagination calculations
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    // Get column headers from first data item
    const columns = Object.keys(data[0]);

    return (
      <div style={styles.reportTableContainer}>
        <div style={styles.reportHeader}>
          <h3 style={styles.reportTitle}>{financialReports.concat(operationalReports).find(r => r.value === reportType)?.label}</h3>
          <button onClick={handleExportReport} style={styles.exportButton}>
            <i className="fas fa-download"></i> Export
          </button>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.reportTable}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} style={styles.reportTh}>{col.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={index}>
                  {columns.map(col => (
                    <td key={col} style={styles.reportTd}>
                      {col.includes('amount') || col.includes('revenue') || col.includes('paid') || col.includes('price') || col.includes('value')
                        ? formatCurrency(row[col])
                        : col.includes('date') && row[col]
                        ? formatDate(row[col])
                        : col.includes('rate') || col.includes('percentage')
                        ? `${row[col]}%`
                        : row[col] !== null && row[col] !== undefined
                        ? row[col]
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={styles.paginationContainer}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            {getPageNumbers().map((pageNum, index) => (
              <span key={index}>
                {pageNum === '...' ? (
                  <span style={styles.paginationEllipsis}>...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(pageNum)}
                    style={currentPage === pageNum ? styles.paginationButtonActive : styles.paginationButton}
                  >
                    {pageNum}
                  </button>
                )}
              </span>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={currentPage === totalPages ? styles.paginationButtonDisabled : styles.paginationButton}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.pageHeaderContent}>
            <i className="fas fa-chart-bar" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Reports & Analytics</h1>
              <p style={styles.subtitle}>View detailed business analytics</p>
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}

        <div style={styles.reportsSection}>
          <div style={styles.reportControls}>
            <div style={styles.tabs}>
              <button
                style={activeTab === 'financial' ? {...styles.tab, ...styles.tabActive} : styles.tab}
                onClick={() => {
                  setActiveTab('financial');
                  setReportType('revenue-summary');
                  setReportData(null);
                  setCurrentPage(1);
                }}
              >
                Financial Reports
              </button>
              <button
                style={activeTab === 'operational' ? {...styles.tab, ...styles.tabActive} : styles.tab}
                onClick={() => {
                  setActiveTab('operational');
                  setReportType('appointment-stats');
                  setReportData(null);
                  setCurrentPage(1);
                }}
              >
                Operational Reports
              </button>
            </div>

            <div style={styles.filters}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setReportData(null);
                    setCurrentPage(1);
                  }}
                  style={styles.formControl}
                >
                  {(activeTab === 'financial' ? financialReports : operationalReports).map(report => (
                    <option key={report.value} value={report.value}>
                      {report.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.formControl}
                  max={endDate}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.formControl}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={loading}
                style={loading ? {...styles.btnPrimary, opacity: 0.6} : styles.btnPrimary}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Generating report...</p>
            </div>
          )}

          {renderReportData()}
        </div>

        {renderDashboardSummary()}
      </div>
    </Layout>
  );
}

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
  pageHeaderContent: {
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
    color: '#1F2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B7280',
    margin: '0.5rem 0 0 0',
  },
  dashboardSummary: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    border: '1px solid #e5e7eb',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  summaryTitle: {
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0,
  },
  dateRangeBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  summaryCard: {
    backgroundColor: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  summaryCardTitle: {
    color: '#374151',
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 1rem 0',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  },
  summaryLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: '1rem',
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    fontSize: '0.875rem',
  },
  reportsSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  reportControls: {
    marginBottom: '1rem',
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s',
    marginBottom: '-2px',
  },
  tabActive: {
    color: '#667eea',
    borderBottomColor: '#667eea',
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr auto',
    gap: '1rem',
    alignItems: 'flex-end',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    color: '#6b7280',
    fontWeight: '500',
    fontSize: '0.75rem',
  },
  formControl: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
  },
  btnPrimary: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    color: '#6b7280',
  },
  spinner: {
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  reportTableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 320px)',
    border: '1px solid #e5e7eb',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  reportTitle: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  tableWrapper: {
    overflow: 'auto',
    flex: 1,
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  reportTh: {
    backgroundColor: '#f3f4f6',
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
  },
  reportTd: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#1f2937',
    borderBottom: '1px solid #f3f4f6',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#1F2937',
    border: '1px solid #1F2937',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationButtonActive: {
    backgroundColor: '#1F2937',
    color: 'white',
    border: '1px solid #1F2937',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
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
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  paginationEllipsis: {
    color: '#9ca3af',
    padding: '0 0.5rem',
    fontSize: '0.875rem',
  },
};

export default Reports;
