import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import Layout from '../components/Layout';
import '../styles/responsive.css';

function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('financial');
  const [reportType, setReportType] = useState('revenue-summary');
  const [reportData, setReportData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);

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
      <div className="dashboard-summary">
        <h3>Quick Summary ({formatDate(startDate)} - {formatDate(endDate)})</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Financial</h4>
            <div className="summary-item">
              <span>Total Revenue:</span>
              <strong>{formatCurrency(dashboardSummary.total_revenue)}</strong>
            </div>
            <div className="summary-item">
              <span>Collected:</span>
              <strong>{formatCurrency(dashboardSummary.total_collected)}</strong>
            </div>
            <div className="summary-item">
              <span>Outstanding:</span>
              <strong>{formatCurrency(dashboardSummary.total_outstanding)}</strong>
            </div>
            <div className="summary-item">
              <span>Invoices:</span>
              <strong>{dashboardSummary.total_invoices}</strong>
            </div>
          </div>

          <div className="summary-card">
            <h4>Appointments</h4>
            <div className="summary-item">
              <span>Total:</span>
              <strong>{dashboardSummary.total_appointments}</strong>
            </div>
            <div className="summary-item">
              <span>Completed:</span>
              <strong>{dashboardSummary.completed_appointments}</strong>
            </div>
            <div className="summary-item">
              <span>Completion Rate:</span>
              <strong>
                {dashboardSummary.total_appointments > 0
                  ? ((dashboardSummary.completed_appointments / dashboardSummary.total_appointments) * 100).toFixed(1)
                  : 0}%
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <h4>Patients & Customers</h4>
            <div className="summary-item">
              <span>Unique Patients:</span>
              <strong>{dashboardSummary.unique_patients}</strong>
            </div>
            <div className="summary-item">
              <span>Unique Customers:</span>
              <strong>{dashboardSummary.unique_customers}</strong>
            </div>
          </div>

          <div className="summary-card">
            <h4>Inventory</h4>
            <div className="summary-item">
              <span>Low Stock Items:</span>
              <strong className={dashboardSummary.low_stock_items > 0 ? 'warning' : ''}>
                {dashboardSummary.low_stock_items}
              </strong>
            </div>
            <div className="summary-item">
              <span>Total Inventory Value:</span>
              <strong>{formatCurrency(dashboardSummary.total_inventory_value)}</strong>
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

    // Get column headers from first data item
    const columns = Object.keys(data[0]);

    return (
      <div className="report-table-container">
        <div className="report-header">
          <h3>{financialReports.concat(operationalReports).find(r => r.value === reportType)?.label}</h3>
          <button onClick={handleExportReport} className="btn btn-secondary">
            Export to CSV
          </button>
        </div>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col}>{col.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {columns.map(col => (
                    <td key={col}>
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
      </div>
    );
  };

  return (
    <Layout>
      <div className="reports-container">
        <div className="page-header">
          <h1>Reports & Analytics</h1>
        </div>

        {renderDashboardSummary()}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="reports-section">
        <div className="report-controls">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('financial');
                setReportType('revenue-summary');
                setReportData(null);
              }}
            >
              Financial Reports
            </button>
            <button
              className={`tab ${activeTab === 'operational' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('operational');
                setReportType('appointment-stats');
                setReportData(null);
              }}
            >
              Operational Reports
            </button>
          </div>

          <div className="filters">
            <div className="form-group">
              <label>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setReportData(null);
                }}
                className="form-control"
              >
                {(activeTab === 'financial' ? financialReports : operationalReports).map(report => (
                  <option key={report.value} value={report.value}>
                    {report.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-control"
                max={endDate}
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generating report...</p>
          </div>
        )}

        {renderReportData()}
      </div>

      <style>{`
        .reports-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #2c3e50;
          font-size: 2rem;
          margin: 0;
        }

        .dashboard-summary {
          background: #fff;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .dashboard-summary h3 {
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .summary-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .summary-card h4 {
          color: #2c3e50;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-item span {
          color: #666;
        }

        .summary-item strong {
          color: #2c3e50;
          font-weight: 600;
        }

        .summary-item strong.warning {
          color: #e74c3c;
        }

        .reports-section {
          background: #fff;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          color: #666;
          font-size: 1rem;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
          margin-bottom: -2px;
        }

        .tab:hover {
          color: #3498db;
        }

        .tab.active {
          color: #3498db;
          border-bottom-color: #3498db;
          font-weight: 600;
        }

        .filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 15px;
          align-items: end;
          margin-bottom: 25px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 5px;
          color: #555;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-control {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95rem;
        }

        .form-control:focus {
          outline: none;
          border-color: #3498db;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.3s;
        }

        .btn-primary {
          background-color: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
        }

        .btn-primary:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #2ecc71;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #27ae60;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .report-header h3 {
          color: #2c3e50;
          margin: 0;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .report-table th,
        .report-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .report-table th {
          background-color: #f8f9fa;
          color: #2c3e50;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .report-table tr:hover {
          background-color: #f8f9fa;
        }

        .alert {
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background-color: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .filters {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .tabs {
            flex-direction: column;
          }

          .tab {
            text-align: left;
          }

          .report-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
        }
      `}</style>
      </div>
    </Layout>
  );
}

export default Reports;
