import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import Layout from '../components/Layout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

function Reports() {
  useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [activeTab, setActiveTab] = useState('financial');
  useEffect(() => { window.scrollTo(0, 0); document.documentElement.scrollTo(0, 0); document.getElementById('main-content')?.scrollTo(0, 0); }, [activeTab]);
  const [reportType, setReportType] = useState('revenue-summary');
  const [reportData, setReportData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
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
    { value: 'monthly-trend', label: 'Monthly Revenue Trend' },
    { value: 'monthly-income', label: 'Monthly Income Report' },
    { value: 'annual-income', label: 'Annual Income Report' },
    { value: 'customer-growth', label: 'Customer Growth Report' }
  ];

  const operationalReports = [
    { value: 'appointment-stats', label: 'Appointment Statistics' },
    { value: 'appointments-by-type', label: 'Appointments by Type' },
    { value: 'patient-visits', label: 'Patient Visit Statistics' },
    { value: 'inventory-usage', label: 'Inventory Usage' },
    { value: 'veterinarian-performance', label: 'Veterinarian Performance' }
  ];

  // Load dashboard summary on mount
  useEffect(() => {
    loadDashboardSummary();
  }, [startDate, endDate]);

  const loadDashboardSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await reportService.getDashboardSummary(startDate, endDate);
      setDashboardSummary(response.data);
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
    } finally {
      setSummaryLoading(false);
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

  const handleExportReportPDF = async () => {
    try {
      await reportService.exportReportPDF(activeTab, reportType, startDate, endDate);
    } catch (err) {
      setError(err.error || 'Failed to export PDF report');
      console.error('Error exporting PDF report:', err);
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
      <div style={{ ...styles.dashboardSummary, position: 'relative', opacity: summaryLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {summaryLoading && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#6b7280' }}>
            <i className="fas fa-spinner fa-spin"></i> Updating...
          </div>
        )}
        <div style={styles.summaryHeader}>
          <h3 style={styles.summaryTitle}>Quick Summary</h3>
          <div style={styles.dateRangeBadge}>
            <i className="fas fa-calendar-alt" style={{marginRight: '0.5rem', fontSize: '0.875rem'}}></i>
            <span>{formatDate(startDate)} – {formatDate(endDate)}</span>
          </div>
        </div>
        <div style={styles.summaryGrid}>
          {/* Financial Card */}
          <div style={{...styles.summaryCard, borderTop: '4px solid #667eea'}}>
            <h4 style={styles.summaryCardTitle}>
              <i className="fas fa-dollar-sign" style={{marginRight: '8px', color: '#667eea'}} />
              Financial
            </h4>
            <div style={styles.summaryMetricGrid}>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Total Revenue</span>
                <strong style={styles.summaryValue}>{formatCurrency(dashboardSummary.total_revenue)}</strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Collected</span>
                <strong style={{...styles.summaryValue, color: '#059669'}}>{formatCurrency(dashboardSummary.total_collected)}</strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Outstanding</span>
                <strong style={{...styles.summaryValue, color: '#DC2626'}}>{formatCurrency(dashboardSummary.total_outstanding)}</strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Total Invoices</span>
                <strong style={styles.summaryValue}>{dashboardSummary.total_invoices}</strong>
              </div>
            </div>
          </div>

          {/* Appointments Card */}
          <div style={{...styles.summaryCard, borderTop: '4px solid #3b82f6'}}>
            <h4 style={styles.summaryCardTitle}>
              <i className="fas fa-calendar-check" style={{marginRight: '8px', color: '#3b82f6'}} />
              Appointments
            </h4>
            <div style={styles.summaryMetricGrid}>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Total</span>
                <strong style={styles.summaryValue}>{dashboardSummary.total_appointments}</strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Completed</span>
                <strong style={{...styles.summaryValue, color: '#059669'}}>{dashboardSummary.completed_appointments}</strong>
              </div>
              <div style={{...styles.summaryMetric, gridColumn: '1 / -1'}}>
                <span style={styles.summaryLabel}>Completion Rate</span>
                <strong style={styles.summaryValue}>
                  {dashboardSummary.total_appointments > 0
                    ? ((dashboardSummary.completed_appointments / dashboardSummary.total_appointments) * 100).toFixed(1)
                    : 0}%
                </strong>
              </div>
            </div>
          </div>

          {/* Patients & Customers Card */}
          <div style={{...styles.summaryCard, borderTop: '4px solid #8b5cf6'}}>
            <h4 style={styles.summaryCardTitle}>
              <i className="fas fa-users" style={{marginRight: '8px', color: '#8b5cf6'}} />
              Patients & Customers
            </h4>
            <div style={styles.summaryMetricGrid}>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Unique Patients</span>
                <strong style={styles.summaryValue}>{dashboardSummary.unique_patients}</strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Unique Customers</span>
                <strong style={styles.summaryValue}>{dashboardSummary.unique_customers}</strong>
              </div>
            </div>
          </div>

          {/* Inventory Card */}
          <div style={{...styles.summaryCard, borderTop: '4px solid #f59e0b'}}>
            <h4 style={styles.summaryCardTitle}>
              <i className="fas fa-box" style={{marginRight: '8px', color: '#f59e0b'}} />
              Inventory
            </h4>
            <div style={styles.summaryMetricGrid}>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Low Stock Items</span>
                <strong style={{...styles.summaryValue, color: dashboardSummary.low_stock_items > 0 ? '#DC2626' : '#059669'}}>
                  {dashboardSummary.low_stock_items}
                </strong>
              </div>
              <div style={styles.summaryMetric}>
                <span style={styles.summaryLabel}>Total Inventory Value</span>
                <strong style={styles.summaryValue}>{formatCurrency(dashboardSummary.total_inventory_value)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!reportData || !reportData.data) return null;

    const data = Array.isArray(reportData.data) ? reportData.data : [reportData.data];

    if (data.length === 0) return null;

    const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

    // Revenue Summary Chart
    if (reportType === 'revenue-summary') {
      const chartData = data.map(item => ({
        date: formatDate(item.date),
        revenue: parseFloat(item.total_revenue || 0),
        paid: parseFloat(item.total_paid || 0),
        outstanding: parseFloat(item.total_outstanding || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Revenue Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#667eea" fill="#667eea" name="Total Revenue" />
              <Area type="monotone" dataKey="paid" stackId="2" stroke="#43e97b" fill="#43e97b" name="Paid Amount" />
              <Area type="monotone" dataKey="outstanding" stackId="3" stroke="#fa709a" fill="#fa709a" name="Outstanding" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Payments by Method Chart
    if (reportType === 'payments-by-method') {
      const paymentMethodLabels = {
        cash: 'Cash',
        card: 'Debit/Credit Card',
        bank_transfer: 'Bank Transfer',
        mobile_payment: 'Mobile Payment/QR',
        insurance: 'Insurance',
      };
      const chartData = data.map(item => ({
        name: paymentMethodLabels[item.payment_method] || item.payment_method || 'Unknown',
        value: parseFloat(item.total_amount || 0),
        count: parseInt(item.transaction_count || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Payment Methods Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Revenue by Service Chart
    if (reportType === 'revenue-by-service') {
      const chartData = data.map(item => ({
        service: item.service_type || 'Unknown',
        revenue: parseFloat(item.total_revenue || 0),
        count: parseInt(item.service_count || 0),
        average: parseFloat(item.average_amount || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Revenue by Service Type</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#667eea" name="Total Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Monthly Trend Chart
    if (reportType === 'monthly-trend') {
      const chartData = data.map(item => ({
        month: item.month || '',
        revenue: parseFloat(item.total_revenue || 0),
        collected: parseFloat(item.total_collected || 0),
        invoices: parseInt(item.invoice_count || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Revenue Trend — {formatDate(startDate)} to {formatDate(endDate)}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value, name) => name === 'invoices' ? value : formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="collected" stroke="#43e97b" strokeWidth={2} name="Collected" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Annual Income Chart
    if (reportType === 'annual-income') {
      const chartData = data.map(item => ({
        year: String(item.year),
        revenue: parseFloat(item.total_revenue || 0),
        collected: parseFloat(item.total_collected || 0),
        outstanding: parseFloat(item.total_outstanding || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Annual Income Overview</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#667eea" name="Total Revenue" />
              <Bar dataKey="collected" fill="#43e97b" name="Collected" />
              <Bar dataKey="outstanding" fill="#fa709a" name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Monthly Income Chart
    if (reportType === 'monthly-income') {
      const chartData = data.map(item => ({
        month: item.month ? item.month.trim() : '',
        revenue: parseFloat(item.total_revenue || 0),
        collected: parseFloat(item.total_collected || 0),
        due: parseFloat(item.total_due || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Monthly Income Overview</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#667eea" name="Total Revenue" />
              <Bar dataKey="collected" fill="#43e97b" name="Collected" />
              <Bar dataKey="due" fill="#fa709a" name="Due" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Customer Growth Chart
    if (reportType === 'customer-growth') {
      const chartData = data.map(item => ({
        date: formatDate(item.registration_date),
        new: parseInt(item.new_customers || 0),
        total: parseInt(item.cumulative_customers || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Customer Growth</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new" stroke="#667eea" strokeWidth={2} name="New Customers" />
              <Line type="monotone" dataKey="total" stroke="#43e97b" strokeWidth={2} name="Total Customers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Appointment Statistics Chart
    if (reportType === 'appointment-stats') {
      const chartData = data.map(item => ({
        date: formatDate(item.date),
        total: parseInt(item.total_appointments || 0),
        confirmed: parseInt(item.confirmed || 0),
        in_progress: parseInt(item.in_progress || 0),
        completed: parseInt(item.completed || 0),
        cancelled: parseInt(item.cancelled || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Appointment Statistics</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="confirmed" stackId="a" fill="#667eea" name="Confirmed" />
              <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In Progress" />
              <Bar dataKey="completed" stackId="a" fill="#43e97b" name="Completed" />
              <Bar dataKey="cancelled" stackId="a" fill="#fa709a" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Appointments by Type Chart
    if (reportType === 'appointments-by-type') {
      const chartData = data.map(item => ({
        name: item.appointment_type || 'Unknown',
        value: parseInt(item.appointment_count || 0),
        percentage: parseFloat(item.percentage || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Appointments by Type</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => `${entry.name}: ${entry.value} (${entry.percent ? (entry.percent * 100).toFixed(1) : 0}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Patient Visit Statistics Chart — species distribution pie + top patients bar
    if (reportType === 'patient-visits') {
      const speciesMap = {};
      data.forEach(item => {
        const s = item.species || 'Unknown';
        speciesMap[s] = (speciesMap[s] || 0) + parseInt(item.total_visits || 0);
      });
      const speciesData = Object.entries(speciesMap).map(([name, value]) => ({ name, value }));

      const topPatients = data.slice(0, 10).map(item => ({
        name: item.pet_name || 'Unknown',
        completed: parseInt(item.completed_visits || 0),
        cancelled: parseInt(item.cancelled_visits || 0),
        no_shows: parseInt(item.no_shows || 0)
      }));

      return (
        <>
          <div style={styles.chartContainer}>
            <h4 style={styles.chartTitle}>Visits by Species</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={speciesData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}>
                  {speciesData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.chartContainer}>
            <h4 style={styles.chartTitle}>Top 10 Patients by Visit Count</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topPatients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{fontSize: '0.75rem'}} />
                <YAxis allowDecimals={false} style={{fontSize: '0.75rem'}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#43e97b" name="Completed" />
                <Bar dataKey="cancelled" stackId="a" fill="#fa709a" name="Cancelled" />
                <Bar dataKey="no_shows" stackId="a" fill="#fee140" name="No Show" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      );
    }

    // Veterinarian Performance Chart
    if (reportType === 'veterinarian-performance') {
      const chartData = data.slice(0, 10).map(item => ({
        name: item.veterinarian_name ? `Dr. ${item.veterinarian_name}` : 'Unknown',
        appointments: parseInt(item.total_appointments || 0),
        completed: parseInt(item.completed_appointments || 0),
        revenue: parseFloat(item.total_revenue_generated || 0)
      }));

      return (
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Top Veterinarian Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="appointments" fill="#667eea" name="Total Appointments" />
              <Bar dataKey="completed" fill="#43e97b" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Inventory Usage Chart — by category
    if (reportType === 'inventory-usage') {
      const formatCategory = (cat) =>
        (cat || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const usageChartData = data.map(item => ({
        category: formatCategory(item.category),
        value_used: parseFloat(item.total_value_used || 0),
        stock_value: parseFloat(item.total_stock_value || 0),
      }));

      const stockPieData = data.map(item => ({
        name: formatCategory(item.category),
        value: parseInt(item.total_items || 0),
      }));

      return (
        <>
          <div style={styles.chartContainer}>
            <h4 style={styles.chartTitle}>Usage Value vs Current Stock Value by Category</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={usageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" style={{fontSize: '0.75rem'}} />
                <YAxis style={{fontSize: '0.75rem'}} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value_used" fill="#667eea" name="Value Used (period)" />
                <Bar dataKey="stock_value" fill="#43e97b" name="Current Stock Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.chartContainer}>
            <h4 style={styles.chartTitle}>Item Count by Category</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stockPieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value" label={(entry) => `${entry.name}: ${entry.value}`}>
                  {stockPieData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      );
    }

    return null;
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
      <>
        {renderCharts()}
        <div style={styles.reportTableContainer}>
          <div style={styles.reportHeader}>
            <h3 style={styles.reportTitle}>
              {financialReports.concat(operationalReports).find(r => r.value === reportType)?.label}
              <span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.75rem' }}>
                {formatDate(startDate)} – {formatDate(endDate)}
              </span>
            </h3>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <button onClick={handleExportReport} style={styles.exportButton}>
                <i className="fas fa-file-csv"></i> Export CSV
              </button>
              <button onClick={handleExportReportPDF} style={{...styles.exportButton, backgroundColor: '#e74c3c'}}>
                <i className="fas fa-file-pdf"></i> Export PDF
              </button>
            </div>
          </div>
        <div style={styles.tableWrapper}>
          <table style={styles.reportTable}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} style={styles.reportTh}>
                    {col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={index} style={index % 2 === 0 ? styles.reportTrEven : styles.reportTrOdd}>
                  {columns.map(col => (
                    <td key={col} style={styles.reportTd}>
                      {(col.includes('date') || col.includes('visit')) && row[col]
                        ? formatDate(row[col])
                        : !col.includes('invoices') && (col.includes('amount') || col.includes('revenue') || col.includes('paid') || col.includes('price') || col.includes('value') || col.includes('collected') || col.includes('due') || col.includes('spent') || col.includes('outstanding') || col.includes('invoiced'))
                        ? formatCurrency(row[col])
                        : col.includes('rate') || col.includes('percentage')
                        ? `${row[col]}%`
                        : col === 'payment_method' && row[col]
                        ? ({ cash: 'Cash', card: 'Debit/Credit Card', bank_transfer: 'Bank Transfer', mobile_payment: 'Mobile Payment/QR', insurance: 'Insurance' })[row[col]] || row[col]
                        : col === 'service_type' && row[col]
                        ? ({ inventory_item: 'Inventory Item', service: 'Other / Service', consultation: 'Consultation' })[row[col]] || row[col]
                        : (col === 'category' || col.includes('status')) && row[col]
                        ? row[col].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
      </>
    );
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.pageHeaderContent}>
            <i className="fas fa-chart-bar" style={styles.headerIcon}></i>
            <div>
              <h1 style={styles.title}>Reports</h1>
              <p style={styles.subtitle}>Generate and export clinic performance reports</p>
            </div>
          </div>
        </div>

        {error && (
          <div ref={errorRef} style={styles.errorAlert}>
            {error}
          </div>
        )}

        {renderDashboardSummary()}

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
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  summaryTitle: {
    color: '#1f2937',
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: 0,
  },
  dateRangeBadge: {
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '0.4rem 0.9rem',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  summaryCard: {
    background: '#ffffff',
    padding: '1.25rem 1.5rem',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  summaryCardTitle: {
    color: '#374151',
    fontSize: '0.9375rem',
    fontWeight: '700',
    margin: '0 0 1rem 0',
    paddingBottom: '0.6rem',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
  },
  summaryMetricGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem 1rem',
  },
  summaryMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    minWidth: 0,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: '0.72rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  summaryValue: {
    color: '#111827',
    fontWeight: '700',
    fontSize: '0.9375rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    flexShrink: 0,
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
    overflowX: 'scroll',
    overflowY: 'scroll',
    maxHeight: '580px',
    border: '1px solid #e5e7eb',
    borderRadius: '0 0 12px 12px',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'auto',
    minWidth: '650px',
  },
  reportTh: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    padding: '0.9rem 1.25rem',
    textAlign: 'left',
    fontSize: '0.8125rem',
    fontWeight: '700',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
    borderRight: '1px solid #2563eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  reportTrEven: {
    backgroundColor: '#ffffff',
  },
  reportTrOdd: {
    backgroundColor: '#eff6ff',
  },
  reportTd: {
    padding: '0.7rem 1.25rem',
    fontSize: '0.875rem',
    color: '#111827',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #E5E7EB',
  },
  paginationButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.5rem 0.75rem',
    minWidth: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '6px',
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
    padding: '0.5rem',
    fontSize: '0.875rem',
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  chartTitle: {
    color: '#1f2937',
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e5e7eb',
  },
};

export default Reports;
