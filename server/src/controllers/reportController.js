import ReportModel from '../models/reportModel.js';

/**
 * Get financial reports
 */
export const getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    let reportData;

    switch (reportType) {
      case 'revenue-summary':
        reportData = await ReportModel.getRevenueSummary(startDate, endDate);
        break;
      case 'payments-by-method':
        reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
        break;
      case 'outstanding-balances':
        reportData = await ReportModel.getOutstandingBalances(startDate, endDate);
        break;
      case 'revenue-by-service':
        reportData = await ReportModel.getRevenueByService(startDate, endDate);
        break;
      case 'top-customers': {
        const limit = parseInt(req.query.limit) || 10;
        reportData = await ReportModel.getTopCustomers(startDate, endDate, limit);
        break;
      }
      case 'monthly-trend':
        reportData = await ReportModel.getMonthlyRevenueTrend(startDate, endDate);
        break;
      case 'monthly-income': {
        const monthlyData = await ReportModel.getMonthlyIncomeReport(startDate, endDate);
        reportData = monthlyData.dailyBreakdown;
        break;
      }
      case 'annual-income':
        reportData = await ReportModel.getAnnualIncomeReport(startDate, endDate);
        break;
      case 'customer-growth':
        reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid report type'
        });
    }

    res.json({
      reportType,
      startDate,
      endDate,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial report' 
    });
  }
};

/**
 * Get operational reports
 */
export const getOperationalReports = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    let reportData;

    switch (reportType) {
      case 'appointment-stats':
        reportData = await ReportModel.getAppointmentStats(startDate, endDate);
        break;
      case 'appointments-by-type':
        reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
        break;
      case 'patient-visits':
        reportData = await ReportModel.getPatientVisitStats(startDate, endDate);
        break;
      case 'inventory-usage':
        reportData = await ReportModel.getInventoryUsage(startDate, endDate);
        break;
      case 'veterinarian-performance':
        reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid report type' 
        });
    }

    res.json({
      reportType,
      startDate,
      endDate,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating operational report:', error);
    res.status(500).json({ 
      error: 'Failed to generate operational report' 
    });
  }
};

/**
 * Get dashboard summary
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    const summary = await ReportModel.getDashboardSummary(startDate, endDate);

    res.json({
      startDate,
      endDate,
      data: summary
    });
  } catch (error) {
    console.error('Error generating dashboard summary:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate dashboard summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export report to CSV format
 */
export const exportReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType, category } = req.query;

    // Validate dates
    if (!startDate || !endDate || !reportType || !category) {
      return res.status(400).json({ 
        error: 'Required parameters missing' 
      });
    }

    let reportData;

    const startDateObj = new Date(startDate);

    // Get the appropriate report data
    if (category === 'financial') {
      switch (reportType) {
        case 'revenue-summary':
          reportData = await ReportModel.getRevenueSummary(startDate, endDate);
          break;
        case 'payments-by-method':
          reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
          break;
        case 'outstanding-balances':
          reportData = await ReportModel.getOutstandingBalances(startDate, endDate);
          break;
        case 'revenue-by-service':
          reportData = await ReportModel.getRevenueByService(startDate, endDate);
          break;
        case 'top-customers':
          reportData = await ReportModel.getTopCustomers(startDate, endDate, 50);
          break;
        case 'monthly-income': {
          const monthlyData = await ReportModel.getMonthlyIncomeReport(startDate, endDate);
          reportData = monthlyData.dailyBreakdown;
          break;
        }
        case 'annual-income':
          reportData = await ReportModel.getAnnualIncomeReport(startDate, endDate);
          break;
        case 'monthly-trend':
          reportData = await ReportModel.getMonthlyRevenueTrend(startDate, endDate);
          break;
        case 'customer-growth':
          reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else if (category === 'operational') {
      switch (reportType) {
        case 'appointment-stats':
          reportData = await ReportModel.getAppointmentStats(startDate, endDate);
          break;
        case 'appointments-by-type':
          reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
          break;
        case 'patient-visits':
          reportData = await ReportModel.getPatientVisitStats(startDate, endDate);
          break;
        case 'inventory-usage':
          reportData = await ReportModel.getInventoryUsage(startDate, endDate);
          break;
        case 'veterinarian-performance':
          reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Convert to CSV
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    const csv = convertToCSV(reportData);
    const filename = `${reportType}_${startDate}_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ 
      error: 'Failed to export report' 
    });
  }
};

/**
 * Convert a snake_case key to Title Case label
 */
function toTitleCase(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map(h => toTitleCase(h)).join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export report to PDF format
 */
export const exportReportPDF = async (req, res) => {
  try {
    const { startDate, endDate, reportType, category } = req.query;

    // Validate dates
    if (!startDate || !endDate || !reportType || !category) {
      return res.status(400).json({ 
        error: 'Required parameters missing' 
      });
    }

    let reportData;
    let reportTitle = '';

    // Get the appropriate report data
    if (category === 'financial') {
      switch (reportType) {
        case 'revenue-summary':
          reportData = await ReportModel.getRevenueSummary(startDate, endDate);
          reportTitle = 'Revenue Summary Report';
          break;
        case 'payments-by-method':
          reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
          reportTitle = 'Payments by Method Report';
          break;
        case 'outstanding-balances':
          reportData = await ReportModel.getOutstandingBalances(startDate, endDate);
          reportTitle = 'Outstanding Balances Report';
          break;
        case 'revenue-by-service':
          reportData = await ReportModel.getRevenueByService(startDate, endDate);
          reportTitle = 'Revenue by Service Report';
          break;
        case 'top-customers':
          reportData = await ReportModel.getTopCustomers(startDate, endDate, 50);
          reportTitle = 'Top Customers Report';
          break;
        case 'monthly-income': {
          const monthlyData = await ReportModel.getMonthlyIncomeReport(startDate, endDate);
          reportData = monthlyData.dailyBreakdown.length > 0
            ? monthlyData.dailyBreakdown
            : [monthlyData.summary];
          reportTitle = `Daily Income Report (${startDate} to ${endDate})`;
          break;
        }
        case 'annual-income':
          reportData = await ReportModel.getAnnualIncomeReport(startDate, endDate);
          reportTitle = `Annual Income Report (${startDate} to ${endDate})`;
          break;
        case 'monthly-trend':
          reportData = await ReportModel.getMonthlyRevenueTrend(startDate, endDate);
          reportTitle = 'Monthly Revenue Trend Report';
          break;
        case 'customer-growth':
          reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
          reportTitle = 'Customer Growth Report';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else if (category === 'operational') {
      switch (reportType) {
        case 'appointment-stats':
          reportData = await ReportModel.getAppointmentStats(startDate, endDate);
          reportTitle = 'Appointment Statistics Report';
          break;
        case 'appointments-by-type':
          reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
          reportTitle = 'Appointments by Type Report';
          break;
        case 'patient-visits':
          reportData = await ReportModel.getPatientVisitStats(startDate, endDate);
          reportTitle = 'Patient Visit Statistics Report';
          break;
        case 'inventory-usage':
          reportData = await ReportModel.getInventoryUsage(startDate, endDate);
          reportTitle = 'Inventory Usage Report';
          break;
        case 'veterinarian-performance':
          reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
          reportTitle = 'Veterinarian Performance Report';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check if data exists
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    // Generate simple HTML for PDF conversion
    const generatedBy = req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Admin';
    const html = generateHTMLReport(reportTitle, reportData, startDate, endDate, generatedBy);
    const filename = `${reportType}_${startDate}_${endDate}.pdf`;

    // For now, send HTML that can be converted to PDF on client side
    // In production, you'd use a library like puppeteer or pdfkit
    res.json({
      success: true,
      html: html,
      filename: filename,
      message: 'Please use browser print to PDF functionality'
    });
  } catch (error) {
    console.error('Error exporting PDF report:', error);
    res.status(500).json({ 
      error: 'Failed to export PDF report' 
    });
  }
};

/**
/**
 * Helper function to generate HTML report
 */
function generateHTMLReport(title, data, startDate, endDate, generatedBy = 'Admin') {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const rows = data.map((row, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#eff6ff';
    const cells = headers.map(h => {
      const val = row[h] !== null && row[h] !== undefined ? row[h] : '—';
      return `<td style="background:${bg}">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 1.2cm 1cm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #111827; font-size: 11px; }
    .report-header { border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { color: #1e40af; margin: 0 0 3px 0; font-size: 17px; font-weight: 700; }
    .date-range { color: #6b7280; font-size: 11px; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    thead tr { background-color: #1e40af; }
    th {
      color: #ffffff;
      padding: 9px 11px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.05em;
      white-space: nowrap;
      border-right: 1px solid #2563eb;
    }
    th:last-child { border-right: none; }
    td {
      padding: 7px 11px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
      white-space: nowrap;
      vertical-align: middle;
    }
    td:last-child { border-right: none; }
    .footer {
      margin-top: 18px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      text-align: center;
      color: #9ca3af;
      font-size: 9.5px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${title}</h1>
    <p class="date-range">Report Period: ${startDate} &nbsp;to&nbsp; ${endDate}</p>
  </div>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${toTitleCase(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} by ${generatedBy} &nbsp;|&nbsp; VetCare Pro &ndash; Pro Pet Animal Hospital</p>
  </div>
</body>
</html>`;
}
