import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import Layout from '../components/Layout';
import '../styles/ReportsModern.css';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
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
      <div className="rep-summary-card" style={{ opacity: summaryLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <div className="rep-summary-header">
          <h3 className="rep-summary-title">
            <i className="fas fa-bolt" style={{ color: '#f59e0b' }}></i> Quick Summary
          </h3>
          <div className="rep-date-badge">
            <i className="fas fa-calendar-alt"></i>
            <span>{formatDate(startDate)} – {formatDate(endDate)}</span>
          </div>
        </div>
        <div className="rep-summary-grid">
          {/* Financial Card */}
          <div className="rep-summary-subcard" style={{ borderTop: '4px solid #6366f1' }}>
            <h4 className="rep-subcard-title" style={{ color: '#6366f1' }}>
              <i className="fas fa-dollar-sign"></i> Financial Performance
            </h4>
            <div className="rep-metric-grid">
              <div className="rep-metric-item">
                <span className="rep-metric-label">Total Revenue</span>
                <strong className="rep-metric-value">{formatCurrency(dashboardSummary.total_revenue)}</strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Collected</span>
                <strong className="rep-metric-value" style={{ color: '#059669' }}>{formatCurrency(dashboardSummary.total_collected)}</strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Outstanding</span>
                <strong className="rep-metric-value" style={{ color: '#dc2626' }}>{formatCurrency(dashboardSummary.total_outstanding)}</strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Total Invoices</span>
                <strong className="rep-metric-value">{dashboardSummary.total_invoices}</strong>
              </div>
            </div>
          </div>

          {/* Appointments Card */}
          <div className="rep-summary-subcard" style={{ borderTop: '4px solid #3b82f6' }}>
            <h4 className="rep-subcard-title" style={{ color: '#3b82f6' }}>
              <i className="fas fa-calendar-check"></i> Appointments
            </h4>
            <div className="rep-metric-grid">
              <div className="rep-metric-item">
                <span className="rep-metric-label">Total</span>
                <strong className="rep-metric-value">{dashboardSummary.total_appointments}</strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Completed</span>
                <strong className="rep-metric-value" style={{ color: '#059669' }}>{dashboardSummary.completed_appointments}</strong>
              </div>
              <div className="rep-metric-item" style={{ gridColumn: '1 / -1' }}>
                <span className="rep-metric-label">Completion Rate</span>
                <strong className="rep-metric-value" style={{ color: '#2563eb' }}>
                  {dashboardSummary.total_appointments > 0
                    ? ((dashboardSummary.completed_appointments / dashboardSummary.total_appointments) * 100).toFixed(1)
                    : 0}%
                </strong>
              </div>
            </div>
          </div>

          {/* Patients & Customers Card */}
          <div className="rep-summary-subcard" style={{ borderTop: '4px solid #8b5cf6' }}>
            <h4 className="rep-subcard-title" style={{ color: '#8b5cf6' }}>
              <i className="fas fa-users"></i> Patients & Customers
            </h4>
            <div className="rep-metric-grid">
              <div className="rep-metric-item">
                <span className="rep-metric-label">Unique Patients</span>
                <strong className="rep-metric-value">{dashboardSummary.unique_patients}</strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Unique Customers</span>
                <strong className="rep-metric-value">{dashboardSummary.unique_customers}</strong>
              </div>
            </div>
          </div>

          {/* Inventory Card */}
          <div className="rep-summary-subcard" style={{ borderTop: '4px solid #f59e0b' }}>
            <h4 className="rep-subcard-title" style={{ color: '#f59e0b' }}>
              <i className="fas fa-boxes-stacked"></i> Inventory Overview
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Low Stock Items</span>
                <strong className="rep-metric-value" style={{ color: dashboardSummary.low_stock_items > 0 ? '#dc2626' : '#059669' }}>
                  {dashboardSummary.low_stock_items}
                </strong>
              </div>
              <div className="rep-metric-item">
                <span className="rep-metric-label">Inventory Holding Value</span>
                <strong className="rep-metric-value" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatCurrency(dashboardSummary.total_inventory_value)}</strong>
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

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#a855f7'];

    // Revenue Summary Chart
    if (reportType === 'revenue-summary') {
      const chartData = data.map(item => ({
        date: formatDate(item.date),
        revenue: parseFloat(item.total_revenue || 0),
        paid: parseFloat(item.total_paid || 0),
        outstanding: parseFloat(item.total_outstanding || 0)
      }));

      return (
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-area" style={{ color: '#6366f1' }}></i> Revenue Trend Overview
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#6366f1" fill="#6366f1" name="Total Revenue" />
              <Area type="monotone" dataKey="paid" stackId="2" stroke="#10b981" fill="#10b981" name="Paid Amount" />
              <Area type="monotone" dataKey="outstanding" stackId="3" stroke="#ef4444" fill="#ef4444" name="Outstanding" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-pie" style={{ color: '#8b5cf6' }}></i> Payment Methods Distribution
          </h4>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={chartData}
                cx="50%" cy="45%"
                outerRadius={110}
                dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  if (percent < 0.04) return null;
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                      {`${(percent * 100).toFixed(1)}%`}
                    </text>
                  );
                }}
                labelLine={false}
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-bar" style={{ color: '#3b82f6' }}></i> Revenue by Service Type
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Total Revenue" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-line" style={{ color: '#10b981' }}></i> Monthly Revenue Trend
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value, name) => name === 'invoices' ? value : formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="Collected" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-column" style={{ color: '#6366f1' }}></i> Annual Income Overview
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#6366f1" name="Total Revenue" />
              <Bar dataKey="collected" fill="#10b981" name="Collected" />
              <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-chart-column" style={{ color: '#059669' }}></i> Monthly Income Breakdown
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#6366f1" name="Total Revenue" />
              <Bar dataKey="collected" fill="#10b981" name="Collected" />
              <Bar dataKey="due" fill="#ef4444" name="Due" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-user-plus" style={{ color: '#8b5cf6' }}></i> Customer Growth Trend
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new" stroke="#6366f1" strokeWidth={2} name="New Customers" />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total Customers" />
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
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-calendar-days" style={{ color: '#3b82f6' }}></i> Appointment Activity Breakdown
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{fontSize: '0.75rem'}} />
              <YAxis style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="confirmed" stackId="a" fill="#6366f1" name="Confirmed" />
              <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In Progress" />
              <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
              <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Appointments by Type Chart
    if (reportType === 'appointments-by-type') {
      const appointmentTypeLabels = {
        checkup: 'Check-up',
        vaccination: 'Vaccination',
        surgery: 'Surgery',
        emergency: 'Emergency',
        follow_up: 'Follow-up',
        consultation: 'Consultation'
      };
      const chartData = data.map(item => ({
        name: appointmentTypeLabels[item.appointment_type] || item.appointment_type || 'Unknown',
        value: parseInt(item.appointment_count || 0),
        percentage: parseFloat(item.percentage || 0)
      }));

      return (
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-pie-chart" style={{ color: '#ec4899' }}></i> Appointments Distribution by Type
          </h4>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={chartData}
                cx="50%" cy="45%"
                outerRadius={110}
                dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
                  if (percent < 0.04) return null;
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                      {value}
                    </text>
                  );
                }}
                labelLine={false}
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Patient Visit Statistics Chart
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
        cancelled: parseInt(item.cancelled_visits || 0)
      }));

      return (
        <>
          <div className="rep-chart-card">
            <h4 className="rep-chart-title">
              <i className="fas fa-paw" style={{ color: '#06b6d4' }}></i> Patient Visits by Species
            </h4>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={speciesData}
                  cx="50%" cy="45%"
                  outerRadius={110}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
                    if (percent < 0.04) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                        {value}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {speciesData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rep-chart-card">
            <h4 className="rep-chart-title">
              <i className="fas fa-ranking-star" style={{ color: '#f59e0b' }}></i> Top 10 Patients by Visit Count
            </h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topPatients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{fontSize: '0.75rem'}} />
                <YAxis allowDecimals={false} style={{fontSize: '0.75rem'}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
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
        total: parseInt(item.total_appointments || 0),
        in_progress: parseInt(item.in_progress_appointments || 0),
        completed: parseInt(item.completed_appointments || 0),
        cancelled: parseInt(item.cancelled_appointments || 0)
      }));

      return (
        <div className="rep-chart-card">
          <h4 className="rep-chart-title">
            <i className="fas fa-user-doctor" style={{ color: '#059669' }}></i> Top Veterinarian Performance
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{fontSize: '0.75rem'}} />
              <YAxis allowDecimals={false} style={{fontSize: '0.75rem'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#6366f1" name="Total Appointments" />
              <Bar dataKey="in_progress" fill="#f59e0b" name="In Progress" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Inventory Usage Chart
    if (reportType === 'inventory-usage') {
      const shortCategoryLabels = {
        pharmaceuticals:       'Pharma',
        consumables:           'Consumables',
        surgical_clinical:     'Surgical',
        laboratory_diagnostic: 'Lab/Diagnostic',
        pet_food_nutrition:    'Pet Food',
        retail_otc:            'Retail/OTC',
        equipment:             'Equipment',
        accessories:           'Accessories',
        supplements:           'Supplements',
        cleaning_maintenance:  'Cleaning',
      };

      const usageChartData = data.map(item => ({
        category: shortCategoryLabels[item.category] || item.category || 'Unknown',
        value_used: parseFloat(item.total_value_used || 0),
        stock_value: parseFloat(item.total_stock_value || 0),
        item_count: parseInt(item.total_items || 0),
      }));

      const stockPieData = data.map(item => ({
        name: shortCategoryLabels[item.category] || item.category || 'Unknown',
        value: parseInt(item.total_items || 0),
      }));

      return (
        <>
          <div className="rep-chart-card">
            <h4 className="rep-chart-title">
              <i className="fas fa-boxes-packing" style={{ color: '#f59e0b' }}></i> Usage Value vs Current Stock Value
            </h4>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={usageChartData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" style={{fontSize: '0.75rem'}} interval={0} />
                <YAxis yAxisId="value" style={{fontSize: '0.75rem'}} tickFormatter={(v) => `Rs.${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="count" orientation="right" style={{fontSize: '0.75rem'}} allowDecimals={false} label={{ value: 'Total Items', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: '0.7rem' } }} />
                <Tooltip formatter={(value, name) => name === 'Total Items in Category' ? value : formatCurrency(value)} />
                <Legend />
                <Bar yAxisId="value" dataKey="value_used" fill="#6366f1" name="Consumed Value" />
                <Bar yAxisId="value" dataKey="stock_value" fill="#10b981" name="Stock Value" />
                <Line yAxisId="count" type="monotone" dataKey="item_count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Total Items in Category" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="rep-chart-card">
            <h4 className="rep-chart-title">
              <i className="fas fa-chart-pie" style={{ color: '#a855f7' }}></i> Item Count by Category
            </h4>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={stockPieData}
                  cx="50%" cy="45%"
                  outerRadius={110}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
                    if (percent < 0.04) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                        {value}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {stockPieData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
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
      return (
        <div className="rep-chart-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
          <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
          No report data available for the selected date range and criteria.
        </div>
      );
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
        <div className="rep-table-card">
          <div className="rep-table-header">
            <h3 className="rep-table-title">
              <i className="fas fa-table-list" style={{ color: '#2563eb' }}></i>
              {financialReports.concat(operationalReports).find(r => r.value === reportType)?.label}
              <span style={{ fontSize: '0.825rem', fontWeight: '500', color: '#64748b', marginLeft: '0.5rem' }}>
                ({formatDate(startDate)} – {formatDate(endDate)})
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={handleExportReport} className="rep-btn-export-csv">
                <i className="fas fa-file-csv"></i> Export CSV
              </button>
              <button onClick={handleExportReportPDF} className="rep-btn-export-pdf">
                <i className="fas fa-file-pdf"></i> Export PDF
              </button>
            </div>
          </div>
          <div className="rep-table-wrapper">
            <table className="rep-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col}>
                      {col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => (
                  <tr key={index}>
                    {columns.map(col => (
                      <td key={col}>
                        {(col.includes('date') || (col.includes('visit') && !col.includes('_visits'))) && row[col]
                          ? formatDate(row[col])
                          : !col.includes('invoices') && (col.includes('amount') || col.includes('revenue') || col.includes('paid') || col.includes('price') || col.includes('value') || col.includes('collected') || col.includes('due') || col.includes('spent') || col.includes('outstanding') || col.includes('invoiced'))
                          ? formatCurrency(row[col])
                          : col.includes('rate') || col.includes('percentage')
                          ? `${row[col]}%`
                          : col === 'payment_method' && row[col]
                          ? ({ cash: 'Cash', card: 'Debit/Credit Card', bank_transfer: 'Bank Transfer', mobile_payment: 'Mobile Payment/QR', insurance: 'Insurance' })[row[col]] || row[col]
                          : col === 'appointment_type' && row[col]
                          ? ({ checkup: 'Check-up', vaccination: 'Vaccination', surgery: 'Surgery', emergency: 'Emergency', follow_up: 'Follow-up', consultation: 'Consultation' })[row[col]] || row[col]
                          : col === 'service_type' && row[col]
                          ? ({ inventory_item: 'Inventory Item', service: 'Other / Service', consultation: 'Consultation' })[row[col]] || row[col]
                          : col === 'category' && row[col]
                          ? ({ pharmaceuticals: 'Pharmaceuticals', consumables: 'Consumables', surgical_clinical: 'Surgical & Clinical Supplies', laboratory_diagnostic: 'Laboratory / Diagnostic Supplies', pet_food_nutrition: 'Pet Food & Nutrition', retail_otc: 'Retail / OTC Products', equipment: 'Equipment', accessories: 'Accessories', supplements: 'Supplements', cleaning_maintenance: 'Cleaning & Maintenance Supplies' })[row[col]] || row[col]
                          : col.includes('status') && row[col]
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

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="rep-pagination-bar">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rep-page-pill"
              >
                ←
              </button>

              {getPageNumbers().map((pageNum, index) => (
                <span key={index}>
                  {pageNum === '...' ? (
                    <span style={{ color: '#94a3b8', padding: '0 0.4rem' }}>...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(pageNum)}
                      className={`rep-page-pill ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )}
                </span>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rep-page-pill"
              >
                →
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Layout>
      <div className="rep-container">
        {/* Page Header Hero */}
        <div className="rep-header-card">
          <div className="rep-header-left">
            <div className="rep-header-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h1 className="rep-title">Reports & Clinic Analytics</h1>
              <p className="rep-subtitle">Generate and export financial and operational performance reports</p>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div ref={errorRef} className="inv-alert-card low-stock" style={{ marginBottom: '1.5rem' }}>
            <div>
              <i className="fas fa-circle-exclamation" style={{ marginRight: '0.5rem' }}></i>
              {error}
            </div>
          </div>
        )}

        {/* Dashboard Quick Summary */}
        {renderDashboardSummary()}

        {/* Reports Controls Section */}
        <div className="rep-section-card">
          <div className="rep-tabs-bar">
            <button
              className={`rep-tab-pill ${activeTab === 'financial' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('financial');
                setReportType('revenue-summary');
                setReportData(null);
                setCurrentPage(1);
              }}
            >
              <i className="fas fa-sack-dollar"></i> Financial Reports
            </button>
            <button
              className={`rep-tab-pill ${activeTab === 'operational' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('operational');
                setReportType('list-check');
                setReportType('appointment-stats');
                setReportData(null);
                setCurrentPage(1);
              }}
            >
              <i className="fas fa-chart-pie"></i> Operational Reports
            </button>
          </div>

          <div className="rep-filters-row">
            <div className="rep-form-group">
              <label className="rep-form-label">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setReportData(null);
                  setCurrentPage(1);
                }}
                className="rep-select-input"
              >
                {(activeTab === 'financial' ? financialReports : operationalReports).map(report => (
                  <option key={report.value} value={report.value}>
                    {report.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rep-form-group">
              <label className="rep-form-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rep-date-input"
                max={endDate}
              />
            </div>

            <div className="rep-form-group">
              <label className="rep-form-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rep-date-input"
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="rep-btn-generate"
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Loading Spinner for Report Generation */}
        {loading && (
          <div className="rep-chart-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div className="appts-spinner" style={{ margin: '0 auto 1rem auto', borderTopColor: '#6366f1' }}></div>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Generating performance report data...</p>
          </div>
        )}

        {/* Report Visualization & Table */}
        {renderReportData()}
      </div>
    </Layout>
  );
}

export default Reports;
